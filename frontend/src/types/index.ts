/**
 * @file        index.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.types
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-03
 * @updated     2026-11-12
 *
 * @description Master TypeScript declarations and interfaces for models, API responses, filters, and state.
 */

// ─── Core Entities ───────────────────────────────────────────────────────────

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: string
  institution_id?: number
  is_active?: boolean
  permissions?: string[]
}

export interface PaymentPermissions {
  user_id: number
  username: string
  role: string
  can_view_all: boolean
  can_create_draft: boolean
  can_edit_draft: boolean
  can_edit_submitted: boolean
  can_edit_posted: boolean
  can_configure_workflow: boolean
  can_process_refund: boolean
  can_approve_refund: boolean
  can_view_audit: boolean
  permissions: string[]
}

export interface Institution {
  id: number
  name: string
  code: string
  short_name?: string
  tagline?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  phone?: string
  email?: string
  website?: string
  logo_url?: string
  favicon_url?: string
  primary_color?: string
  secondary_color?: string
  accent_color?: string
}

export interface AcademicYear {
  id: number
  name: string
  start_date: string
  end_date: string
  is_current: boolean
  institution_id: number
}

export interface Board {
  id: number
  institution_id: number
  name: string
  code: string
  description?: string
  is_active: boolean
  classes_count?: number
  batches_count?: number
  students_count?: number
}

export interface Standard {
  id: number
  name: string
  level: number
  institution_id: number
  description?: string
  is_active?: boolean
  batches_count?: number
  subjects_count?: number
  students_count?: number
}

export interface Division {
  id: number
  name: string
  code?: string
  standard_id: number
  standard_name?: string
  standard_level?: number
  board_id?: number
  board_name?: string
  board_code?: string
  capacity: number
  room_number?: string
  schedule_timing?: string
  status?: string
  is_active?: boolean
  class_teacher_id?: number
  class_teacher_name?: string
  enrolled_count?: number
  available_seats?: number
  occupancy_percentage?: number
  subjects?: string[]
}

export interface AcademicOverviewMetrics {
  total_students: number
  total_classes: number
  active_batches: number
  enrolled_seats: number
  total_seats: number
  occupancy_percentage: number
  weekly_sessions: number
}

export interface AcademicTreeStandard {
  standard_id: number
  standard_name: string
  standard_level: number
  batch_count: number
  student_count: number
}

export interface AcademicTreeBoard {
  board_id: number
  board_name: string
  board_code: string
  classes: AcademicTreeStandard[]
}

export interface AcademicOverviewResponse {
  metrics: AcademicOverviewMetrics
  structure_tree: AcademicTreeBoard[]
}

export interface BatchRosterStudent {
  id: number
  enrollment_id: number
  roll_number: string
  admission_number: string
  academic_year?: string
  first_name: string
  last_name: string
  full_name: string
  gender: string
  phone?: string
  email?: string
  status: string
  enrollment_date?: string
  total_fee: number
  total_paid: number
  outstanding_balance: number
  fee_status: string
}

export interface BatchRosterResponse {
  batch_id: number
  batch_name: string
  batch_code?: string
  standard_name: string
  board_name?: string
  capacity: number
  enrolled_count: number
  available_seats: number
  students: BatchRosterStudent[]
}

export interface Guardian {
  id?: number
  relation: string
  first_name: string
  last_name: string
  phone?: string
  email?: string
  occupation?: string
  aadhar_number?: string
  annual_income?: number
  is_primary: boolean
}

export interface Enrollment {
  id: number
  academic_year_id: number
  standard_id: number
  division_id?: number
  roll_number?: string
  status: string
  enrollment_date: string
  exit_date?: string
  exit_reason?: string
  exit_notes?: string
  exited_by_id?: number
  exited_at?: string
  standard_name?: string
  division_name?: string
  academic_year_name?: string
}

export interface Student {
  id: number
  admission_number: string
  academic_year?: string
  first_name: string
  last_name: string
  full_name?: string
  middle_name?: string
  date_of_birth: string
  gender: string
  blood_group?: string
  nationality?: string
  religion?: string
  caste?: string
  aadhar_number?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  admission_date: string
  is_active: boolean
  exit_date?: string
  exit_reason?: string
  exit_notes?: string
  guardians?: Guardian[]
  enrollments?: Enrollment[]
  fee_summary?: FeeSummary
  total_fees?: number
  total_paid?: number
  total_outstanding?: number
}

export interface FeeSummary {
  total_fees: number
  total_paid: number
  outstanding: number
}

// ─── Fee Entities ─────────────────────────────────────────────────────────────

export interface FeeCategory {
  id: number
  name: string
  description?: string
}

export interface FeeStructure {
  id: number
  name: string
  amount: number
  frequency: string
  category_id: number
  category?: FeeCategory
  standard_id?: number
  installments_count: number
  late_fee_amount: number
  is_active?: boolean
}

export interface FeeInvoice {
  id: number
  invoice_number: string
  student_id: number
  academic_year_id?: number
  total_amount: number
  discount_amount: number
  net_amount: number
  paid_amount: number
  outstanding_amount: number
  status: 'unpaid' | 'partial' | 'paid' | 'cancelled' | 'overdue'
  issue_date: string
  due_date?: string
  notes?: string
  items?: FeeInvoiceItem[]
  installments?: FeeInstallment[]
}

export interface FeeInvoiceItem {
  id: number
  description: string
  amount: number
  discount_amount: number
  net_amount: number
}

export interface FeeInstallment {
  id: number
  invoice_id: number
  installment_number: number
  description?: string
  amount: number
  paid_amount: number
  outstanding_amount?: number
  due_date: string
  status: 'unpaid' | 'partial' | 'paid' | 'overdue'
  late_fee_applied?: number
}

// ─── Payment Entities ─────────────────────────────────────────────────────────

export interface PaymentAllocation {
  id: number
  invoice_id: number
  installment_id?: number
  allocated_amount: number
}

export interface Payment {
  id: number
  student_id: number
  amount: number
  payment_date: string
  payment_method: string
  transaction_reference?: string
  bank_name?: string
  cheque_number?: string
  cheque_date?: string
  status: 'draft' | 'submitted' | 'approved' | 'posted' | 'reversed' | 'completed' | string
  notes?: string
  receipt_number?: string
  allocations?: PaymentAllocation[]
  submitted_at?: string
  submitted_by_id?: number
  approved_at?: string
  approved_by_id?: number
  posted_at?: string
  posted_by_id?: number
  last_edited_at?: string
  last_edited_by_id?: number
  edit_count?: number
  receipts?: Receipt[]
}

export interface Receipt {
  receipt_number: string
  payment_id: number
  student_id: number
  student_name?: string
  admission_number?: string
  standard?: string
  division?: string
  batch?: string
  board?: string
  amount: number
  payment_date: string
  payment_method: string
  transaction_reference?: string
  generated_at: string
  version?: number
  status?: 'valid' | 'superseded' | 'cancelled' | string
  superseded_at?: string
  superseded_by_receipt_number?: string
  reprint_count?: number
  is_duplicate?: boolean
  allocations?: { invoice_id: number; amount: number }[]
}

export interface RefundRecord {
  id: number
  institution_id: number
  student_id: number
  enrollment_id?: number
  payment_id?: number
  amount: number
  reason: string
  status: 'requested' | 'approved' | 'rejected' | 'processed' | 'completed' | string
  refund_method?: string
  requested_by_id?: number
  approved_by_id?: number
  approved_at?: string
  rejection_reason?: string
  reference_note?: string
  created_at: string
  processed_at?: string
  student_name?: string
  admission_number?: string
  receipt_number?: string
}

export interface PaymentWorkflowConfig {
  mode: 'simple' | 'erp'
  approval_threshold: number
  approver_roles: string[]
  require_cheque_approval: boolean
}

export interface PaymentAuditLog {
  id: number
  action: string
  user_name?: string
  timestamp: string
  details?: Record<string, any>
}

export interface BoardBreakdown {
  board_name: string
  total_fees: number
  collected: number
  outstanding: number
  student_count: number
  rate: number
}

export interface BatchBreakdown {
  batch_name: string
  standard_name: string
  board_name: string
  total_fees: number
  collected: number
  outstanding: number
  student_count: number
  rate: number
}

export interface MonthlyTrend {
  month: string
  month_key?: string
  collected: number
  invoiced?: number
  transaction_count?: number
  is_current_month?: boolean
  cumulative?: number
}

export interface RecentPayment {
  id: number
  receipt_number: string
  student_id: number
  student_name: string
  admission_number: string
  academic_year?: string
  board?: string
  standard?: string
  batch: string
  fee_category?: string
  amount: number
  payment_date: string
  payment_method: string
  status: string
  transaction_reference?: string
  created_at?: string
}

export interface PaymentMethodDistribution {
  method: string
  amount: number
  count: number
  percentage: number
}

export interface TopOverdueAccount {
  invoice_id: number
  invoice_number: string
  student_id: number
  student_name: string
  admission_number: string
  academic_year?: string
  phone: string
  board_name: string
  standard_name: string
  batch_name: string
  due_amount: number
  due_date?: string | null
  status: string
}

export interface FeeOverviewData {
  summary: {
    gross_obligation?: number
    total_obligation: number
    total_collected: number
    total_outstanding: number
    collection_rate: number
    student_count: number
    active_students_outstanding?: number
    former_students_outstanding?: number
    inactive_students_outstanding?: number
    total_recoverable_outstanding?: number
    overdue_outstanding?: number
    waived_amount?: number
    approved_concessions?: number
    posted_concessions?: number
    written_off_amount?: number
  }
  board_breakdown: BoardBreakdown[]
  batch_breakdown: BatchBreakdown[]
  monthly_trends: MonthlyTrend[]
  recent_payments: RecentPayment[]
  payment_methods?: PaymentMethodDistribution[]
  top_overdue?: TopOverdueAccount[]
  governance?: FinancialGovernanceSummary
  concession_breakdown?: FeeManagementConcessionBreakdown
  academic_concessions?: AcademicConcessionDistribution
}

export interface FeeRegisterInstallment {
  id: number
  installment_number: number
  description?: string
  amount: number
  paid_amount: number
  due_date: string
  status: string
}

export interface FeeRegisterEntry {
  student_id: number
  admission_number: string
  academic_year?: string
  student_name: string
  student_is_active?: boolean
  student_status?: string
  exit_date?: string | null
  exit_reason?: string | null
  is_former?: boolean
  phone: string
  board_id?: number | null
  board_name: string
  standard_id?: number | null
  standard_name: string
  division_id?: number | null
  batch_name: string
  academic_year_id: number
  academic_year_name: string
  invoice_id: number
  invoice_number: string
  total_amount: number
  discount_amount: number
  net_amount: number
  paid_amount: number
  outstanding_amount: number
  status: string
  due_date?: string | null
  payment_count: number
  last_payment_date?: string | null
  installments: FeeRegisterInstallment[]
}

export interface FormerStudentRecoveryRecord {
  student_id: number
  admission_number: string
  student_name: string
  phone: string
  email: string
  exit_date: string | null
  exit_reason: string
  exit_notes?: string | null
  days_since_exit: number | null
  board_name: string
  standard_name: string
  batch_name: string
  academic_year_name: string
  invoice_id: number
  invoice_number: string
  total_obligation: number
  paid_amount: number
  outstanding_amount: number
  status: string
  due_date?: string | null
  last_payment_date?: string | null
}

export interface FormerStudentRecoveryResponse {
  debtors_count: number
  total_recoverable_outstanding: number
  records: FormerStudentRecoveryRecord[]
}

export interface HistoricalPaymentItem {
  payment_id: number
  receipt_number: string
  date: string
  payment_method: string
  amount: number
  transaction_reference?: string | null
}

export interface ReceiptFeeSummary {
  total_fee_amount: number
  previous_payments_total: number
  current_payment_amount: number
  total_paid_to_date: number
  outstanding_balance: number
}

export interface DetailedPaymentReceipt {
  receipt_number: string
  payment_id: number
  student_id: number
  student_name: string
  admission_number: string
  academic_year?: string
  standard?: string
  division?: string
  batch?: string
  amount: number
  payment_date: string
  payment_method: string
  transaction_reference?: string | null
  bank_name?: string | null
  cheque_number?: string | null
  cheque_date?: string | null
  notes?: string | null
  status: string
  is_reversed?: boolean
  reversed_at?: string | null
  reversal_reason?: string | null
  invoice_id?: number | null
  invoice_number?: string | null
  historical_payments?: HistoricalPaymentItem[]
  fee_summary?: ReceiptFeeSummary
  allocations?: Array<{
    id?: number
    invoice_id?: number
    installment_id?: number | null
    installment_number?: number | null
    amount: number
  }>
  collected_by?: string
  generated_at?: string
  gross_fee?: number
  concession_amount?: number
  total_fees?: number
  total_paid?: number
  outstanding_after?: number
  previous_paid?: number
}

export interface PaymentReceiptListItem {
  id: number
  receipt_number: string
  payment_id: number
  student_id: number
  student_name: string
  admission_number: string
  academic_year?: string
  board_name: string
  standard_name: string
  batch_name: string
  amount: number
  payment_date: string
  payment_method: string
  status: 'valid' | 'voided' | 'superseded' | string
  is_voided: boolean
  generated_at?: string
  version?: number
  superseded_at?: string
  superseded_by_receipt_number?: string
  reprint_count?: number
  is_duplicate?: boolean
  details?: Record<string, any>
}

