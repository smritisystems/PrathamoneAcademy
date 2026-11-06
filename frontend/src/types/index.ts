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
 * @updated     2026-11-06
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
  collected: number
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
  amount: number
  payment_date: string
  payment_method: string
  status: string
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
    total_obligation: number
    total_collected: number
    total_outstanding: number
    collection_rate: number
    student_count: number
  }
  board_breakdown: BoardBreakdown[]
  batch_breakdown: BatchBreakdown[]
  monthly_trends: MonthlyTrend[]
  recent_payments: RecentPayment[]
  payment_methods?: PaymentMethodDistribution[]
  top_overdue?: TopOverdueAccount[]
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

export interface DashboardStats {
  total_students: number
  total_fees: number
  total_collected: number
  total_outstanding: number
  collection_rate: number
  monthly_trends: MonthlyTrend[]
  recent_payments: RecentPayment[]
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
  title: string
  description?: string
  file_type: string
  file_url: string
  file_size_bytes: number
  subject_id: number
  subject_name: string
  standard_name: string
  created_at: string
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
      total_paid: number
      outstanding: number
      collection_rate: number
    }
    invoices: FeeInvoice[]
    payments: Payment[]
  }
  documents: StudentDocumentItem[]
  activity: {
    id: string
    type: string
    action: string
    description: string
    timestamp: string
  }[]
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
  assignments: Array<{
    id: number
    board: string
    standard: string
    batch: string
    subject: string
    weekly_hours: number
    is_class_teacher: boolean
    notes?: string
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
  validation_results: Record<string, { status: string; message: string; [key: string]: any }>
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

