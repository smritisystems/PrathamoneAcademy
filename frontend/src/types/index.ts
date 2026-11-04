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
 * @updated     2026-11-04
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
}

export interface Institution {
  id: number
  name: string
  code: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  phone?: string
  email?: string
  website?: string
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
}

export interface Student {
  id: number
  admission_number: string
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
  status: string
  notes?: string
  receipt_number?: string
  allocations?: PaymentAllocation[]
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
  allocations?: { invoice_id: number; amount: number }[]
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

export interface PaymentReceiptListItem {
  id: number
  receipt_number: string
  payment_id: number
  student_id: number
  student_name: string
  admission_number: string
  board_name: string
  standard_name: string
  batch_name: string
  amount: number
  payment_date: string
  payment_method: string
  status: 'valid' | 'voided'
  is_voided: boolean
  generated_at?: string
  details?: Record<string, any>
}

export interface PaymentTransactionItem {
  id: number
  student_id: number
  student_name: string
  admission_number: string
  board_name: string
  standard_name: string
  batch_name: string
  amount: number
  payment_date: string
  payment_method: string
  transaction_reference: string
  status: string
  notes: string
  receipt_number: string
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