export interface PaymentTransactionItem {
  id: number
  student_id: number
  student_name: string
  admission_number: string
  academic_year?: string
  board_name: string
  standard_name: string
  batch_name: string
  amount: number
  payment_date: string
  payment_method: string
  transaction_reference: string
  status: 'draft' | 'submitted' | 'approved' | 'posted' | 'reversed' | 'completed' | string
  notes: string
  receipt_number: string
  edit_count?: number
  refundable_balance?: number
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface StatusWiseCategory {
  invoiced: number
  collected: number
  outstanding: number
  invoice_count: number
  student_count: number
}

export interface StatusWiseOutstanding {
  active: StatusWiseCategory
  inactive: StatusWiseCategory
  left: StatusWiseCategory
  transferred: StatusWiseCategory
  cancelled: StatusWiseCategory
  total_historical: StatusWiseCategory
}

export interface SecondaryIndicators {
  today_collection: number
  overdue_active_fees: number
  due_this_month: number
  pending_verification: { count: number; amount: number }
  pending_refunds: { count: number; amount: number }
  successful_refunds: { count: number; amount: number }
}

export interface AgingBucketData {
  amount: number
  count: number
}

export interface AgingProfile {
  not_due: AgingBucketData
  days_1_30: AgingBucketData
  days_31_60: AgingBucketData
  days_61_90: AgingBucketData
  days_90_plus: AgingBucketData
  total: AgingBucketData
}

export interface AgingAnalysis {
  active: AgingProfile
  total_historical: AgingProfile
}

export interface DailyOperationsSummary {
  today_admissions: number
  new_leads: number
  follow_ups_due_today: number
  demos_scheduled: number
  upcoming_fee_due_invoices: number
  pending_payment_verifications: number
}

export interface OutstandingDrilldownRecord {
  invoice_id: number
  invoice_number: string
  student_id: number
  student_name: string
  admission_number: string
  phone: string
  class_name: string
  batch_name: string
  student_status: string
  aging_bucket: string
  due_date: string | null
  days_overdue: number
  is_overdue: boolean
  total_obligation: number
  paid_amount: number
  outstanding_amount: number
}

export interface OutstandingDrilldownResponse {
  status_scope: string
  aging_bucket: string
  total_count: number
  total_outstanding: number
  records: OutstandingDrilldownRecord[]
}

export interface DashboardStats {
  total_students: number
  total_fees: number
  total_collected: number
  total_outstanding: number
  collection_rate: number
  status_wise_outstanding?: StatusWiseOutstanding
  secondary_indicators?: SecondaryIndicators
  aging_analysis?: AgingAnalysis
  daily_operations?: DailyOperationsSummary
  monthly_trends: MonthlyTrend[]
  recent_payments: RecentPayment[]
  status_filter?: string
  configured_visibility?: string
  concession_governance?: FinancialGovernanceSummary
}

// ─── Analytics Workspace Interfaces ──────────────────────────────────────────

export interface AnalyticsMonthlyTrend {
  month: string
  month_key: string
  collected: number
  transaction_count: number
  target: number
  net_collection: number
  is_current_month: boolean
}

export interface AnalyticsPaymentMethod {
  method: string
  label: string
  count: number
  amount: number
  percentage: number
}

export interface AnalyticsFeeHead {
  head_name: string
  count: number
  amount: number
  percentage: number
}

export interface AnalyticsDailyPulse {
  date: string
  count: number
  amount: number
}

export interface AnalyticsClassWise {
  standard_id?: number
  standard_name: string
  invoice_count: number
  student_count: number
  total_invoiced: number
  total_paid: number
  total_outstanding: number
  collection_rate: number
}

export interface AnalyticsBatchWise {
  division_id?: number
  batch_name: string
  standard_name: string
  invoice_count: number
  student_count: number
  total_invoiced: number
  total_paid: number
  total_outstanding: number
  collection_rate: number
}

export interface AnalyticsTopDefaulter {
  student_id: number
  student_name: string
  admission_number: string
  standard: string
  batch: string
  invoice_number: string
  due_date: string | null
  days_overdue: number
  net_amount: number
  paid_amount: number
  outstanding_amount: number
}

export interface AnalyticsStatusDistribution {
  status: string
  label: string
  count: number
  percentage: number
}

export interface AnalyticsStandardDistribution {
  standard_id?: number
  standard_name: string
  count: number
  percentage: number
}

export interface AnalyticsBatchUtilization {
  division_id?: number
  batch_name: string
  standard_name: string
  capacity: number
  enrolled_count: number
  utilization_rate: number
}

export interface AnalyticsBoardDistribution {
  board_id?: number
  board_name: string
  count: number
  percentage: number
}

export interface AnalyticsFunnelStage {
  stage: string
  label: string
  count: number
  percentage: number
}

export interface AnalyticsLeadSource {
  source: string
  count: number
  percentage: number
}

export interface AnalyticsActivityItem {
  id: number
  type: string
  title: string
  subtitle: string
  method?: string
  timestamp: string
  link: string
}

export interface DashboardAnalyticsData {
  academic_year_id?: number | null
  institution_id?: number | null
  fee_collection: {
    monthly_trends: AnalyticsMonthlyTrend[]
    payment_methods: AnalyticsPaymentMethod[]
    fee_heads: AnalyticsFeeHead[]
    daily_pulse: AnalyticsDailyPulse[]
    total_collected: number
    gross_collected?: number
    refunds_amount?: number
    net_collection: number
    reversals_amount: number
    concessions_reversed?: number
    gross_fee_assessed?: number
    posted_concessions?: number
    net_fee_due?: number
    total_outstanding?: number
  }
  outstanding_analysis: {
    status_wise: StatusWiseOutstanding
    class_wise: AnalyticsClassWise[]
    batch_wise: AnalyticsBatchWise[]
    top_defaulters: AnalyticsTopDefaulter[]
    active_outstanding: number
    total_historical_outstanding: number
  }
  student_analysis: {
    total_unique_students: number
    active_students: number
    left_students: number
    retention_rate: number
    status_distribution: AnalyticsStatusDistribution[]
    standard_distribution: AnalyticsStandardDistribution[]
    batch_utilization: AnalyticsBatchUtilization[]
    board_distribution: AnalyticsBoardDistribution[]
    monthly_admissions: { month: string; month_key: string; count: number }[]
  }
  admissions_crm: {
    total_leads: number
    conversion_rate: number
    converted_count: number
    funnel_stages: AnalyticsFunnelStage[]
    lead_sources: AnalyticsLeadSource[]
    follow_ups: {
      total: number
      completed: number
      scheduled: number
      completion_rate: number
    }
    demo_classes: {
      total: number
      scheduled: number
      completed: number
    }
    admission_concessions?: FinancialGovernanceSummary['admission_breakdown']
  }
  academic_analysis: {
    inventory: {
      standards_count: number
      divisions_count: number
      subjects_count: number
    }
    attendance: {
      total_records: number
      present_count: number
      absent_count: number
      late_count: number
      present_percentage: number
      absent_percentage: number
      late_percentage: number
    }
    examinations: {
      total_exams: number
      total_marks_recorded: number
      passed_count: number
      pass_percentage: number
      average_score: number
      max_score: number
      grade_distribution: { grade: string; count: number; percentage: number }[]
    }
    concession_distribution?: AcademicConcessionDistribution
  }
  transactions_reconciliation: {
    total_transactions: number
    total_volume: number
    status_distribution: { status: string; label: string; count: number; amount: number }[]
    payment_methods: AnalyticsPaymentMethod[]
    refunds: {
      pending_count: number
      pending_amount: number
      completed_count: number
      completed_amount: number
    }
    reversals?: {
      reversed_payments_amount: number
      reversed_concessions_amount: number
      total_reversals: number
    }
    benefits_breakdown?: {
      fee_concessions: number
      fee_waivers: number
      full_fee_waivers: number
      partial_fee_waivers: number
      scholarships: number
      sponsor_funded: number
      manual_adjustments: number
      credit_adjustments: number
      approved_unapplied: number
    }
    sponsors?: FinancialGovernanceSummary['sponsors']
    lifecycle?: FinancialGovernanceSummary['lifecycle']
    ledger_audit: {
      total_invoiced: number
      total_collected: number
      total_outstanding: number
      calculated_balance: number
      variance: number
      is_reconciled: boolean
      gross_fee_assessed?: number
      total_posted_reductions?: number
      net_fee_due?: number
      refunds_completed?: number
      reversed_payments_amount?: number
      reversed_concessions_amount?: number
      credit_adjustments?: number
      broken_invoices_count?: number
    }
  }
  operations: {
    daily_summary: DailyOperationsSummary
    recent_activities: AnalyticsActivityItem[]
  }
  concession_governance?: FinancialGovernanceSummary
  reconciliation_audit?: ReconciliationAuditResponse
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  total: number
  page: number
  page_size: number
  data: T[]
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export interface FeeCollectionRow {
  admission_number: string
  academic_year?: string
  student_name: string
  total_fees: number
  paid: number
  outstanding: number
}

export interface OutstandingRow {
  invoice_id: number
  invoice_number: string
  student_id: number
  student_name: string
  admission_number: string
  academic_year?: string
  net_amount: number
  paid_amount: number
  outstanding: number
  due_date?: string
  status: string
}

// ─── Fee Register Import ──────────────────────────────────────────────────────

export interface FeeRegisterPaymentItem {
  raw: string
  raw_date: string
  amount: number
  day: number
  month: number
  year: number
  date_str: string
}

export interface FeeRegisterStudent {
  student_index: number
  row: number
  name: string
  group: string
  board: string
  level: number
  batch_name: string
  total_fee: number
  payments: FeeRegisterPaymentItem[]
  payments_count: number
  calc_paid: number
  calc_balance: number
  stated_balance: string | number | null
  discrepancy_status: 'MATCH' | 'DISCREPANCY' | 'UNCLEAR' | 'BLANK'
  discrepancy_notes: string
}

export interface FeeRegisterGroup {
  name: string
  board: string
  level: number
  batch_name: string
  student_count: number
  total_fees: number
  total_collected: number
  total_balance: number
}

export interface FeeRegisterSummary {
  total_students: number
  total_payments_count: number
  total_fees: number
  total_collected: number
  total_outstanding: number
  match_count: number
  discrepancy_count: number
  unclear_count: number
  blank_count: number
}

export interface FeeRegisterPreviewResponse {
  file_name: string
  file_hash: string
  groups: FeeRegisterGroup[]
  students: FeeRegisterStudent[]
  summary: FeeRegisterSummary
  audit_checks: {
    total_fees_sum: number
    total_paid_sum: number
    total_balance_sum: number
  }
}

export interface FeeRegisterImportExecutionResponse {
  status: string
  message: string
  import_id: number
  file_hash: string
  summary: {
    total_students: number
    total_payments: number
    total_fees: number
    total_collected: number
    total_outstanding: number
  }
  imported_students: {
    student_id: number
    admission_number: string
    academic_year?: string
    name: string
    group: string
    batch: string
    total_fee: number
    invoice_id: number
    invoice_number: string
    payments_count: number
    paid_amount: number
    balance: number
    discrepancy_status: string
  }[]
}

export interface FeeRegisterImportLog {
  id: number
  file_name: string
  file_hash: string
  imported_students_count: number
  imported_payments_count: number
  total_fees_amount: number
  total_collected_amount: number
  total_outstanding_amount: number
  reconciliation_summary?: any
  status: string
  created_at: string
}

// ─── Student Portal & Profile ──────────────────────────────────────────────────

export interface TimetableSlot {
  id: number
  day_of_week: string
  start_time: string
  end_time: string
  room_number: string
  subject_id?: number
  subject_name: string
  subject_code?: string
  is_today?: boolean
  is_active?: boolean
}

export interface StudyMaterialItem {
  id: number
  institution_id?: number
  standard_id?: number
  standard_name: string
  subject_id: number
  subject_name: string
  division_id?: number | null
  division_name?: string | null
  title: string
  description?: string
  file_type: string
  file_url: string
  file_size_bytes: number
  created_at: string
}

export interface StudyMaterialStats {
  total_materials: number
  standards_covered: number
  subjects_covered: number
  question_banks: number
  formula_sheets: number
  notes: number
  assignments: number
  revision: number
  type_breakdown: Record<string, number>
}

export interface AnnouncementItem {
  id: number
  title: string
  content: string
  category: string
  is_pinned: boolean
  publish_date: string
}

export interface StudentDocumentItem {
  id: number
  student_id?: number
  title: string
  document_type: string
  file_url: string
  status: string
  uploaded_at: string
}

export interface TestResultItem {
  id: number
  exam_id?: number
  exam_name: string
  exam_type: string
  exam_date?: string
  subject_id?: number
  subject_name: string
  marks_obtained: number
  max_marks: number
  percentage: number
  grade: string
  remarks?: string
  is_absent?: boolean
}

export interface UpcomingTestItem {
  id: number
  name: string
  exam_type: string
  start_date?: string
  end_date?: string
  max_marks: number
  passing_marks: number
}

export interface StudentPortalDashboard {
  student: {
    id: number
    admission_number: string
    academic_year?: string
    first_name: string
    last_name: string
    full_name: string
    gender: string
    phone: string
    email: string
    photo_url?: string
    is_active: boolean
  }
  active_enrollment?: {
    id: number
    roll_number: string
    academic_year: string
    standard_name: string
    standard_level: number
    division_name: string
    board_name: string
    board_code: string
    status: string
    enrollment_date: string
  }
  upcoming_classes: TimetableSlot[]
  attendance_summary: {
    total_days: number
    present_days: number
    absent_days: number
    late_days: number
    attendance_percentage: number
  }
  fee_status: {
    total_fees: number
    paid_amount: number
    outstanding_balance: number
    status: string
    collection_rate: number
  }
  recent_results: TestResultItem[]
  announcements: AnnouncementItem[]
  stats: {
    enrolled_subjects_count: number
    study_materials_count: number
    upcoming_tests_count: number
    attendance_rate: number
  }
  viewer: {
    user_id: number
    user_role: string
    is_student_user: boolean
  }
}

export interface StudentAdminProfile {
  overview: {
    id: number
    admission_number: string
    academic_year?: string
    first_name: string
    last_name: string
    middle_name?: string
    full_name: string
    date_of_birth: string
    gender: string
    blood_group?: string
    nationality?: string
    religion?: string
    caste?: string
    aadhar_number?: string
    phone?: string
    email?: string
    address?: string
    city?: string
    state?: string
    pincode?: string
    admission_date: string
    is_active: boolean
    exit_date?: string
    exit_reason?: string
    exit_notes?: string
    active_batch: string
    active_standard: string
    active_board: string
    guardians: Guardian[]
    attendance_summary: {
      attendance_percentage: number
      total_days: number
      present_days: number
      absent_days: number
    }
    fee_summary: {
      total_fees: number
      gross_fees?: number
      total_concessions?: number
      net_fees?: number
      total_paid: number
      outstanding: number
      collection_rate: number
    }
    recent_test?: TestResultItem
  }
  enrollment: {
    id: number
    academic_year: string
    academic_year_id: number
    standard_id: number
    standard_name: string
    standard_level: number
    division_id?: number
    division_name: string
    board_name: string
    board_code: string
    roll_number: string
    status: string
    enrollment_date: string
    remarks?: string
    exit_date?: string
    exit_reason?: string
    exit_notes?: string
  }[]
  classes: {
    active_standard_id?: number
    active_division_id?: number
    subjects: {
      id: number
      name: string
      code?: string
      max_marks: number
      pass_marks: number
      is_optional: boolean
    }[]
  }
  attendance: {
    summary: {
      total_days: number
      present_days: number
      absent_days: number
      late_days: number
      attendance_percentage: number
    }
    records: {
      id: number
      date: string
      status: string
      remarks: string
    }[]
  }
  tests: TestResultItem[]
  fees: {
    summary: {
      total_fees: number
      gross_fees?: number
      total_concessions?: number
      approved_benefits?: number
      approved_unapplied?: number
      applied_concessions?: number
      fee_waivers?: number
      scholarships?: number
      sponsor_funding?: number
      net_fees?: number
      gross_paid?: number
      refunds_completed?: number
      total_paid: number
      outstanding: number
      collection_rate: number
    }
    governance?: FinancialGovernanceSummary
    waiver_history?: any[]
    approval_history?: any[]
    invoices: FeeInvoice[]
    concessions?: {
      id: number
      application_number: string
      concession_type_code: string
      concession_name: string
      category: string
      benefit_type?: string
      waiver_scope?: string | null
      requested_amount: number
      approved_amount: number
      applied_amount: number
      reversed_amount?: number
      status: string
      funding_source: string
      sponsor_name?: string | null
      sponsor_settlement_status?: string | null
      valid_until?: string | null
      approved_at?: string | null
      approval_remarks?: string | null
      rejection_reason?: string | null
      cancellation_reason?: string | null
      invoice_id?: number | null
      allocations?: any[]
    }[]
    payments: Payment[]
  }
  documents: StudentDocumentItem[]
  activity: {
    id: string
    type: string
    action: string
    description: string
    timestamp: string
    status?: string
  }[]
  communications?: {
    id: number
    channel: string
    recipient_name: string
    recipient_destination: string
    subject?: string
    content: string
    status: string
    is_lead_history: boolean
    created_at: string
  }[]
  linked_lead?: {
    id: number
    lead_number: string
    stage: string
    source: string
    created_at: string
  } | null
}

// ─── Import & Export Types ──────────────────────────────────────────────────

export interface EntityFieldDef {
  key: string
  label: string
  required: boolean
  type: 'str' | 'int' | 'float' | 'date' | 'email' | 'bool'
  sample: string
  desc: string
}

export interface SupportedEntity {
  key: string
  label: string
  unique_key: string[]
  fields: EntityFieldDef[]
}

export interface ImportPreviewRow {
  row_number: number
  data: Record<string, any>
  raw_row: any[]
  is_valid: boolean
  is_duplicate: boolean
  action: 'create' | 'update' | 'skip_duplicate'
  errors: string[]
}

export interface ImportPreviewResponse {
  entity_type: string
  total_rows: number
  valid_rows: number
  invalid_rows: number
  duplicates_found: number
  mode: 'create_only' | 'update_existing'
  mapped_columns: Record<string, string>
  field_definitions: EntityFieldDef[]
  row_previews: ImportPreviewRow[]
  file_name?: string
}

export interface ImportExecuteResult {
  success: boolean
  import_id: number
  entity_type: string
  total_rows: number
  created_count: number
  updated_count: number
  skipped_count: number
  failed_count: number
  status: 'completed' | 'partial' | 'failed'
  errors: { row: number; errors: string[] }[]
}

export interface ImportHistoryItem {
  id: number
  entity_type: string
  import_mode: string
  source_type: string
  file_name?: string
  total_rows: number
  successful_rows: number
  failed_rows: number
  status: 'completed' | 'partial' | 'failed'
  created_at?: string
  imported_by: string
  reconciliation?: {
    created?: number
    updated?: number
    skipped?: number
    failed?: number
  }
}

export interface ImportHistoryDetail extends ImportHistoryItem {
  errors: { row?: number; errors?: string[]; raw?: string }[]
}

export interface ExportFilterParams {
  entity_type: string
  file_format: 'xlsx' | 'csv'
  academic_year_id?: number
  board_id?: number
  standard_id?: number
  division_id?: number
  start_date?: string
  end_date?: string
  status_filter?: string
}

// ─── User Management & Profile Workspace Types ─────────────────────────────

export interface UserManagementStats {
  total_accounts: number
  active_accounts: number
  inactive_accounts: number
  pending_invitations: number
  roles_breakdown: Record<string, number>
}

export interface UserLinkedPerson {
  type: 'student' | 'staff'
  id: number
  name: string
  identifier?: string
  class_name?: string
  batch_name?: string
  designation?: string
  assigned_batches?: string[]
}

export interface UserListItem {
  id: number
  username: string
  email: string
  phone?: string
  first_name: string
  last_name: string
  full_name: string
  role: string
  is_active: boolean
  invitation_status: 'accepted' | 'pending' | 'expired'
  scope_type: 'institute' | 'board' | 'standard' | 'batch'
  scope_id?: number
  scope_label: string
  staff_code?: string
  designation?: string
  last_login?: string
  created_at?: string
  linked_person?: UserLinkedPerson | null
}

export interface UserListResponse {
  items: UserListItem[]
  total: number
  page: number
  limit: number
  pages: number
}

export interface UserProfileWorkspaceData {
  user: {
    id: number
    username: string
    email: string
    phone?: string
    first_name: string
    last_name: string
    full_name: string
    role: string
    role_description: string
    is_active: boolean
    invitation_status: string
    invitation_sent_at?: string
    scope_type: string
    scope_id?: number
    scope_label: string
    staff_code?: string
    designation?: string
    student_id?: number
    last_login?: string
    created_at?: string
    updated_at?: string
  }
  permissions: { resource: string; action: string }[]
  linked_student?: {
    id: number
    admission_number: string
    academic_year?: string
    first_name: string
    last_name: string
    full_name: string
    date_of_birth?: string
    gender?: string
    blood_group?: string
    phone?: string
    email?: string
    address?: string
    city?: string
    is_active: boolean
    current_enrollment?: any
  } | null
  academic: {
    enrollments: {
      id: number
      academic_year: string
      standard_name: string
      board_name: string
      batch_name: string
      roll_number?: string
      enrollment_date?: string
      status: string
    }[]
    assigned_batches: {
      id: number
      batch_name: string
      batch_code?: string
      standard_name: string
      board_name?: string
      room_number?: string
      schedule_timing?: string
      capacity: number
    }[]
  }
  attendance: {
    summary?: {
      total_days: number
      present_days: number
      absent_days: number
      late_days: number
      rate_percentage: number
    } | null
    records: {
      id: number
      date: string
      status: string
      remarks?: string
    }[]
  }
  examinations: {
    results: {
      id: number
      exam_name: string
      marks_obtained: number
      max_marks: number
      percentage: number
      grade: string
      remarks: string
    }[]
  }
  fees?: {
    total_fees: number
    total_paid: number
    outstanding_balance: number
    invoices: {
      id: number
      invoice_number: string
      total_amount: number
      paid_amount: number
      status: string
      due_date?: string
    }[]
    payments: {
      id: number
      amount: number
      payment_date: string
      payment_method: string
      transaction_reference?: string
      status: string
    }[]
  } | null
  activity_logs: {
    id: number
    action: string
    resource_type: string
    resource_id?: number
    new_data?: string
    old_data?: string
    created_at?: string
  }[]
  permitted_tabs: string[]
}

export interface UserCreatePayload {
  username: string
  email: string
  password?: string
  first_name: string
  last_name: string
  phone?: string
  role: string
  role_id?: number
  institution_id?: number
  student_id?: number
  staff_code?: string
  designation?: string
  scope_type?: string
  scope_id?: number
  send_invitation?: boolean
}

export interface UserUpdatePayload {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  role?: string
  role_id?: number
  student_id?: number
  staff_code?: string
  designation?: string
  scope_type?: string
  scope_id?: number
  is_active?: boolean
}

// ─── Academic Workspace Types ────────────────────────────────────────────────

export interface AcademicSubject {
  id: number
  standard_id: number
  standard_name?: string
  standard_level?: number
  name: string
  code: string
  max_marks: number
  passing_marks: number
  is_core: boolean
  is_active: boolean
  canonical_subject_id?: number | null
  alternate_codes?: string | null
  aliases?: string | null
}

export interface SubjectLegacyMapping {
  id: number
  institution_id: number
  legacy_subject_id: number
  legacy_name: string
  legacy_code: string
  canonical_subject_id: number
  canonical_name: string
  canonical_code: string
  notes?: string | null
  created_at?: string
}

export interface CanonicalSubject {
  id: number
  name: string
  code: string
  category: string
  description?: string | null
  aliases?: string | null
  alternate_codes?: string | null
  is_active: boolean
  mappings_count?: number
  standards_count?: number
  boards_count?: number
  standards_summary?: string[]
  boards_summary?: string[]
  created_at?: string
  mappings?: SubjectMappingItem[]
  legacy_mappings?: SubjectLegacyMapping[]
}

export interface SubjectMappingItem {
  id: number
  canonical_subject_id: number
  canonical_name: string
  canonical_code: string
  category?: string
  standard_id: number
  standard_name: string
  standard_level?: number
  board_id?: number | null
  board_name?: string | null
  board_code?: string | null
  academic_year_id?: number | null
  academic_year_name?: string | null
  curriculum_code?: string | null
  display_name: string
  max_marks: number
  pass_marks: number
  is_optional: boolean
  display_order: number
  is_active: boolean
  legacy_subject_id?: number | null
}

export interface SubjectDuplicateCheckResult {
  has_exact_match: boolean
  exact_match?: {
    id: number
    name: string
    code: string
    category: string
    description?: string | null
    aliases?: string | null
  } | null
  similar_matches: Array<{
    id: number
    name: string
    code: string
    category: string
    description?: string | null
    aliases?: string | null
  }>
  message: string
}

export interface AcademicTimetableEntry {
  id: number
  division_id: number
  division_name?: string
  division_code?: string
  subject_id: number
  subject_name?: string
  subject_code?: string
  standard_id?: number
  standard_name?: string
  board_id?: number
  board_name?: string
  day_of_week: string
  start_time: string
  end_time: string
  room_number: string
  is_active: boolean
}

export interface EnrollmentRecord {
  id: number
  student_id: number
  student_name: string
  admission_number: string
  academic_year?: string
  phone?: string
  academic_year_id: number
  academic_year_name: string
  standard_id: number
  standard_name: string
  board_id?: number
  board_name?: string
  board_code?: string
  division_id?: number
  division_name: string
  division_code?: string
  roll_number: string
  enrollment_date?: string
  status: string
  remarks?: string
}

export interface EnrollmentStats {
  total_active_enrollments: number
  total_students: number
  unassigned_students: number
  enrolled_capacity: number
  total_capacity: number
  occupancy_percentage: number
}

export interface UnassignedStudent {
  id: number
  admission_number: string
  academic_year?: string
  first_name: string
  last_name: string
  full_name: string
  gender: string
  phone?: string
  email?: string
}

export interface BatchCapacityReportRow {
  batch_id: number
  batch_name: string
  batch_code?: string
  board_name?: string
  standard_name: string
  capacity: number
  enrolled: number
  available_seats: number
  occupancy_percentage: number
  status: string
  teacher_name?: string
  room_number?: string
  schedule_timing?: string
}

export interface AcademicDistributionReportRow {
  board_id: number
  board_name: string
  board_code: string
  standard_id: number
  standard_name: string
  standard_level: number
  batches_count: number
  total_capacity: number
  enrolled_count: number
  available_seats: number
  occupancy_percentage: number
}

export interface FacultyLoadReportRow {
  user_id: number
  teacher_name: string
  username: string
  email: string
  staff_code: string
  designation: string
  assigned_batches_count: number
  weekly_sessions_count: number
  total_students: number
}







export interface ImportPreviewRow {
  row_number: number
  data: Record<string, any>
  raw_row: any[]
  is_valid: boolean
  is_duplicate: boolean
  action: 'create' | 'update' | 'skip_duplicate'
  errors: string[]
}

export interface ImportPreviewResponse {
  entity_type: string
  total_rows: number
  valid_rows: number
  invalid_rows: number
  duplicates_found: number
  mode: 'create_only' | 'update_existing'
  mapped_columns: Record<string, string>
  field_definitions: EntityFieldDef[]
  row_previews: ImportPreviewRow[]
  file_name?: string
}

export interface ImportExecuteResult {
  success: boolean
  import_id: number
  entity_type: string
  total_rows: number
  created_count: number
  updated_count: number
  skipped_count: number
  failed_count: number
  status: 'completed' | 'partial' | 'failed'
  errors: { row: number; errors: string[] }[]
}

export interface ImportHistoryItem {
  id: number
  entity_type: string
  import_mode: string
  source_type: string
  file_name?: string
  total_rows: number
  successful_rows: number
  failed_rows: number
  status: 'completed' | 'partial' | 'failed'
  created_at?: string
  imported_by: string
  reconciliation?: {
    created?: number
    updated?: number
    skipped?: number
    failed?: number
  }
}

export interface ImportHistoryDetail extends ImportHistoryItem {
  errors: { row?: number; errors?: string[]; raw?: string }[]
}

export interface ExportFilterParams {
  entity_type: string
  file_format: 'xlsx' | 'csv'
  academic_year_id?: number
  board_id?: number
  standard_id?: number
  division_id?: number
  start_date?: string
  end_date?: string
  status_filter?: string
}





export interface UserListResponse {
  items: UserListItem[]
  total: number
  page: number
  limit: number
  pages: number
}

export interface UserProfileWorkspaceData {
  user: {
    id: number
    username: string
    email: string
    phone?: string
    first_name: string
    last_name: string
    full_name: string
    role: string
    role_description: string
    is_active: boolean
    invitation_status: string
    invitation_sent_at?: string
    scope_type: string
    scope_id?: number
    scope_label: string
    staff_code?: string
    designation?: string
    student_id?: number
    last_login?: string
    created_at?: string
    updated_at?: string
  }
  permissions: { resource: string; action: string }[]
  linked_student?: {
    id: number
    admission_number: string
    academic_year?: string
    first_name: string
    last_name: string
    full_name: string
    date_of_birth?: string
    gender?: string
    blood_group?: string
    phone?: string
    email?: string
    address?: string
    city?: string
    is_active: boolean
    current_enrollment?: any
  } | null
  academic: {
    enrollments: {
      id: number
      academic_year: string
      standard_name: string
      board_name: string
      batch_name: string
      roll_number?: string
      enrollment_date?: string
      status: string
    }[]
    assigned_batches: {
      id: number
      batch_name: string
      batch_code?: string
      standard_name: string
      board_name?: string
      room_number?: string
      schedule_timing?: string
      capacity: number
    }[]
  }
  attendance: {
    summary?: {
      total_days: number
      present_days: number
      absent_days: number
      late_days: number
      rate_percentage: number
    } | null
    records: {
      id: number
      date: string
      status: string
      remarks?: string
    }[]
  }
  examinations: {
    results: {
      id: number
      exam_name: string
      marks_obtained: number
      max_marks: number
      percentage: number
      grade: string
      remarks: string
    }[]
  }
  fees?: {
    total_fees: number
    total_paid: number
    outstanding_balance: number
    invoices: {
      id: number
      invoice_number: string
      total_amount: number
      paid_amount: number
      status: string
      due_date?: string
    }[]
    payments: {
      id: number
      amount: number
      payment_date: string
      payment_method: string
      transaction_reference?: string
      status: string
    }[]
  } | null
  activity_logs: {
    id: number
    action: string
    resource_type: string
    resource_id?: number
    new_data?: string
    old_data?: string
    created_at?: string
  }[]
  permitted_tabs: string[]
}

export interface UserCreatePayload {
  username: string
  email: string
  password?: string
  first_name: string
  last_name: string
  phone?: string
  role: string
  role_id?: number
  institution_id?: number
  student_id?: number
  staff_code?: string
  designation?: string
  scope_type?: string
  scope_id?: number
  send_invitation?: boolean
}

export interface UserUpdatePayload {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  role?: string
  role_id?: number
  student_id?: number
  staff_code?: string
  designation?: string
  scope_type?: string
  scope_id?: number
  is_active?: boolean
}






export interface UnassignedStudent {
  id: number
  admission_number: string
  academic_year?: string
  first_name: string
  last_name: string
  full_name: string
  gender: string
  phone?: string
  email?: string
}

export interface BatchCapacityReportRow {
  batch_id: number
  batch_name: string
  batch_code?: string
  board_name?: string
  standard_name: string
  capacity: number
  enrolled: number
  available_seats: number
  occupancy_percentage: number
  status: string
  teacher_name?: string
  room_number?: string
  schedule_timing?: string
}

export interface AcademicDistributionReportRow {
  board_id: number
  board_name: string
  board_code: string
  standard_id: number
  standard_name: string
  standard_level: number
  batches_count: number
  total_capacity: number
  enrolled_count: number
  available_seats: number
  occupancy_percentage: number
}

export interface FacultyLoadReportRow {
  user_id: number
  teacher_name: string
  username: string
  email: string
  staff_code: string
  designation: string
  assigned_batches_count: number
  weekly_sessions_count: number
  total_students: number
}








// ─── Staff & Faculty Management ──────────────────────────────────────────────

export interface StaffMember {
  profile_id: number
  user_id: number
  employee_id: string
  first_name: string
  last_name: string
  full_name: string
  username: string
  email: string
  phone?: string
  role: string
  staff_type: string
  department?: string
  qualification?: string
  specialization?: string
  experience_years?: number
  employment_type: string
  joining_date?: string
  status: string
  is_active: boolean
  profile_photo_url?: string
  basic_salary?: number
  assignments_count: number
  total_weekly_hours: number
}

export interface StaffProfileDetail extends StaffMember {
  gender?: string
  date_of_birth?: string
  blood_group?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relation?: string
  current_address?: string
  permanent_address?: string
  city?: string
  state?: string
  pincode?: string
  notes?: string
  pan_number?: string
  aadhar_number?: string
  bank_name?: string
  bank_account_number?: string
  bank_ifsc?: string
  reporting_manager_id?: number | null
  reporting_manager_name?: string | null
  responsibilities?: string | null
  contract_start_date?: string | null
  contract_end_date?: string | null
  status_effective_date?: string | null
  exit_date?: string | null
  exit_reason?: string | null
  rehire_eligible?: boolean
  assignments: Array<{
    id: number
    board_id?: number
    board: string
    standard_id?: number
    standard: string
    division_id?: number
    batch: string
    batch_code?: string
    subject_id?: number
    subject: string
    weekly_hours: number
    is_class_teacher: boolean
    notes?: string
  }>
  addresses?: Array<{
    id: number
    staff_profile_id: number
    address_type: string
    address_line: string
    city: string
    state: string
    pincode: string
    country: string
    is_primary: boolean
    is_active: boolean
  }>
  bank_accounts?: Array<{
    id: number
    account_holder_name: string
    bank_name: string
    account_number: string
    ifsc_code: string
    branch_name?: string
    account_type: string
    is_primary: boolean
    is_verified: boolean
    is_active: boolean
  }>
  key_contacts?: Array<{
    id: number
    contact_name: string
    relationship: string
    phone_primary: string
    phone_secondary?: string
    email?: string
    address?: string
    is_primary_emergency: boolean
    is_nominee?: boolean
    is_active?: boolean
    priority?: number
  }>
  employment_histories?: Array<{
    id: number
    event_type: string
    old_status?: string | null
    new_status: string
    effective_date: string
    reason?: string | null
    notes?: string | null
  }>
  leave_balance?: {
    casual_total: number
    casual_used: number
    sick_total: number
    sick_used: number
    earned_total: number
    earned_used: number
  }
}

export interface TeacherAssignmentItem {
  id: number
  teacher_user_id: number
  teacher_name: string
  board_id: number
  board_name: string
  standard_id: number
  standard_name: string
  division_id: number
  batch_name: string
  subject_id: number
  subject_name: string
  weekly_hours: number
  is_class_teacher: boolean
  notes?: string
}

export interface StaffAttendanceItem {
  user_id: number
  employee_id: string
  full_name: string
  staff_type: string
  department?: string
  date: string
  status: string
  check_in_time?: string
  check_out_time?: string
  hours_worked?: number
  remarks?: string
  is_marked: boolean
}

export interface StaffDailyAttendanceResponse {
  date: string
  total_staff: number
  present_count: number
  absent_count: number
  late_count: number
  half_day_count: number
  leave_count: number
  records: StaffAttendanceItem[]
}

export interface StaffLeaveItem {
  id: number
  user_id: number
  staff_name: string
  email: string
  leave_type: string
  start_date: string
  end_date: string
  days_count: number
  reason: string
  status: string
  action_remarks?: string
  action_date?: string
  applied_at?: string
}

export interface StaffDocumentTemplate {
  id: string
  category: string
  title: string
  code: string
  description: string
}

export interface StaffDocumentRenderResponse {
  form_id: string
  title: string
  category: string
  reference_number: string
  staff_name: string
  employee_id: string
  html_content: string
}

// ─── SysAdmin Superuser Governance ───────────────────────────────────────────

export interface SysAdminOverview {
  status: string
  timestamp: string
  current_sysadmin: {
    id: number
    username: string
    email: string
    role: string
  }
  users_summary: {
    total_accounts: number
    active_accounts: number
    active_sysadmins: number
    roles_breakdown: Record<string, number>
  }
  academic_summary: {
    active_students: number
    active_faculty_staff: number
    active_batches: number
  }
  financial_summary: {
    total_invoiced: number
    total_collected: number
    total_outstanding: number
  }
  security_audit_summary: {
    total_logs: number
    security_audits: number
    critical_events: number
  }
}

export interface SecurityAuditLogItem {
  id: number
  user_id?: number
  actor_username?: string
  actor_name?: string
  actor_role?: string
  action: string
  resource_type: string
  resource_id?: number
  old_data?: string
  new_data?: string
  details?: string
  severity: string
  is_system_audit: boolean
  ip_address?: string
  user_agent?: string
  created_at: string
}

export interface SecurityAuditLogsResponse {
  items: SecurityAuditLogItem[]
  total: number
  page: number
  limit: number
  pages: number
}

export interface UniversalEditPayload {
  model_name: string
  record_id: number
  fields: Record<string, any>
  reason?: string
}

export interface SystemSettings {
  institution_name: string
  institution_code: string
  contact_phone: string
  contact_email: string
  maintenance_mode: boolean
  session_timeout_minutes: number
  enable_mfa_requirement: boolean
  allow_self_registration: boolean
  security_audit_logging_active: boolean
  system_version: string
  app_environment: string
}

// ─── Institute Settings Workspace & Configuration ───────────────────────────

export interface InstituteProfile {
  id: number
  name: string
  code: string
  short_name: string
  tagline: string
  institute_type: string
  establishment_year: number
  registration_number: string
  tax_id: string
  description: string
  is_active: boolean
  default_language: string
  timezone: string
  address: string
  city: string
  state: string
  pincode: string
  phone: string
  email: string
  website: string
  logo_url: string
  favicon_url: string
  primary_color: string
  secondary_color: string
  accent_color: string
}

export interface LookupItem {
  id: number
  category: string
  code: string
  label: string
  description?: string
  sort_order: number
  is_active: boolean
  is_system: boolean
  meta_data?: string
}

export interface LookupsResponse {
  categories: string[]
  items: LookupItem[]
}

export interface SettingAuditLogItem {
  id: number
  setting_key: string
  category: string
  previous_value?: string
  new_value?: string
  changed_by_name: string
  reason?: string
  created_at: string
}

export type AllSettingsState = Record<string, Record<string, any>>

// ─── Centralized Communication & Sharing Module ──────────────────────────────

export interface MessageTemplateItem {
  id: number
  name: string
  code: string
  category: string
  channel: string
  subject?: string
  body: string
  variables?: string[]
  is_active: boolean
  is_system: boolean
  created_at: string
  updated_at: string
}

export interface CommunicationLogItem {
  id: number
  channel: string
  recipient_type: string
  recipient_name: string
  recipient_destination: string
  template_code?: string
  subject?: string
  content: string
  status: string
  error_message?: string
  sender_name?: string
  created_at: string
  sent_at?: string
}

export interface CommunicationLogsResponse {
  items: CommunicationLogItem[]
  total: number
  page: number
  limit: number
}

export interface ShareDocumentPayload {
  document_type: string
  record_id: number
  recipient_name?: string
  recipient_phone?: string
  recipient_email?: string
  expires_in_hours?: number
  access_key?: string
}

export interface ShareDocumentResponse {
  status: string
  token: string
  share_url: string
  expires_at: string
  whatsapp_share_url: string
  document_type: string
  record_id: number
}

export interface RecipientItem {
  id?: number
  type: string
  name: string
  subtitle?: string
  phone?: string
  email?: string
  admission_number?: string
  employee_id?: string
  batch_code?: string
  destination?: string
  variables?: Record<string, any>
}

export interface SendMessagePayload {
  channel: string
  template_code?: string
  subject?: string
  message: string
  recipients: Array<{
    recipient_type: string
    recipient_id?: number
    name: string
    destination: string
    variables?: Record<string, any>
  }>
  document_attachment?: {
    document_type: string
    record_id: number
    title: string
  }
  scheduled_at?: string
}

export interface ChannelDiagnostics {
  status: string
  channels: Record<
    string,
    {
      name: string
      adapter: string
      status: string
      features: string[]
    }
  >
}

export interface AutomationRules {
  fee_reminders_enabled: boolean
  fee_reminder_days_before: number
  fee_reminder_frequency_days: number
  attendance_alerts_enabled: boolean
  receipt_auto_share_enabled: boolean
  default_channel: string
  institute_display_name: string
}

export interface FeeReminderQueueItem {
  invoice_id: number
  invoice_number: string
  student_id: number
  student_name: string
  admission_number: string
  guardian_name: string
  guardian_relation: string
  phone: string
  pending_amount: number
  total_amount: number
  paid_amount: number
  due_date: string
  message: string
  whatsapp_url: string
}

export interface StudentIdCardData {
  student_id: number
  admission_number: string
  first_name: string
  last_name: string
  full_name: string
  date_of_birth: string
  blood_group: string
  photo_url?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  standard_name: string
  division_name: string
  roll_number: string
  academic_year: string
  guardian_name: string
  guardian_phone: string
  guardian_relation: string
  institution: {
    id: number
    name: string
    code: string
    short_name: string
    tagline: string
    address?: string
    city?: string
    phone?: string
    logo_url?: string | null
    primary_color?: string
  }
  qr_payload: string
  qr_svg: string
  valid_until: string
}

export interface ScanCheckinResult {
  status: 'success' | 'already_marked'
  message: string
  student: {
    id: number
    name: string
    admission_number: string
    photo_url?: string | null
    status: string
    remarks?: string
    checkin_time: string
  }
}

export interface ExamMarksSheet {
  exam: {
    id: number
    name: string
    exam_type: string
    standard_id: number
    max_marks: number
    passing_marks: number
    start_date?: string | null
    end_date?: string | null
  }
  subjects: Array<{
    id: number
    name: string
    code: string
    max_marks: number
    pass_marks: number
  }>
  students: Array<{
    student_id: number
    admission_number: string
    name: string
    roll_number: string
    scores: Record<
      number,
      {
        id?: number | null
        marks_obtained?: number | null
        grade?: string | null
        remarks?: string | null
        is_absent?: boolean
      }
    >
  }>
}

export interface ExamAnalyticsData {
  examination_id: number
  exam_name: string
  total_candidates: number
  appeared_candidates: number
  pass_count: number
  fail_count: number
  pass_percentage: number
  class_average: number
  highest_score: number
  lowest_score: number
  grade_distribution: Record<string, number>
  subject_analytics: Array<{
    subject_id: number
    subject_name: string
    candidates_count: number
    average_marks: number
    highest_marks: number
    lowest_marks: number
  }>
  leaderboard: Array<{
    student_id: number
    name: string
    admission_number: string
    total_obtained: number
    total_max: number
    percentage: number
    grade: string
    result: string
    rank: number
  }>
}

export interface StudentReportCardData {
  student: {
    id: number
    admission_number: string
    full_name: string
    photo_url?: string | null
    standard_name: string
    division_name: string
    roll_number: string
    guardian_name: string
    guardian_phone: string
  }
  examination: {
    id: number
    name: string
    exam_type: string
    start_date?: string | null
    end_date?: string | null
  }
  institution: {
    name: string
    short_name: string
    tagline: string
    address?: string
    city?: string
    phone?: string
    logo_url?: string | null
  }
  subjects: Array<{
    subject_id: number
    subject_name: string
    subject_code: string
    max_marks: number
    passing_marks: number
    marks_obtained: string
    percentage: number
    grade: string
    status: string
    remarks: string
  }>
  summary: {
    total_max_marks: number
    total_obtained: number
    percentage: number
    grade: string
    result: string
    class_rank: string
    total_candidates: number
  }
}


// ─── Student Lifecycle & Withdrawal Analytics ─────────────────────────────

export interface StudentExitPayload {
  exit_date: string
  reason: string
  notes?: string
  refund_amount?: number
  refund_method?: 'cash' | 'bank_transfer' | 'cheque' | 'upi'
  refund_reference?: string
  refund_notes?: string
}

export interface StudentReactivatePayload {
  academic_year_id: number
  standard_id: number
  division_id?: number
  effective_date: string
  roll_number?: string
  notes?: string
}

export interface RefundItem {
  id: number
  student_id: number
  enrollment_id?: number
  payment_id?: number
  invoice_id?: number
  amount: number
  refund_date: string
  refund_method: string
  reference_number?: string
  reason: string
  status: string
  notes?: string
  processed_by_id?: number
  processed_by_name?: string
  created_at: string
}

export interface StudentLifecycleLogItem {
  id: number
  student_id: number
  enrollment_id?: number
  action: string
  from_status?: string
  to_status?: string
  effective_date: string
  reason?: string
  notes?: string
  performed_by_id?: number
  performed_by_name?: string
  created_at: string
}

export interface StudentLifecycleHistoryResponse {
  student_id: number
  is_active: boolean
  current_status: string
  exit_date?: string
  exit_reason?: string
  exit_notes?: string
  logs: StudentLifecycleLogItem[]
  enrollments: {
    id: number
    academic_year_id: number
    academic_year: string
    standard_id: number
    standard_name: string
    division_id?: number
    division_name?: string
    roll_number?: string
    status: string
    enrollment_date: string
    exit_date?: string
    exit_reason?: string
    exit_notes?: string
  }[]
  refunds: RefundItem[]
}

export interface WithdrawalReportItem {
  student_id: number
  admission_number: string
  student_name: string
  phone?: string
  academic_year: string
  standard_name: string
  division_name: string
  enrollment_date?: string
  exit_date?: string
  exit_reason?: string
  exit_notes?: string
  exited_by_name?: string
  invoiced_amount: number
  gross_paid: number
  refund_amount: number
  net_retained: number
  outstanding_at_exit: number
  paid_classification: 'Paid' | 'Unpaid'
  installment_at_exit?: string
}

export interface WithdrawalAnalyticsResponse {
  summary: {
    total_enrolled: number
    active_students: number
    withdrawn_students: number
    attrition_rate: number
    paid_withdrawn_count: number
    unpaid_withdrawn_count: number
    gross_paid: number
    refund_amount: number
    net_retained: number
    outstanding_at_exit: number
  }
  by_reason: {
    reason: string
    count: number
    percentage: number
    net_retained: number
  }[]
  by_class_batch: {
    standard_name: string
    division_name: string
    total_enrolled: number
    withdrawn_count: number
    attrition_rate: number
    net_retained: number
  }[]
  by_installment: {
    installment_at_exit: string
    count: number
    net_retained: number
  }[]
  trends_monthly: {
    month: string
    month_label: string
    count: number
    refund_amount: number
    net_retained: number
  }[]
}


// ─── Release & Change Management ─────────────────────────────────────────────

export interface SystemReleaseCurrent {
  id: number | null
  version: string
  build_number: string
  title: string
  status: 'draft' | 'validating' | 'release_candidate' | 'approved' | 'published' | 'rolled_back'
  environment: string
  published_at: string | null
  git_commit?: string | null
  git_tag?: string | null
  is_critical_security: boolean
  release_notes_markdown: string
}

export interface SystemReleaseListItem {
  id: number
  version: string
  build_number: string
  title: string
  status: 'draft' | 'validating' | 'release_candidate' | 'approved' | 'published' | 'rolled_back'
  environment: string
  git_branch?: string
  git_tag?: string
  validation_status: 'pending' | 'in_progress' | 'passed' | 'failed'
  is_critical_security: boolean
  created_at: string
  approved_at?: string | null
  published_at?: string | null
  rolled_back_at?: string | null
  rollback_reason?: string | null
  rollback_target_version?: string | null
  created_by_id: number
  approved_by_id?: number | null
  published_by_id?: number | null
  change_summary: {
    total_commits?: number
    changed_files?: number
    affected_modules?: string[]
    migrations_count?: number
  }
  structured_notes_counts: Record<string, number>
}

export interface SystemReleaseDetail extends SystemReleaseListItem {
  git_commit_start?: string | null
  git_commit_end?: string | null
  release_notes_markdown: string
  release_notes_structured: {
    added?: string[]
    changed?: string[]
    fixed?: string[]
    security?: string[]
    database?: string[]
    deprecated?: string[]
  }
  validation_results: Record<string, { status: string; message: string;[key: string]: any }>
  requires_db_backup: boolean
  migration_plan?: string | null
}

export interface PendingChangesResponse {
  last_published_version: string
  last_commit?: string | null
  recommended_bump: 'major' | 'minor' | 'patch'
  next_version: string
  total_commits: number
  commits: {
    hash: string
    short_hash: string
    author: string
    date: string
    subject: string
    category: string
    is_breaking: boolean
  }[]
  changed_files_count: number
  changed_files: string[]
  affected_modules: string[]
  structured_notes: {
    added: string[]
    changed: string[]
    fixed: string[]
    security: string[]
    database: string[]
    deprecated: string[]
  }
  migrations: string[]
}

export interface ReleaseAuditLogItem {
  id: number
  action: string
  user_id: number | null
  user_name: string
  severity: string
  details?: string | null
  new_data?: string | null
  created_at: string
}

// ─── Payment Gateway & Online Checkout (Razorpay & UPI) ──────────────────────

export interface PaymentGatewayConfig {
  is_enabled: boolean
  mode: 'test' | 'live'
  razorpay_key_id: string
  razorpay_key_secret_masked: string
  upi_vpa: string
  merchant_name: string
  auto_generate_receipt: boolean
}

export interface OnlineOrderResponse {
  order_id: string
  amount: number
  amount_in_paise: number
  currency: string
  key_id: string
  merchant_name: string
  upi_vpa: string
  upi_uri: string
  upi_qr_svg: string
  invoice_id: number
  invoice_number: string
  installment_id?: number | null
  student_id: number
  student_name: string
  student_admission_number: string
  created_at: string
}

export interface OnlinePaymentVerifyPayload {
  order_id: string
  payment_id: string
  signature: string
  invoice_id: number
  amount: number
  installment_id?: number | null
}

export interface OnlinePaymentVerifyResult {
  status: string
  message: string
  payment_id: number
  receipt_number: string
  receipt_id?: number
  amount: number
  invoice_id: number
  remaining_outstanding: number
  transaction_reference: string
  timestamp: string
}



// ─── Dedicated Teacher & Staff Workforce Dashboards ──────────────────────────

export interface TeacherDashboardMetrics {
  total_teachers: number
  active_teachers: number
  assigned_teachers: number
  unassigned_teachers: number
  teachers_without_timetable: number
  teachers_on_leave: number
  inactive_teachers: number
  departed_teachers: number
  upcoming_joining: number
  pending_session_approvals: number
  monthly_teaching_hours: number
  monthly_payroll_payable: number
  pending_teacher_payments: number
  six_month_teaching_hours_total?: number
}

export interface TeacherWorkforceItem {
  id: number
  profile_id?: number | null
  employee_id?: string | null
  name: string
  first_name: string
  last_name: string
  email: string
  phone: string
  designation: string
  department: string
  employment_type: string
  joining_date?: string | null
  status: string
  is_active_employee: boolean
  is_assigned: boolean
  assignment_count: number
  weekly_hours: number
  has_timetable: boolean
  timetable_slots_count: number
  payment_method: string
  hourly_rate: number
  per_lecture_rate: number
  monthly_fixed_amount: number
  qualification: string
  specialization: string
  is_departed: boolean
  is_upcoming: boolean
  exit_date?: string | null
  exit_reason?: string | null
  rehire_eligible: boolean
}

export interface MonthlyHoursTrendItem {
  month: string
  year: number
  label: string
  hours: number
}

export interface TeacherDashboardData {
  metrics: TeacherDashboardMetrics
  monthly_hours_trend?: MonthlyHoursTrendItem[]
  teachers: TeacherWorkforceItem[]
}

export interface StaffDashboardMetrics {
  total_staff: number
  active_staff: number
  unassigned_staff: number
  staff_on_leave: number
  inactive_staff: number
  departed_staff: number
  upcoming_joining: number
  departments_count: number
  salary_payable?: number
  pending_payments?: number
  department_breakdown?: Record<string, number>
  designation_breakdown?: Record<string, number>
}

export interface StaffWorkforceItem {
  id: number
  profile_id?: number | null
  employee_id?: string | null
  name: string
  first_name: string
  last_name: string
  email: string
  phone: string
  designation: string
  department: string
  employment_type: string
  joining_date?: string | null
  status: string
  is_active_employee: boolean
  is_on_leave: boolean
  qualification: string
  specialization: string
  basic_salary: number
  is_departed: boolean
  is_upcoming: boolean
  exit_date?: string | null
  exit_reason?: string | null
  rehire_eligible: boolean
}

export interface StaffDashboardData {

  metrics: StaffDashboardMetrics

  department_headcounts?: { department: string; count: number }[]

  designation_headcounts?: { designation: string; count: number }[]

  staff: StaffWorkforceItem[]

}

export interface StaffLifecyclePayload {
  action: 'activate' | 'put_on_leave' | 'deactivate' | 'resign' | 'terminate' | 'end_contract' | 'rehire'
  effective_date: string
  reason?: string
  notes?: string
  rehire_eligible?: boolean
}

export interface EmployeeActivityHistoryItem {
  timestamp: string
  category: 'lifecycle' | 'assignment' | 'timetable' | 'attendance' | 'leave' | 'teaching_session' | 'payroll' | 'payment' | 'document'
  event_type: string
  title: string
  details: string
  status: string
  record_id?: number | string
}


// ─── CodeX Engine Entities ───────────────────────────────────────────────────

export interface CodexConfig {
  id: number
  institution_id: number
  is_master_enabled: boolean
  feature_numeric_to_alphabet: boolean
  feature_alphabet_to_numeric: boolean
  feature_custom_alphabet_mapping: boolean
  feature_multiple_mapping_profiles: boolean
  feature_mapping_version_history: boolean
  feature_hide_actual_amount: boolean
  feature_show_actual_amount: boolean
  feature_show_both: boolean
  feature_qr_generation: boolean
  feature_mobile_decoder: boolean
  feature_offline_decoder: boolean
  feature_copy_share_code: boolean
  feature_expiry_codes: boolean
  feature_pin_protected_decoding: boolean
  app_selling_price: boolean
  app_purchase_cost: boolean
  app_salary_payroll: boolean
  app_commission: boolean
  app_discounts: boolean
  app_customer_specific_values: boolean
  app_internal_reference_values: boolean
  app_fee_structures: boolean
  has_security_pin: boolean
  decoder_expiry_seconds: number
  max_decoding_attempts: number
  updated_at?: string | null
}

export interface CodexMappingProfile {
  id: number
  profile_code: string
  name: string
  description?: string | null
  version: number
  digit_map: Record<string, string>
  decimal_symbol: string
  negative_symbol: string
  prefix: string
  suffix: string
  is_active: boolean
  is_default: boolean
  updated_at?: string | null
}

export interface CodexMappingVersion {
  id: number
  version: number
  digit_map: Record<string, string>
  decimal_symbol: string
  negative_symbol: string
  prefix: string
  suffix: string
  change_reason?: string | null
  created_at: string
}

export interface CodexScopeAssignment {
  id: number
  scope_type: 'business' | 'department' | 'role' | 'user'
  scope_target: string
  visibility_mode: 'hidden' | 'coded_only' | 'actual_only' | 'both' | 'disabled'
  allowed_modules: string[]
  can_decode: boolean
  can_generate_qr: boolean
  updated_at?: string | null
}

export interface CodexAuditLogItem {
  id: number
  action: string
  entity_type: string
  entity_id?: string | null
  user_name?: string | null
  status: string
  details?: any
  ip_address?: string | null
  created_at: string
}

export interface CodexConfigResponse {
  config: CodexConfig
  default_profile: {
    id: number
    name: string
    profile_code: string
    version: number
    prefix: string
    digit_map: Record<string, string>
  }
  stats: {
    profiles_count: number
    scopes_count: number
  }
}

// ─── Lead Management & CRM Types ─────────────────────────────────────────────

export interface LeadItem {
  id: number
  lead_number: string
  first_name: string
  last_name: string
  full_name: string
  gender?: string | null
  date_of_birth?: string | null
  phone?: string | null
  email?: string | null
  school_name?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  standard_id?: number | null
  standard_name?: string | null
  board_id?: number | null
  board_name?: string | null
  class_display?: string
  interested_course?: string | null
  academic_year_id?: number | null
  academic_year_name?: string | null
  guardian_name?: string | null
  guardian_relation?: string | null
  guardian_phone?: string | null
  guardian_email?: string | null
  guardian_occupation?: string | null
  stage: string
  priority: string
  source: string
  campaign_name?: string | null
  assigned_to_id?: number | null
  assigned_to_name?: string | null
  enquiry_date?: string | null
  next_follow_up_at?: string | null
  notes?: string | null
  converted_student_id?: number | null
  converted_at?: string | null
  converted_by_id?: number | null
  lost_reason?: string | null
  lost_notes?: string | null
  is_active?: boolean
  created_at?: string | null
  updated_at?: string | null
}

export interface LeadFollowUpItem {
  id: number
  follow_up_type: string
  stage_at_time?: string | null
  status: string
  scheduled_at?: string | null
  completed_at?: string | null
  outcome?: string | null
  remarks?: string | null
  next_follow_up_at?: string | null
  performed_by_name?: string | null
  created_at?: string | null
}

export interface LeadDemoClassItem {
  id: number
  standard_name?: string | null
  subject_name?: string | null
  teacher_name?: string | null
  scheduled_at: string
  status: string
  feedback?: string | null
  rating?: number | null
  created_at?: string | null
}

export interface LeadDossierResponse extends LeadItem {
  follow_ups: LeadFollowUpItem[]
  demo_classes: LeadDemoClassItem[]
  communication_history: Array<{
    id: number
    channel: string
    subject?: string | null
    content: string
    status: string
    sent_at?: string | null
    sender_name?: string | null
  }>
  potential_duplicate_students: Array<{
    id: number
    admission_number: string
    name: string
    phone?: string | null
    email?: string | null
  }>
}

export interface LeadKanbanColumn {
  key: string
  title: string
  count: number
  items: LeadItem[]
}

export interface LeadKanbanResponse {
  columns: Record<string, LeadKanbanColumn>
}

export interface LeadMetricsSummary {
  total_leads: number
  total_leads_trend: string
  new_enquiries: number
  follow_ups_today: number
  overdue_follow_ups: number
  converted: number
  lost_leads: number
  conversion_rate: number
  conversion_rate_trend: string
  pipeline_counts?: Record<string, number>
  sources: Array<{ source: string; count: number }>
  counsellors: Array<{ name: string; leads_count: number }>
}

export interface FollowUpQueueItem {
  id: number
  lead_id: number
  lead_number: string
  lead_name: string
  lead_phone?: string | null
  lead_stage: string
  lead_priority: string
  follow_up_type: string
  stage_at_time?: string | null
  status: string
  scheduled_at?: string | null
  completed_at?: string | null
  outcome?: string | null
  remarks?: string | null
  next_follow_up_at?: string | null
  performed_by_id?: number | null
  counsellor_name?: string | null
  is_overdue: boolean
  created_at?: string | null
}

export interface FollowUpQueueResponse {
  items: FollowUpQueueItem[]
  total: number
  limit: number
  offset: number
  summary: {
    overdue_count: number
    today_count: number
    upcoming_count: number
    completed_count: number
  }
}

export interface DemoClassQueueItem {
  id: number
  lead_id: number
  lead_number: string
  lead_name: string
  lead_phone?: string | null
  lead_stage: string
  standard_id?: number | null
  standard_name?: string | null
  subject_id?: number | null
  subject_name?: string | null
  teacher_id?: number | null
  teacher_name?: string | null
  scheduled_at: string
  status: string
  rating?: number | null
  feedback?: string | null
  created_at?: string | null
}

export interface DemoClassQueueResponse {
  items: DemoClassQueueItem[]
  total: number
  limit: number
  offset: number
  summary: {
    total_count: number
    scheduled_count: number
    attended_count: number
    absent_count: number
    avg_rating: number
  }
}

export interface LeadSourceSummaryItem {
  source: string
  total_leads: number
  converted_leads: number
  lost_leads: number
  active_leads: number
  conversion_rate: number
  share_percentage: number
}

export interface LeadSourcesResponse {
  total_leads: number
  items: LeadSourceSummaryItem[]
}

export interface CampaignSummaryItem {
  campaign_name: string
  total_leads: number
  converted_leads: number
  conversion_rate: number
  latest_enquiry?: string | null
}

export interface CampaignsResponse {
  items: CampaignSummaryItem[]
  total_campaigns: number
}

export interface CrmReportsAnalytics {
  monthly_trajectories: Array<{
    month: string
    new_leads: number
    conversions: number
    conversion_rate: number
  }>
  lost_reasons: Array<{
    reason: string
    count: number
    percentage: number
    cumulative_percentage: number
  }>
  counsellors_matrix: Array<{
    id: number
    name: string
    assigned_leads: number
    follow_ups_logged: number
    conversions: number
    conversion_rate: number
  }>
  stage_funnel: Array<{
    stage: string
    count: number
    label: string
  }>
}

export interface CrmConfigSettings {
  pipeline_stages: Array<{ key: string; label: string; color: string }>
  sla_follow_up_hours: number
  loss_reasons: string[]
  source_channels: string[]
  auto_assign_counsellor: boolean
  notify_on_new_enquiry: boolean
}

// ─── User-Defined Navigation & Intelligent Adaptive Menu Engine ──────────────

export type NavigationMode = 'standard' | 'hybrid' | 'my_menu_only'

export interface CustomNavGroup {
  id: string
  name: string
  items: string[]
}

export interface NavigationPreference {
  navigation_mode: NavigationMode
  pinned_items: string[]
  hidden_items: string[]
  custom_groups: CustomNavGroup[]
  item_order: string[]
  dismissed_suggestions: string[]
  is_customized: boolean
  updated_at?: string | null
}

export interface NavigationPolicy {
  enable_user_customization: boolean
  default_navigation_mode: NavigationMode
  allow_my_menu_only: boolean
  allow_reordering: boolean
  allow_hiding: boolean
  enable_usage_recommendations: boolean
  usage_analysis_period_days: number
  role_default_menus: Record<string, string[]>
}

export interface NavigationSubItem {
  id: string
  label: string
  to: string
  permission?: string | null
}

export interface NavigationModule {
  id: string
  label: string
  category: 'core' | 'academic' | 'students' | 'workforce' | 'finance' | 'learning' | 'operations' | 'admin' | 'tools'
  default_path: string
  icon: string
  required_permission?: string | null
  sysadmin_only: boolean
  sub_items: NavigationSubItem[]
}

export interface NavigationConfigResponse {
  institution_policy: NavigationPolicy
  effective_mode: NavigationMode
  user_preferences: NavigationPreference
  role_defaults: string[]
  authorized_modules: NavigationModule[]
}

export interface NavigationSuggestion {
  id: string
  type: 'pin_frequent' | 'add_recent' | 'hide_rare' | 'discover_new' | 'report_shortcut'
  badge: string
  module_key: string
  title: string
  description: string
  action_type: 'pin' | 'unpin' | 'navigate'
  action_label: string
  route_path: string
}

export interface RecentVisitItem {
  module_key: string
  route_path: string
  label: string
  last_accessed?: string | null
}

// ─── Homework & Assignment System (SSOT) ──────────────────────────────────────

export interface HomeworkAttachment {
  title: string
  file_url: string
  file_type?: string
  file_size_bytes?: number
  file_id?: number
}

export interface HomeworkFileUploadResponse {
  id: number
  title: string
  file_name: string
  file_url: string
  file_type: string
  mime_type?: string
  file_size_bytes: number
}

export interface StudentAssignmentOverride {
  student_id: number
  due_date?: string
  due_time?: string
  instructions?: string
  attachments?: HomeworkAttachment[]
}

export interface HomeworkSummary {
  total_recipients: number
  completed_count: number
  submitted_count: number
  pending_check_count: number
  checked_count: number
  overdue_count: number
  excused_count: number
  completion_percentage: number
}

export interface HomeworkAssignmentItem {
  id: number
  assignment_code: string
  title: string
  assignment_type?: string
  estimated_duration_minutes?: number | null
  description?: string | null
  instructions?: string | null
  chapter?: string | null
  topic?: string | null
  standard_id: number
  standard_name: string
  subject_id: number
  subject_name: string
  division_id?: number | null
  division_name: string
  teaching_session_id?: number | null
  teacher_user_id: number
  teacher_name: string
  assigned_date: string
  due_date: string
  due_time: string
  max_marks?: number | null
  difficulty_level: 'easy' | 'medium' | 'hard'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  submission_method:
  | 'physical_notebook'
  | 'photo_upload'
  | 'pdf_document'
  | 'online_text'
  | 'online_quiz'
  | 'in_class'
  | 'no_submission'
  recipient_type: 'batch' | 'multi_batch' | 'selected_group' | 'selected_students' | 'individual_student' | 'student_group'
  status: 'draft' | 'published' | 'scheduled' | 'closed' | 'archived'
  original_recipient_count?: number
  late_joiner_policy?: 'manual' | 'auto_include' | 'exclude'
  allow_late_submissions?: boolean
  allow_resubmission?: boolean
  published_at?: string | null
  closed_at?: string | null
  is_template?: boolean
  template_name?: string | null
  attachments: HomeworkAttachment[]
  summary: HomeworkSummary
}

export interface HomeworkSubmissionFile {
  file_id?: number
  file_url: string
  file_name?: string
  file_type?: string
  file_size_bytes?: number
}

export interface HomeworkSubmissionVersion {
  version: number
  submitted_at: string
  submission_text?: string | null
  submission_files: HomeworkSubmissionFile[]
  is_late?: boolean
}

export interface CheckingRegisterStudent {
  record_id: number
  student_id: number
  student_name: string
  admission_number: string
  roll_number: string
  photo_url?: string | null
  division_name?: string | null
  status: string
  submission_status: 'pending' | 'submitted' | 'late' | 'not_submitted' | 'excused'
  submission_time?: string | null
  submission_text?: string | null
  submission_files: HomeworkSubmissionFile[]
  submission_version?: number
  submission_history?: HomeworkSubmissionVersion[]
  evaluation_history?: Array<Record<string, any>>
  review_status: 'pending' | 'done' | 'evaluated' | 'incomplete' | 'not_done' | 'absent_not_checked' | 'excused' | 'returned' | 'under_evaluation' | 'checked'
  marks_obtained?: number | null
  teacher_remarks?: string | null
  teacher_feedback_attachments?: HomeworkAttachment[]
  reviewed_at?: string | null
  viewed_at?: string | null
  individual_due_date?: string | null
  custom_instructions?: string | null
  exemption_reason?: string | null
  is_late_addition?: boolean
  addition_reason?: string | null
  resubmission_count: number
}

export interface StudentPortalHomeworkItem {
  record_id: number
  assignment_id: number
  assignment_code: string
  assignment_type?: string
  estimated_duration_minutes?: number | null
  title: string
  description?: string | null
  instructions?: string | null
  custom_instructions?: string | null
  chapter?: string | null
  topic?: string | null
  subject_name: string
  standard_name: string
  teacher_name: string
  submission_method: string
  max_marks?: number | null
  assigned_date?: string
  due_date: string
  due_time: string
  status: string
  submission_status: string
  submission_time?: string | null
  submission_text?: string | null
  submission_files: HomeworkSubmissionFile[]
  submission_version?: number
  submission_history?: HomeworkSubmissionVersion[]
  review_status: string
  marks_obtained?: number | null
  teacher_remarks?: string | null
  teacher_feedback_attachments?: HomeworkAttachment[]
  reviewed_at?: string | null
  viewed_at?: string | null
  exemption_reason?: string | null
  resubmission_count: number
  resubmission_history?: any[]
  attachments: HomeworkAttachment[]
  custom_attachments?: HomeworkAttachment[]
  allow_late_submissions: boolean
  allow_resubmission?: boolean
}

export interface AcademicActivityRegisterItem {
  id?: number | string
  type: string
  activity_type?: string
  timestamp: string
  date: string
  time?: string | null
  title: string
  subject: string
  subject_name?: string
  teacher_name?: string | null
  status: string
  review_status?: string
  marks_obtained?: number | null
  max_marks?: number | null
  score?: string | number | null
  remarks?: string | null
  badge_color?: string
}

export interface TeacherHomeworkDashboard {
  total_assigned: number
  total_assignments: number
  assigned_today: number
  active_assignments: number
  awaiting_check: number
  pending_submissions: number
  submitted_assignments: number
  late_submissions: number
  pending_evaluations: number
  completed_evaluations: number
  overdue_count: number
}

export interface StudentHomeworkDashboard {
  student_id: number
  new_homework: number
  due_today: number
  upcoming_deadlines: number
  overdue_work: number
  submitted_work: number
  evaluated_work: number
  unread_notifications: number
}

export interface HomeworkRecipientPreviewStudent {
  student_id: number
  enrollment_id?: number
  student_name: string
  admission_number: string
  roll_number?: string | null
  division_id?: number | null
  division_name?: string | null
}

export interface HomeworkNotificationItem {
  id: number
  template_code: string
  subject: string
  message: string
  is_read: boolean
  metadata?: Record<string, any>
  created_at?: string | null
}

export interface HomeworkSettingsConfig {
  allowed_extensions: string[]
  max_file_size_mb: number
  custom_assignment_types: string[]
  available_assignment_types: string[]
  default_late_joiner_policy: 'manual' | 'auto_include' | 'exclude'
  reminder_hours_before_due: number
  pending_eval_alert_threshold: number
  allow_parent_portal_view: boolean
}

export interface BatchHomeworkReport {
  assignment_id: number
  assignment_code: string
  title: string
  assignment_type?: string
  due_date: string
  max_marks?: number | null
  original_recipient_count: number
  summary: HomeworkSummary
  rows: Array<{
    record_id: number
    student_id: number
    student_name: string
    admission_number: string
    roll_number: string
    assignment_status: string
    submission_status: string
    submission_date?: string | null
    marks_obtained?: number | null
    max_marks?: number | null
    feedback?: string | null
    review_status: string
    is_late_addition: boolean
    addition_reason?: string | null
    submission_version: number
  }>
}

export interface InstituteHomeworkAnalytics {
  total_assignments: number
  total_records: number
  student_submission_rate_pct: number
  late_submission_rate_pct: number
  evaluation_completion_rate_pct: number
  avg_evaluation_turnaround_hours: number
  subject_wise: Array<{
    subject_id: number
    subject_name: string
    assignments: number
    total_records: number
    submitted: number
    evaluated: number
    submission_rate_pct: number
  }>
  teacher_wise: Array<{
    teacher_user_id: number
    teacher_name: string
    assignments: number
    total_records: number
    evaluated: number
    pending_evaluations: number
  }>
  batch_wise: Array<{
    division_id?: number | null
    division_name: string
    assignments: number
    total_records: number
    completed: number
    completion_rate_pct: number
  }>
}

export interface DailyHomeworkRegisterReport {
  date: string
  total_assignments: number
  items: Array<{
    assignment_code: string
    title: string
    standard: string
    batch: string
    subject: string
    teacher: string
    topic: string
    due_date: string
    submission_method: string
    total_students: number
    completed: number
    pending: number
    completion_rate: string
  }>
}

// ─── Universal Report Intelligence & Calculation Engine Types ────────────────

export interface ReportKPIExplanation {
  formula: string
  latex_formula?: string
  numerator_name: string
  numerator_value: number
  denominator_name?: string | null
  denominator_value?: number | null
  multiplier?: number
  included_count?: number
  excluded_count?: number
  rounding_rule: string
  filter_context: string
  plain_english_breakdown: string
}

export interface ReportKPIItem {
  id: string
  name: string
  value: number | string
  formatted_value: string
  unit: string
  status: 'critical' | 'warning' | 'positive' | 'neutral'
  badge_label?: string
  target?: number | null
  variance?: number | null
  trend?: 'up' | 'down' | 'neutral'
  explanation: ReportKPIExplanation
}

export interface ReportInsightItem {
  id: string
  title: string
  severity: 'critical' | 'warning' | 'positive' | 'info'
  what_happened: string
  why_it_matters: string
  action_required: string
  action_url?: string
  action_label?: string
  metric_key?: string
}

export interface ReportComparisonItem {
  benchmark_name: string
  target: number
  actual: number
  variance: number
}

export interface ReportIntelligencePayload {
  report_id: string
  generated_at: string
  institution_id: number
  filters_applied: Record<string, any>
  kpis: ReportKPIItem[]
  insights: ReportInsightItem[]
  comparisons?: ReportComparisonItem | null
}

export interface CalculationDefinitionItem {
  id: string
  name: string
  category: string
  data_source: string
  formula: string
  latex_formula: string
  numerator: string
  denominator: string | null
  multiplier: number
  target_threshold: number
  warning_threshold: number
  inclusion_rules: string[]
  exclusion_rules: string[]
  rounding_rules: string
  plain_english_template: string
  actionable_guidance: string
}

// ─── Concession, Waiver & Scholarship Financial Governance (SSOT) ─────────────

export interface GovernedFinancials {
  gross_fee_assessed: number
  approved_concessions_total: number
  approved_unapplied: number
  posted_concessions_total: number
  posted_fee_concessions: number
  posted_fee_waivers: number
  full_fee_waivers: number
  partial_fee_waivers: number
  scholarships_awarded: number
  academy_scholarships: number
  sponsor_funded_scholarships: number
  manual_fee_adjustments: number
  total_posted_reductions: number
  net_fee_due: number
  total_collections: number
  gross_payment_receipts: number
  refunds_completed: number
  refunds_pending: number
  net_collections: number
  total_outstanding: number
  written_off_amount: number
  collection_percentage: number
  credit_adjustments: number
  reversals_total: number
  reversed_payments_amount: number
  reversed_concessions_amount: number
  pending_payments_amount: number
}

export interface FinancialGovernanceSummary {
  currency: { code: string; symbol: string; precision: number }
  counts: {
    invoices: number
    billed_students: number
    beneficiary_students: number
    valid_payments: number
    pending_payments: number
    reversed_payments: number
    pending_approvals: number
    rejected_applications: number
    expired_benefits: number
    cancelled_benefits: number
    reversed_benefits: number
    completed_refunds: number
    pending_refunds: number
  }
  financials: GovernedFinancials
  lifecycle: {
    requested: number
    pending_approval: number
    approved: number
    posted: number
    utilized: number
    remaining_approved: number
    rejected: number
    expired: number
    reversed: number
    cancelled: number
  }
  sponsors: {
    total_sanctioned: number
    total_posted: number
    total_received: number
    outstanding_sponsor_funding: number
    settlement_rate: number
  }
  admission_breakdown: {
    admission_concessions: number
    promotional_offers: number
    sibling_discounts: number
    new_admission_scholarships: number
  }
  fee_management_breakdown?: FeeManagementConcessionBreakdown
  academic_distribution?: AcademicConcessionDistribution
}

export interface FeeManagementConcessionBreakdown {
  currency: { code: string; symbol: string; precision: number }
  student_wise: Array<{
    application_id: number
    application_number: string
    student_id: number
    student_name: string
    admission_number: string
    concession_name: string
    benefit_type: string
    waiver_scope?: string | null
    funding_source: string
    sponsor_name?: string | null
    status: string
    gross_fee: number
    approved_amount: number
    posted_amount: number
    remaining_benefit: number
    reversed_amount: number
    net_fee_due: number
    paid_amount: number
    outstanding: number
    valid_until?: string | null
  }>
  fee_head_wise: Array<{ fee_category: string; applications_count: number; posted_amount: number }>
  installment_wise: Array<{
    installment_id: number
    installment_number: number
    description: string
    invoice_number: string
    student_name: string
    amount: number
    paid_amount: number
    status: string
    due_date: string
  }>
}

export interface AcademicConcessionDistribution {
  currency: { code: string; symbol: string; precision: number }
  class_wise: Array<{
    standard_id: number | null
    class_name: string
    total_students: number
    beneficiary_students: number
    gross_fee: number
    total_concessions: number
    scholarships: number
    fee_waivers: number
    avg_concession: number
    net_fee: number
  }>
  division_wise: Array<{
    division_id: number | null
    division_name: string
    class_name: string
    total_students: number
    beneficiary_students: number
    gross_fee: number
    total_concessions: number
    scholarships: number
    fee_waivers: number
    avg_concession: number
    net_fee: number
  }>
}

export interface ReconciliationAuditResponse {
  currency: { code: string; symbol: string; precision: number }
  is_reconciled: boolean
  ledger_audit: {
    gross_fee_assessed: number
    approved_concessions_total: number
    approved_unapplied: number
    posted_fee_concessions: number
    posted_fee_waivers: number
    scholarships_awarded: number
    sponsor_funded_scholarships: number
    manual_fee_adjustments: number
    total_posted_reductions: number
    net_fee_due: number
    invoice_paid: number
    valid_payment_receipts: number
    payment_allocations_sum: number
    reversed_allocations_excluded: number
    refunds_completed: number
    net_collections: number
    reversed_payments_amount: number
    reversed_concessions_amount: number
    credit_adjustments: number
    outstanding_due: number
    expected_net_fee_due: number
    expected_outstanding: number
    net_formula_variance: number
    outstanding_formula_variance: number
    collection_allocation_variance: number
    broken_invoices_count: number
    is_reconciled: boolean
  }
  broken_invoices: Array<{ invoice_id: number; invoice_number: string; issue: string }>
  sponsors: FinancialGovernanceSummary['sponsors']
  summary: FinancialGovernanceSummary['financials']
  lifecycle: FinancialGovernanceSummary['lifecycle']
}

export interface TransactionTraceResponse {
  entity_type: 'application' | 'allocation' | 'invoice' | 'student'
  entity_id: number
  student?: { id: number; admission_number: string; name: string }
  invoice?: {
    id: number
    invoice_number: string
    gross_fee: number
    discount_amount: number
    net_amount: number
    paid_amount: number
    outstanding_amount: number
    status: string
  } | null
  applications?: Array<{
    id: number
    application_number: string
    benefit_type: string
    waiver_scope?: string | null
    funding_source: string
    sponsor_name?: string | null
    sponsor_settlement_status?: string | null
    requested_amount: number
    approved_amount: number
    applied_amount: number
    reversed_amount: number
    status: string
    valid_until?: string | null
    approved_at?: string | null
    approval_remarks?: string | null
    cancellation_reason?: string | null
  }>
  allocations?: Array<{
    id: number
    transaction_ref?: string | null
    transaction_type: string
    posting_status: string
    allocated_amount: number
    credit_adjustment_amount: number
    effective_date?: string | null
    reversal_of_allocation_id?: number | null
    reversal_reason?: string | null
    notes?: string | null
  }>
  audit_history: Array<{
    id: number
    action: string
    actor: string
    details?: string | null
    severity: string
    created_at: string | null
  }>
}

export interface ConcessionReportItemMeta {
  id: string
  title: string
  category: string
}

export interface ConcessionReportResponse {
  report_id: string
  title: string
  category: string
  generated_at: string
  reporting_period: { start_date: string | null; end_date: string | null }
  currency: { code: string; symbol: string; precision: number }
  summary: Record<string, number>
  columns: Array<{ key: string; label: string; type?: 'currency' | 'number' | 'percent' | 'text' | 'trace' }>
  rows: Array<Record<string, any>>
}

// ─── Housekeeping & Database Operations Module ──────────────────────────────

export interface HousekeepingBackupItem {
  filename: string
  source: 'backups' | 'legacy_data'
  format: 'edu_zip' | 'custom_dump' | 'plain_sql'
  size_bytes: number
  size_human: string
  created_at: string
  label: string
  created_by: string
  database: string
  sha256: string | null
  has_checksum: boolean
  verified: boolean
  verified_at: string | null
  notes: string | null
}

export interface HousekeepingPolicy {
  backup_frequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | string
  backup_time: string
  backup_format: 'edu' | 'edu_sql' | 'custom' | 'plain_sql' | string
  backup_destination: string
  offsite_mirror_path: string
  retain_daily: number
  retain_weekly: number
  retain_monthly: number
  auto_vacuum_enabled: boolean
  log_retention_days: number
  alert_enabled?: boolean
  alert_email?: string
  alert_max_backup_age_hours?: number
  alert_min_free_disk_percent?: number
  dead_tuple_alert_threshold?: number
  archive_before_purge?: boolean
  last_backup_date?: string | null
  last_backup_file?: string | null
  last_backup_status?: string
  last_backup_sha256?: string | null
  last_vacuum_at?: string | null
}

export interface HousekeepingTableMetric {
  table_name: string
  live_rows: number
  dead_tuples: number
  total_bytes: number
  size_pretty: string
  last_vacuum: string | null
  last_analyze: string | null
}

export interface HousekeepingOverview {
  database: {
    name: string
    host: string
    size_bytes: number
    size_pretty: string
    total_connections: number
    active_connections: number
    dead_tuples_top15: number
  }
  backups_summary: {
    total_count: number
    verified_count: number
    total_size_bytes: number
    total_size_human: string
    last_backup_date: string | null
    last_backup_file: string | null
    backup_status: string
  }
  top_tables: HousekeepingTableMetric[]
  policy: HousekeepingPolicy
  storage?: HousekeepingStorageTelemetry
  alerts_summary?: HousekeepingAlertsSummary
  scheduler_commands: {
    windows_task_scheduler: string
    linux_cron: string
  }
}

export interface HousekeepingCreateBackupResponse {
  filename: string
  source: string
  format: string
  size_bytes: number
  sha256: string
  verified: boolean
  toc_entries: number
  created_at: string
  mirror_copied: string | null
}

export interface HousekeepingVerifyResponse {
  filename: string
  source: string
  verified: boolean
  checksum_match: boolean
  format_valid: boolean
  sha256: string
  recorded_sha256: string | null
  toc_entries: number
  detail: string
  verified_at: string
}

export interface HousekeepingPruneResponse {
  deleted: string[]
  kept_count: number
  freed_bytes: number
}

export interface HousekeepingDrillResponse {
  sandbox_db: string
  filename: string
  tables_restored: number
  students_restored: number
  is_reconciled: boolean
  variance: number
  verified_at: string
}

export interface HousekeepingRestoreResponse {
  restored_from: string
  source: string
  safety_snapshot: string
  is_reconciled: boolean
  variance: number
  broken_invoices: number
  restored_at: string
}

export interface HousekeepingVacuumResponse {
  status: string
  command: string
  executed_at: string
}

export interface HousekeepingReconciliationResult {
  currency: { code: string; symbol: string; precision: number }
  is_reconciled: boolean
  ledger_audit: {
    gross_assessed: number
    posted_reductions: number
    tracked_benefits: number
    manual_adjustments: number
    total_invoiced: number
    net_invoiced: number
    total_collected: number
    net_payment_cashflow: number
    total_outstanding: number
    written_off: number
    calculated_balance: number
    variance: number
    payment_vs_invoice_variance: number
    reversed_allocation_excluded: number
    is_reconciled: boolean
  }
  broken_invoices: Array<{
    invoice_id: number
    invoice_number: string
    student_id: number
    student_name: string
    admission_number: string
    total_amount: number
    discount_amount: number
    net_amount: number
    paid_amount: number
    outstanding_amount: number
  }>
}

export interface HousekeepingHistoryEvent {
  timestamp: string
  action: string
  status: string
  actor?: string
  filename?: string
  source?: string
  details?: string
  [key: string]: any
}

export interface HousekeepingStorageTelemetry {
  disk: {
    path: string
    total_bytes: number
    used_bytes: number
    free_bytes: number
    free_percent: number
    used_percent: number
    total_human: string
    free_human: string
  }
  breakdown: {
    edu_bytes: number
    edu_count: number
    raw_dump_sql_bytes: number
    raw_dump_sql_count: number
    legacy_bytes: number
    legacy_count: number
    log_archive_bytes: number
    log_archive_count: number
    orphan_bytes: number
    orphan_count: number
  }
  orphan_files: Array<{
    filename: string
    size_bytes: number
    kind: string
  }>
  log_archives: Array<{
    filename: string
    size_bytes: number
    size_human: string
    created_at: string
    sha256: string | null
  }>
}

export interface HousekeepingCleanOrphansResponse {
  deleted: string[]
  freed_bytes: number
}

export interface HousekeepingLogCleanupPreview {
  retention_days: number
  cutoff_at: string
  total_eligible: number
  categories: Array<{
    category: string
    label: string
    eligible_count: number
  }>
  protected_guarantee: string
}

export interface HousekeepingLogCleanupExecuteResponse {
  retention_days: number
  cutoff_at: string
  total_purged: number
  purged_by_category: Record<string, number>
  archived_files: Array<{
    category: string
    filename: string
    row_count: number
    size_bytes: number
    sha256: string
  }>
}

export interface HousekeepingAlertItem {
  id: string
  severity: 'critical' | 'warning' | 'info' | string
  title: string
  detail: string
  recommended_tab: string
}

export interface HousekeepingAlertsSummary {
  health_status: 'healthy' | 'warning' | 'critical' | string
  critical_count: number
  warning_count: number
  total_alerts: number
  evaluated_at: string
  items: HousekeepingAlertItem[]
}

export interface HousekeepingAlertNotifyResponse {
  dispatched: boolean
  status: string
  recipient: string
  reference: string | null
  health_status: string
  alert_count: number
}

// ─── Help & About Centre Types ────────────────────────────────────────────────

export type HelpSectionKey =
  | 'getting_started'
  | 'module_guide'
  | 'tutorial'
  | 'faq'
  | 'legal'

export interface HelpCategory {
  id: number
  slug: string
  name: string
  section: HelpSectionKey
  description?: string | null
  icon?: string | null
  sort_order: number
  is_active: boolean
  article_count?: number | null
}

export interface HelpArticleSummary {
  id: number
  slug: string
  category_id?: number | null
  category_slug?: string | null
  category_name?: string | null
  section: HelpSectionKey
  module_key?: string | null
  title: string
  summary?: string | null
  tags: string[]
  required_permissions: string[]
  related_routes: string[]
  related_slugs: string[]
  doc_version: string
  status: 'draft' | 'pending_approval' | 'published' | 'unpublished'
  approval_status: 'approved' | 'pending_approval'
  approved_at?: string | null
  published_at?: string | null
  is_system: boolean
  sort_order: number
  updated_at?: string | null
}

export interface HelpArticleDetail extends HelpArticleSummary {
  content_markdown: string
  related_articles?: HelpArticleSummary[]
}

export interface HelpArticleRevision {
  id: number
  article_id: number
  doc_version: string
  title: string
  summary?: string | null
  status: string
  approval_status: string
  change_note?: string | null
  changed_by_name?: string | null
  created_at?: string | null
}

export interface HelpSearchResultItem {
  type: 'article' | 'portal'
  slug: string
  section: string
  title: string
  summary?: string | null
  route: string
  tags: string[]
  category_name?: string | null
  approval_status?: string
  status?: string
}

export interface HelpSearchResponse {
  query: string
  total: number
  results: HelpSearchResultItem[]
  suggestions: string[]
}

export interface ContextualHelpResolution {
  route_path: string
  module_key: string
  article: HelpArticleDetail | null
  help_route: string
}

export interface HelpModuleSummary {
  key: string
  name: string
  guide_slug: string
  route: string
}

export interface HelpProductAndVersionResponse {
  about_product: {
    product_name: string
    product_category: string
    edition: string
    introduction: string
    vision: string
    mission: string
    vision_mission_status: string
    philosophy: string[]
    core_capabilities: string[]
    available_modules: HelpModuleSummary[]
    target_institutions: string[]
    supported_deployment_models: string[]
    editions: Array<{ name: string; status: string; description: string }>
  }
  about_company: {
    developer_owner_label: string
    smriti_systems: {
      company_name: string
      introduction: string
      technology_profile: string
      official_website?: string | null
      registered_office?: string | null
      leadership_note?: string | null
      verification_status: string
    }
    aitdl: {
      company_name: string
      product_architect: string
      introduction: string
      official_website: string
      product_website: string
      support_phones: string[]
      support_email: string
      general_email: string
      copyright_notice: string
      product_portfolio: Array<{
        name: string
        tagline: string
        website: string
        description: string
      }>
    }
    subscribing_institution: {
      name: string
      code?: string | null
      identity_separation_notice: string
    }
  }
  version_info: {
    product_name: string
    product_edition: string
    version_number: string
    build_number: string
    release_date: string
    release_channel: string
    release_status: string
    license_status: string
    license_validity?: string | null
    license_verification_status: string
    deployment_type: string
    available_modules_count: number
    available_modules: HelpModuleSummary[]
    latest_update: {
      version: string
      title: string
      published_at: string
      notes_markdown: string
    }
  }
}

export interface HelpSystemInfoResponse {
  checked_at: string
  application_health: {
    status: string
    api_service: string
    security_governance: string
  }
  database_connectivity: {
    status: string
    engine: string
    latency_ms?: number | null
  }
  module_availability: Array<{
    module_key: string
    name: string
    status: string
    guide_slug: string
  }>
  integration_status: Array<{
    name: string
    provider: string
    status: string
  }>
  last_successful_backup: {
    status: string
    last_backup_at?: string | null
    verified: boolean
    total_snapshots: number
    frequency: string
  }
  latest_update_information: {
    version: string
    title: string
    published_at: string
    notes_markdown: string
  }
  deployment_information: {
    product_name: string
    edition: string
    version: string
    build_number: string
    release_channel: string
    deployment_type: string
  }
}

export type SupportRequestType = 'support_request' | 'bug_report' | 'feature_request' | 'feedback'
export type SupportRequestStatus = 'open' | 'in_progress' | 'waiting_on_customer' | 'resolved' | 'closed'

export interface SupportRequestComment {
  id: number
  request_id: number
  author_id?: number | null
  author_name: string
  author_role: string
  message: string
  is_internal_note: boolean
  created_at?: string | null
}

export interface SupportRequestItem {
  id: number
  ticket_number: string
  institution_id: number
  user_id: number
  requester_name?: string | null
  requester_role?: string | null
  request_type: SupportRequestType
  category: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  subject: string
  description: string
  module_key?: string | null
  page_route?: string | null
  error_reference_id?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  status: SupportRequestStatus
  resolution_notes?: string | null
  assigned_to_id?: number | null
  assigned_to_name?: string | null
  resolved_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  comments: SupportRequestComment[]
}

// ─── PrathamOne EduBoard (Digital Classroom Engine) ──────────────────────────

export type EduBoardMode = 'classic' | 'whiteboard' | 'presentation'
export type EduBoardBackgroundStyle = 'blackboard' | 'greenboard' | 'white' | 'grid' | 'notebook' | 'pdf_slide'
export type EduBoardStatus = 'draft' | 'active' | 'published' | 'closed' | 'archived'
export type EduBoardTool =
  | 'select'
  | 'pen'
  | 'marker'
  | 'chalk'
  | 'highlighter'
  | 'eraser'
  | 'line'
  | 'arrow'
  | 'rect'
  | 'circle'
  | 'text'
  | 'image'

export interface EduBoardSceneElement {
  id: string
  type: 'stroke' | 'line' | 'arrow' | 'rect' | 'circle' | 'text' | 'image'
  tool?: string
  points?: number[]
  pressures?: number[]
  x?: number
  y?: number
  width?: number
  height?: number
  text?: string
  fontSize?: number
  color?: string
  fill?: string
  size?: number
  opacity?: number
  attachmentId?: number
  src?: string
}

export interface EduBoardScenePayload {
  schemaVersion: number
  elements: EduBoardSceneElement[]
}

export interface EduBoardPageItem {
  id?: number
  page_uid: string
  page_order: number
  title: string
  mode: EduBoardMode
  background_style: EduBoardBackgroundStyle
  source_attachment_id?: number | null
  source_page_number?: number | null
  scene_json: string | EduBoardScenePayload
  version: number
  updated_at?: string | null
}

export interface EduBoardAttachmentItem {
  id: number
  attachment_role: string
  original_filename: string
  mime_type: string
  extension: string
  file_size_bytes: number
  page_count?: number | null
  is_immutable: boolean
  created_at?: string | null
}

export interface EduBoardSummaryItem {
  id: number
  board_code: string
  institution_id: number
  is_demo: boolean
  academic_year_id?: number | null
  academic_year_name?: string | null
  teaching_session_id?: number | null
  session_code?: string | null
  session_date?: string | null
  timetable_entry_id?: number | null
  teacher_user_id: number
  teacher_name?: string | null
  standard_id?: number | null
  standard_name?: string | null
  division_id?: number | null
  division_name?: string | null
  subject_id?: number | null
  subject_name?: string | null
  subject_mapping_id?: number | null
  title: string
  topic?: string | null
  board_mode_default: EduBoardMode
  status: EduBoardStatus
  is_template: boolean
  template_category?: string | null
  collaboration_enabled: boolean
  published_at?: string | null
  latest_revision_no: number
  page_count: number
  created_at?: string | null
  updated_at?: string | null
}

export interface EduBoardDetailItem extends EduBoardSummaryItem {
  pages: EduBoardPageItem[]
  attachments: EduBoardAttachmentItem[]
  read_only?: boolean
}

export interface EduBoardRevisionItem {
  id: number
  revision_no: number
  save_type: 'autosave' | 'manual' | 'publish' | 'restore'
  note?: string | null
  created_by_id: number
  created_at?: string | null
}

export interface EduBoardContextResponse {
  academic_years: Array<{ id: number; name: string; is_current: boolean }>
  divisions: Array<{
    id: number
    name: string
    code?: string | null
    standard_id: number
    standard_name?: string | null
  }>
  subjects: Array<{ id: number; name: string; code?: string | null; standard_id?: number | null }>
  teaching_sessions: Array<{
    id: number
    session_code: string
    session_date: string
    division_id?: number | null
    subject_id?: number | null
    teacher_user_id: number
    topic_taught?: string | null
    timetable_entry_id?: number | null
  }>
  templates: Array<{
    id: number
    title: string
    template_category?: string | null
    board_mode_default: EduBoardMode
    page_count: number
  }>
}

export type EduBoardWorkspaceMode = 'standard' | 'focus' | 'fullscreen'
export type EduBoardToolbarState = 'expanded' | 'compact' | 'hidden'
export type EduBoardToolbarPosition = 'top' | 'left' | 'right' | 'bottom' | 'floating'
export type EduBoardPopoutMode = 'teacher_edit' | 'presentation' | 'collaborator'

export interface EduBoardDisplayPrefsValues {
  default_workspace_mode: EduBoardWorkspaceMode
  default_board_appearance: EduBoardBackgroundStyle
  toolbar_state: EduBoardToolbarState
  toolbar_position: EduBoardToolbarPosition
  pages_panel_open: boolean
  saved_boards_panel_open: boolean
  hide_app_header: boolean
  hide_status_bar: boolean
}

export interface EduBoardPreferencesResponse {
  system_defaults: EduBoardDisplayPrefsValues
  institution_defaults: EduBoardDisplayPrefsValues
  user_overrides: Partial<EduBoardDisplayPrefsValues>
  effective: EduBoardDisplayPrefsValues
  allow_user_display_overrides: boolean
  allow_collaborator_mode: boolean
  allow_popout_window: boolean
  locked_by_institution: boolean
}

export interface EduBoardPopoutLaunchResponse {
  launch_token: string
  expires_in_seconds: number
  launch_url: string
  mode: EduBoardPopoutMode
  board_id: number
}

export interface EduBoardPopoutResolveResponse {
  board: EduBoardDetailItem
  effective_mode: EduBoardPopoutMode
  institution_name: string
  teacher_name: string
  permissions: {
    can_edit: boolean
    can_publish: boolean
    can_download: boolean
  }
  ui_config: {
    surface?: EduBoardBackgroundStyle | null
    compact_tools: boolean
    show_branding: boolean
    hide_toolbar: boolean
  }
  ws_token: string
}

export interface EduBoardSettingsConfig {
  max_file_size_mb: number
  allowed_extensions: string[]
  autosave_interval_ms: number
  pptx_conversion_enabled: boolean
  default_board_mode: EduBoardMode
  notify_students_on_publish: boolean
  default_workspace_mode?: EduBoardWorkspaceMode
  default_board_appearance?: EduBoardBackgroundStyle
  toolbar_state?: EduBoardToolbarState
  toolbar_position?: EduBoardToolbarPosition
  pages_panel_open?: boolean
  saved_boards_panel_open?: boolean
  hide_app_header?: boolean
  hide_status_bar?: boolean
  allow_user_display_overrides?: boolean
  allow_collaborator_mode?: boolean
  allow_popout_window?: boolean
}

export interface EduBoardReportsSummary {
  total_boards: number
  published_boards: number
  draft_boards: number
  total_pages: number
  total_pdf_attachments: number
  templates_count: number
  mode_breakdown: Record<string, number>
  recent_boards: Array<{
    id: number
    board_code: string
    title: string
    status: string
    mode: string
    page_count: number
    updated_at?: string | null
  }>
}


