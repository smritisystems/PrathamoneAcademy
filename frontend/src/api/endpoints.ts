/**
 * @file        endpoints.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.api
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-03
 * @updated     2026-11-10
 *
 * @description Centralized API client functions mapping all backend endpoints for academic, fees, and students.
 */

import apiClient from './client'
import type {
  PaymentPermissions,
  Institution, AcademicYear, Board, Standard, Division,
  Student, FeeCategory, FeeStructure, FeeInvoice,
  FeeInstallment, Payment, Receipt, DashboardStats, OutstandingDrilldownResponse, DashboardAnalyticsData,
  FeeCollectionRow, OutstandingRow, PaginatedResponse, User,
  FeeRegisterPreviewResponse, FeeRegisterImportExecutionResponse, FeeRegisterImportLog,
  StudentPortalDashboard, StudentAdminProfile, TimetableSlot, StudyMaterialItem, StudyMaterialStats,
  StudentDocumentItem, TestResultItem, UpcomingTestItem,
  FeeOverviewData, FeeRegisterEntry, PaymentReceiptListItem, PaymentTransactionItem,
  FormerStudentRecoveryResponse,
  AcademicOverviewResponse, BatchRosterResponse,
  SupportedEntity, ImportPreviewResponse, ImportExecuteResult, ImportHistoryItem,
  ImportHistoryDetail, ExportFilterParams,
  UserManagementStats, UserListItem, UserListResponse, UserProfileWorkspaceData,
  UserCreatePayload, UserUpdatePayload,
  AcademicSubject, CanonicalSubject, SubjectMappingItem, SubjectDuplicateCheckResult, AcademicTimetableEntry, EnrollmentRecord, EnrollmentStats,
  UnassignedStudent, BatchCapacityReportRow, AcademicDistributionReportRow, FacultyLoadReportRow,
  StaffMember, StaffProfileDetail, TeacherAssignmentItem, StaffAttendanceItem,
  StaffDailyAttendanceResponse, StaffLeaveItem, StaffDocumentTemplate, StaffDocumentRenderResponse,
  SysAdminOverview, SecurityAuditLogItem, SecurityAuditLogsResponse, UniversalEditPayload, SystemSettings,
  InstituteProfile, LookupItem, LookupsResponse, SettingAuditLogItem, AllSettingsState,
  MessageTemplateItem, CommunicationLogItem, CommunicationLogsResponse,
  ShareDocumentPayload, ShareDocumentResponse, RecipientItem, SendMessagePayload, ChannelDiagnostics, AutomationRules, FeeReminderQueueItem, StudentIdCardData, ScanCheckinResult,
  ExamMarksSheet, ExamAnalyticsData, StudentReportCardData,
  StudentExitPayload, StudentReactivatePayload, StudentLifecycleHistoryResponse,
  WithdrawalReportItem, WithdrawalAnalyticsResponse,
  SystemReleaseCurrent, SystemReleaseListItem, SystemReleaseDetail,
  PendingChangesResponse, ReleaseAuditLogItem,
  PaymentWorkflowConfig, RefundRecord, PaymentAuditLog,
  PaymentGatewayConfig, OnlineOrderResponse, OnlinePaymentVerifyPayload, OnlinePaymentVerifyResult,
  NavigationConfigResponse, NavigationSuggestion, RecentVisitItem, NavigationPolicy, NavigationPreference,
  TeacherDashboardData, StaffDashboardData, StaffLifecyclePayload, EmployeeActivityHistoryItem,
  CodexConfig, CodexMappingProfile, CodexMappingVersion, CodexScopeAssignment, CodexAuditLogItem, CodexConfigResponse,
  LeadItem, LeadFollowUpItem, LeadDemoClassItem, LeadDossierResponse, LeadKanbanResponse, LeadMetricsSummary,
  FollowUpQueueItem, FollowUpQueueResponse, DemoClassQueueItem, DemoClassQueueResponse,
  LeadSourceSummaryItem, LeadSourcesResponse, CampaignSummaryItem, CampaignsResponse,
  CrmReportsAnalytics, CrmConfigSettings,
} from '../types'
import type { FormCatalogItem, RenderedFormPayload, FormAuditLogItem } from '../types/forms'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (username: string, password: string) => {
    const form = new FormData()
    form.append('username', username)
    form.append('password', password)
    return apiClient.post<{
      access_token: string
      token_type: string
      user: User
    }>('/auth/login', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  getStats: (params?: {
    academic_year_id?: number | string
    institution_id?: number | string
    board_id?: number | string
    standard_id?: number | string
    division_id?: number | string
    status?: string
    include_all_statuses?: boolean
  }) => apiClient.get<DashboardStats>('/dashboard/stats', { params }),
  getOutstandingDrilldown: (params?: {
    academic_year_id?: number | string
    institution_id?: number | string
    board_id?: number | string
    standard_id?: number | string
    division_id?: number | string
    status?: string
    aging_bucket?: string
    is_overdue?: boolean
    search?: string
    limit?: number
    offset?: number
  }) => apiClient.get<OutstandingDrilldownResponse>('/dashboard/outstanding-drilldown', { params }),
  getReconciliation: (params?: {
    academic_year_id?: number | string
    institution_id?: number | string
  }) => apiClient.get<any[]>('/dashboard/reconciliation', { params }),
  getAnalytics: (params?: {
    academic_year_id?: number | string
    institution_id?: number | string
    board_id?: number | string
    standard_id?: number | string
    division_id?: number | string
  }) => apiClient.get<DashboardAnalyticsData>('/dashboard/analytics', { params }),
}

// ─── Institutions ─────────────────────────────────────────────────────────────

export const institutionsApi = {
  list: () => apiClient.get<Institution[]>('/institutions/'),
  getPublicBranding: () => apiClient.get<Institution>('/institutions/public/branding'),
  get: (id: number | string) => apiClient.get<Institution>(`/institutions/${id}`),
  create: (data: Partial<Institution>) => apiClient.post<Institution>('/institutions/', data),
  update: (id: number | string, data: Partial<Institution>) =>
    apiClient.put<Institution>(`/institutions/${id}`, data),
}

// ─── Academic Years ───────────────────────────────────────────────────────────

export const academicYearsApi = {
  list: (institution_id?: number | string) =>
    apiClient.get<AcademicYear[]>('/academic-years/', { params: { institution_id } }),
  get: (id: number | string) => apiClient.get<AcademicYear>(`/academic-years/${id}`),
  create: (data: Partial<AcademicYear> & { institution_id: number | string }) =>
    apiClient.post<AcademicYear>('/academic-years/', data),
}

// ─── Boards ───────────────────────────────────────────────────────────────────

export const boardsApi = {
  list: (institution_id?: number | string) =>
    apiClient.get<Board[]>('/boards/', { params: { institution_id } }),
  get: (id: number | string) => apiClient.get<Board>(`/boards/${id}`),
  create: (data: { institution_id: number | string; name: string; code: string; description?: string }) =>
    apiClient.post<Board>('/boards/', data),
  update: (id: number | string, data: Partial<Board>) =>
    apiClient.put<Board>(`/boards/${id}`, data),
  toggleStatus: (id: number | string) =>
    apiClient.put<{ id: number; is_active: boolean; message: string }>(`/boards/${id}/toggle-status`),
  delete: (id: number | string) =>
    apiClient.delete<{ message: string; id: number }>(`/boards/${id}`),
}

// ─── Standards ────────────────────────────────────────────────────────────────

export const standardsApi = {
  list: (params?: { institution_id?: number | string; board_id?: number | string } | number | string, board_id?: number | string) => {
    const queryParams = typeof params === 'object' && params !== null
      ? params
      : { institution_id: params, board_id }
    return apiClient.get<Standard[]>('/standards/', { params: queryParams })
  },
  get: (id: number | string) => apiClient.get<Standard>(`/standards/${id}`),
  create: (data: Partial<Standard> & { institution_id: number | string; level?: number; order_number?: number; name: string }) =>
    apiClient.post<Standard>('/standards/', data),
  update: (id: number | string, data: Partial<Standard>) =>
    apiClient.put<Standard>(`/standards/${id}`, data),
  delete: (id: number | string) =>
    apiClient.delete<{ message: string; id: number }>(`/standards/${id}`),
  getOverview: (params?: { institution_id?: number | string; academic_year_id?: number | string }) =>
    apiClient.get<AcademicOverviewResponse>('/standards/academic-overview', { params }),
  getSettings: () =>
    apiClient.get<{
      defaultBatchCapacity: number
      enforceCapacityStrict: boolean
      preventTimetableConflicts: boolean
      academicYearName: string
      autoRollNumberFormat: string
    }>('/standards/academic-settings'),
  updateSettings: (data: {
    defaultBatchCapacity: number
    enforceCapacityStrict: boolean
    preventTimetableConflicts: boolean
    academicYearName: string
    autoRollNumberFormat: string
  }) =>
    apiClient.put<{
      settings: {
        defaultBatchCapacity: number
        enforceCapacityStrict: boolean
        preventTimetableConflicts: boolean
        academicYearName: string
        autoRollNumberFormat: string
      }
      message: string
    }>('/standards/academic-settings', data),
}

// ─── Subjects ─────────────────────────────────────────────────────────────────

export const subjectsApi = {
  list: (params?: { standard_id?: number | string; search?: string }) =>
    apiClient.get<AcademicSubject[]>('/subjects/', { params }),
  get: (id: number | string) => apiClient.get<AcademicSubject>(`/subjects/${id}`),
  create: (data: { standard_id: number | string; name: string; code?: string; max_marks?: number; passing_marks?: number; is_core?: boolean }) =>
    apiClient.post<AcademicSubject>('/subjects/', data),
  update: (id: number | string, data: Partial<AcademicSubject>) =>
    apiClient.put<AcademicSubject>(`/subjects/${id}`, data),
  delete: (id: number | string) =>
    apiClient.delete<{ message: string; id: number }>(`/subjects/${id}`),

  // Canonical Subject Master
  listCanonical: (params?: { category?: string; search?: string; include_inactive?: boolean }) =>
    apiClient.get<CanonicalSubject[]>('/subjects/canonical', { params }),
  getCanonical: (id: number | string) =>
    apiClient.get<CanonicalSubject>(`/subjects/canonical/${id}`),
  createCanonical: (
    data: { name: string; code: string; category?: string; description?: string; aliases?: string },
    params?: { force?: boolean }
  ) => apiClient.post<{ id: number; name: string; code: string; category: string; message: string }>('/subjects/canonical', data, { params }),
  updateCanonical: (id: number | string, data: Partial<CanonicalSubject>) =>
    apiClient.put<{ id: number; message: string }>(`/subjects/canonical/${id}`, data),
  deleteCanonical: (id: number | string) =>
    apiClient.delete<{ id: number; message: string }>(`/subjects/canonical/${id}`),

  // Applicability Mappings
  listMappings: (params?: {
    canonical_subject_id?: number | string
    standard_id?: number | string
    board_id?: number | string
    academic_year_id?: number | string
    search?: string
  }) => apiClient.get<SubjectMappingItem[]>('/subjects/mappings', { params }),
  createMapping: (data: {
    canonical_subject_id: number
    standard_id: number
    board_id?: number | null
    academic_year_id?: number | null
    curriculum_code?: string
    display_name?: string
    max_marks?: number
    pass_marks?: number
    is_optional?: boolean
    display_order?: number
  }) => apiClient.post<{ id: number; message: string; canonical_name: string; standard_name: string }>('/subjects/mappings', data),
  updateMapping: (id: number | string, data: Partial<SubjectMappingItem>) =>
    apiClient.put<{ id: number; message: string }>(`/subjects/mappings/${id}`, data),
  deleteMapping: (id: number | string) =>
    apiClient.delete<{ id: number; message: string }>(`/subjects/mappings/${id}`),

  // Live duplicate detection
  checkDuplicate: (name: string) =>
    apiClient.get<SubjectDuplicateCheckResult>('/subjects/duplicate-check', { params: { name } }),
}

// ─── Timetable ────────────────────────────────────────────────────────────────

export const timetableApi = {
  list: (params?: {
    division_id?: number | string
    standard_id?: number | string
    board_id?: number | string
    day_of_week?: string
    room_number?: string
    teacher_id?: number | string
  }) => apiClient.get<AcademicTimetableEntry[]>('/timetable/', { params }),
  getRooms: () => apiClient.get<string[]>('/timetable/rooms'),
  checkConflict: (data: {
    day_of_week: string
    start_time: string
    end_time: string
    room_number?: string
    division_id?: number | string
    exclude_entry_id?: number | string
  }) => apiClient.post<{ has_conflict: boolean; conflict_type?: string; message?: string }>('/timetable/check-conflict', data),
  create: (data: {
    division_id: number | string
    subject_id: number | string
    day_of_week: string
    start_time: string
    end_time: string
    room_number: string
  }) => apiClient.post<AcademicTimetableEntry>('/timetable/', data),
  update: (id: number | string, data: Partial<AcademicTimetableEntry>) =>
    apiClient.put<AcademicTimetableEntry>(`/timetable/${id}`, data),
  delete: (id: number | string) =>
    apiClient.delete<{ message: string; id: number }>(`/timetable/${id}`),
}

// ─── Enrollments ──────────────────────────────────────────────────────────────

export const enrollmentsApi = {
  getStats: (academic_year_id?: number | string) =>
    apiClient.get<EnrollmentStats>('/enrollments/stats', { params: { academic_year_id } }),
  list: (params?: {
    academic_year_id?: number | string
    board_id?: number | string
    standard_id?: number | string
    division_id?: number | string
    status?: string
    search?: string
    page?: number
    limit?: number
  }) => apiClient.get<{ items: EnrollmentRecord[]; total: number; page: number; limit: number; pages: number }>('/enrollments/', { params }),
  getUnassigned: (params?: { academic_year_id?: number | string; search?: string }) =>
    apiClient.get<UnassignedStudent[]>('/enrollments/unassigned', { params }),
  create: (data: {
    student_id: number | string
    standard_id: number | string
    academic_year_id?: number | string
    division_id?: number | string
    roll_number?: string
    remarks?: string
  }) => apiClient.post<{ id: number; message: string }>('/enrollments/', data),
  transfer: (data: {
    enrollment_id: number | string
    new_division_id: number | string
    transfer_reason?: string
    new_roll_number?: string
  }) => apiClient.post<{ message: string; old_enrollment_id: number; new_enrollment_id: number }>('/enrollments/transfer', data),
  update: (id: number | string, data: { roll_number?: string; division_id?: number; status?: string; remarks?: string }) =>
    apiClient.put<{ message: string; id: number }>(`/enrollments/${id}`, data),
  delete: (id: number | string) =>
    apiClient.delete<{ message: string; id: number }>(`/enrollments/${id}`),
}

// ─── Academic Reports ─────────────────────────────────────────────────────────

export const academicReportsApi = {
  getBatchCapacity: (params?: { board_id?: number | string; standard_id?: number | string }) =>
    apiClient.get<BatchCapacityReportRow[]>('/reports/academic/batch-capacity', { params }),
  getDistribution: () =>
    apiClient.get<AcademicDistributionReportRow[]>('/reports/academic/distribution'),
  getFacultyLoad: () =>
    apiClient.get<FacultyLoadReportRow[]>('/reports/academic/faculty-load'),
  exportReport: (report_type: 'batch-capacity' | 'distribution' | 'faculty-load', params?: { board_id?: number | string; standard_id?: number | string }) =>
    apiClient.get('/reports/academic/export', {
      params: { report_type, ...params },
      responseType: 'blob',
    }),
}

// ─── Divisions ────────────────────────────────────────────────────────────────

export const divisionsApi = {
  list: (params?: { standard_id?: number | string; board_id?: number | string; status?: string; search?: string } | number | string, board_id?: number | string) => {
    const queryParams = typeof params === 'object' && params !== null
      ? params
      : { standard_id: params, board_id }
    return apiClient.get<Division[]>('/divisions/', { params: queryParams })
  },
  get: (id: number | string) => apiClient.get<Division>(`/divisions/${id}`),
  create: (data: { standard_id: number | string; board_id?: number | string; name: string; code?: string; capacity?: number; room_number?: string; schedule_timing?: string; status?: string; class_teacher_id?: number }) =>
    apiClient.post<Division>('/divisions/', data),
  update: (id: number | string, data: Partial<Division>) =>
    apiClient.put<Division>(`/divisions/${id}`, data),
  archive: (id: number | string) =>
    apiClient.put<{ id: number; status: string; message: string }>(`/divisions/${id}/archive`),
  getRoster: (id: number | string, params?: { status?: string; include_inactive?: boolean }) =>
    apiClient.get<BatchRosterResponse>(`/divisions/${id}/roster`, { params }),
  checkConflict: (data: { room_number?: string; teacher_id?: number; day_of_week?: string; start_time: string; end_time: string; exclude_division_id?: number }) =>
    apiClient.post<{ has_conflict: boolean; conflict_type?: string; details?: string }>('/divisions/check-conflict', data),
}

// ─── Students ─────────────────────────────────────────────────────────────────

export const studentsApi = {
  list: (params?: {
    institution_id?: number | string
    standard_id?: number | string
    division_id?: number | string
    academic_year_id?: number | string
    status?: string
    include_inactive?: boolean
    search?: string
    page?: number
    page_size?: number
  }) => apiClient.get<PaginatedResponse<Student>>('/students/', { params }),
  get: (id: number | string) => apiClient.get<Student>(`/students/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post<Student>('/students/', data),
  update: (id: number | string, data: Record<string, unknown>) =>
    apiClient.put(`/students/${id}`, data),
  updateFullProfile: (id: number | string, data: Record<string, unknown>) =>
    apiClient.put(`/students/${id}/profile`, data),
  enroll: (
    id: number | string,
    data: {
      academic_year_id: number | string
      standard_id: number | string
      division_id?: number | string
      roll_number?: string
      enrollment_date: string
    }
  ) => apiClient.post(`/students/${id}/enroll`, data),
  exit: (id: number | string, data: StudentExitPayload) =>
    apiClient.post(`/students/${id}/exit`, data),
  reactivate: (id: number | string, data: StudentReactivatePayload) =>
    apiClient.post(`/students/${id}/reactivate`, data),
  lifecycleHistory: (id: number | string) =>
    apiClient.get<StudentLifecycleHistoryResponse>(`/students/${id}/lifecycle-history`),
  getProfile: (id: number | string) =>
    apiClient.get<StudentAdminProfile>(`/students/${id}/profile`),
  addDocument: (
    id: number | string,
    data: { title: string; document_type: string; file_url: string; status?: string }
  ) => apiClient.post<StudentDocumentItem>(`/students/${id}/documents`, data),
  deleteDocument: (studentId: number | string, docId: number | string) =>
    apiClient.delete(`/students/${studentId}/documents/${docId}`),
  getIdCard: (studentId: number | string) =>
    apiClient.get<StudentIdCardData>(`/students/${studentId}/id-card`),
  getBatchIdCards: (params?: { standard_id?: number | string; division_id?: number | string }) =>
    apiClient.get<{ count: number; cards: StudentIdCardData[] }>('/students/batch/id-cards', { params }),
}

// ─── Fee Categories ───────────────────────────────────────────────────────────

export const feeCategoriesApi = {
  list: (institution_id?: number | string) =>
    apiClient.get<FeeCategory[]>('/fees/categories', { params: { institution_id } }),
  create: (data: { institution_id?: number | string; name: string; fee_type?: string; description?: string }) =>
    apiClient.post<FeeCategory>('/fees/categories', data),
}

// ─── Fee Structures ───────────────────────────────────────────────────────────

export const feeStructuresApi = {
  list: (params?: { academic_year_id?: number | string; standard_id?: number | string; institution_id?: number | string }) =>
    apiClient.get<FeeStructure[]>('/fees/structures', { params }),
  create: (data: Record<string, unknown>) => apiClient.post<FeeStructure>('/fees/structures', data),
  update: (id: number | string, data: Record<string, unknown>) => apiClient.put<FeeStructure>(`/fees/structures/${id}`, data),
}

// ─── Discounts ────────────────────────────────────────────────────────────────

export const discountsApi = {
  list: (institution_id?: number | string) =>
    apiClient.get('/fees/discounts', { params: { institution_id } }),
  create: (data: Record<string, unknown>) => apiClient.post('/fees/discounts', data),
}

// ─── Fee Assignments ──────────────────────────────────────────────────────────

export const feeAssignmentsApi = {
  list: (params?: { student_id?: number | string; academic_year_id?: number | string }) =>
    apiClient.get('/fees/assignments', { params }),
  create: (data: Record<string, unknown>) => apiClient.post('/fees/assignments', data),
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export const invoicesApi = {
  list: (params?: { student_id?: number | string; academic_year_id?: number | string; status?: string }) =>
    apiClient.get<FeeInvoice[]>('/fees/invoices', { params }),
  get: (id: number | string) => apiClient.get<FeeInvoice>(`/fees/invoices/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post<FeeInvoice>('/fees/invoices', data),
}

// ─── Installments ─────────────────────────────────────────────────────────────

export const installmentsApi = {
  list: (params?: { invoice_id?: number | string; student_id?: number | string; status?: string }) =>
    apiClient.get<FeeInstallment[]>('/fees/installments', { params }),
}

// ─── Fees Unified ─────────────────────────────────────────────────────────────

export const feesApi = {
  getOverview: (params?: {
    academic_year_id?: number | string
    institution_id?: number | string
    board_id?: number | string
    standard_id?: number | string
    division_id?: number | string
  }) => apiClient.get<FeeOverviewData>('/fees/overview', { params }),

  getRegister: (params?: {
    academic_year_id?: number | string
    board_id?: number | string
    standard_id?: number | string
    division_id?: number | string
    status?: string
    student_status?: string
    search?: string
  }) => apiClient.get<FeeRegisterEntry[]>('/fees/register', { params }),

  getFormerStudentsRecovery: (params?: {
    academic_year_id?: number | string
    board_id?: number | string
    standard_id?: number | string
    min_outstanding?: number
    search?: string
  }) => apiClient.get<FormerStudentRecoveryResponse>('/fees/former-students-recovery', { params }),

  getStudentFeeDetails: (studentId: number | string) =>
    apiClient.get(`/fees/students/${studentId}/fee-details`),

  adjustStudentFees: (
    studentId: number | string,
    data: {
      custom_amount?: number
      concession_amount?: number
      fee_structure_id?: number
      remarks?: string
      reason: string
    }
  ) => apiClient.post(`/fees/students/${studentId}/adjust-fees`, data),

  deleteInvoice: (invoiceId: number | string) =>
    apiClient.delete<{ success: boolean; message: string; invoice_id: number }>(`/fees/invoices/${invoiceId}`),

  cancelInvoice: (invoiceId: number | string, reason: string) =>
    apiClient.post<{ success: boolean; message: string; invoice_id: number; status: string }>(`/fees/invoices/${invoiceId}/cancel`, { reason }),
}

// ─── Fee Concessions & Scholarships ──────────────────────────────────────────

export interface ConcessionType {
  id: number
  institution_id: number
  code: string
  name: string
  category: string
  description?: string
  funding_source: string
  calculation_type: 'percentage' | 'fixed_amount' | 'full_waiver'
  default_value: number
  max_discount_amount?: number
  is_stackable: boolean
  requires_documents: boolean
  is_active: boolean
  created_at?: string
}

export interface ConcessionApplication {
  id: number
  application_number: string
  student_id: number
  student_name: string
  admission_number: string
  standard?: string
  concession_type_id: number
  concession_name: string
  category: string
  requested_amount: number
  requested_percentage?: number
  approved_amount: number
  applied_amount: number
  funding_source: string
  sponsor_name?: string
  sponsor_sanctioned_amount?: number
  sponsor_received_amount: number
  status: 'draft' | 'under_verification' | 'pending_approval' | 'approved' | 'applied' | 'rejected' | 'withdrawn' | 'cancelled'
  applicant_type: string
  invoice_id?: number
  invoice_number?: string
  approval_remarks?: string
  rejection_reason?: string
  withdrawal_reason?: string
  supporting_document_url?: string
  created_at?: string
  approved_at?: string
}

export interface ConcessionAnalytics {
  academic_year_id: number
  academic_year_name: string
  total_applications: number
  total_concessions_awarded: number
  total_concessions_applied: number
  by_category: Record<string, { count: number; awarded: number }>
  by_status: Record<string, number>
}

export interface ConcessionEligibilityResult {
  eligible: boolean
  student_id: number
  concession_type_id: number
  concession_name: string
  category: string
  summary: string
  criteria: Array<{
    name: string
    required: string
    observed: string
    passed: boolean
  }>
}

export const concessionsApi = {
  getTypes: (params?: { category?: string; is_active?: boolean }) =>
    apiClient.get<ConcessionType[]>('/fees/concessions/types', { params }),

  getApplications: (params?: {
    student_id?: number
    status?: string
    concession_type_id?: number
    funding_source?: string
    search?: string
    limit?: number
    offset?: number
  }) => apiClient.get<ConcessionApplication[]>('/fees/concessions/applications', { params }),

  getApplicationDetail: (id: number) =>
    apiClient.get<ConcessionApplication & { eligibility_evaluation?: ConcessionEligibilityResult }>(`/fees/concessions/applications/${id}`),

  createApplication: (data: {
    student_id: number
    concession_type_id: number
    academic_year_id?: number
    requested_amount?: number
    requested_percentage?: number
    applicant_type?: string
    sponsor_name?: string
    sponsor_reference?: string
    sponsor_sanctioned_amount?: number
    supporting_document_url?: string
    remarks?: string
  }) => apiClient.post<{ message: string; id: number; application_number: string; status: string }>('/fees/concessions/applications', data),

  createBulkApplications: (data: {
    student_ids: number[]
    concession_type_id: number
    academic_year_id?: number
    requested_amount?: number
    requested_percentage?: number
    applicant_type?: string
    sponsor_name?: string
    sponsor_reference?: string
    remarks?: string
    auto_approve?: boolean
  }) => apiClient.post<{
    message: string
    successful_count: number
    failed_count: number
    applications: Array<{ student_id: number; application_id: number; application_number: string; amount: number; status: string }>
    errors: Array<{ student_id: number; error: string }>
  }>('/fees/concessions/applications/bulk', data),

  evaluateEligibility: (studentId: number, typeId: number, academicYearId?: number) =>
    apiClient.get<ConcessionEligibilityResult>(`/fees/concessions/evaluate/${studentId}/${typeId}`, {
      params: academicYearId ? { academic_year_id: academicYearId } : undefined,
    }),

  verifyApplication: (id: number, data: { notes: string; supporting_document_url?: string }) =>
    apiClient.post<{ message: string; status: string }>(`/fees/concessions/applications/${id}/verify`, data),

  approveApplication: (id: number, data: { approved_amount?: number; remarks?: string; auto_apply?: boolean }) =>
    apiClient.post<{ message: string; id: number; status: string; approved_amount: number; applied: boolean }>(`/fees/concessions/applications/${id}/approve`, data),

  rejectApplication: (id: number, data: { rejection_reason: string }) =>
    apiClient.post<{ message: string; id: number; status: string }>(`/fees/concessions/applications/${id}/reject`, data),

  applyApplication: (id: number) =>
    apiClient.post<{ message: string; allocation_id: number; allocated_amount: number; invoice_id: number }>(`/fees/concessions/applications/${id}/apply`),

  withdrawApplication: (id: number, data: { withdrawal_reason: string }) =>
    apiClient.post<{ message: string; id: number; status: string }>(`/fees/concessions/applications/${id}/withdraw`, data),

  getAnalytics: (academicYearId?: number) =>
    apiClient.get<ConcessionAnalytics>('/fees/concessions/analytics', {
      params: academicYearId ? { academic_year_id: academicYearId } : undefined,
    }),
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export const paymentsApi = {
  list: (params?: {
    student_id?: number | string
    academic_year_id?: number | string
    board_id?: number | string
    standard_id?: number | string
    division_id?: number | string
    status?: string
    search?: string
  }) => apiClient.get<PaymentTransactionItem[]>('/payments/', { params }),
  get: (id: number | string) => apiClient.get<Payment>(`/payments/${id}`),
  create: (data: {
    student_id: number | string
    academic_year_id: number | string
    amount: number
    payment_date: string
    payment_method: string
    transaction_reference?: string
    bank_name?: string
    cheque_number?: string
    notes?: string
    action?: 'draft' | 'submit' | 'post'
    allocations: { invoice_id: number | string; installment_id?: number | string; amount: number }[]
  }) => apiClient.post<{ payment_id: number; receipt_number?: string; amount: number; status: string; message: string }>('/payments/', data),
  update: (id: number | string, data: {
    amount?: number
    payment_date?: string
    payment_method?: string
    transaction_reference?: string
    bank_name?: string
    cheque_number?: string
    cheque_date?: string
    notes?: string
    edit_reason: string
    allocations?: { invoice_id: number | string; installment_id?: number | string; amount: number }[]
  }) => apiClient.put<{ message: string; payment_id: number; status: string; receipt_number?: string; is_superseded?: boolean }>(`/payments/${id}`, data),
  submit: (id: number | string) =>
    apiClient.post<{ message: string; status: string; payment_id: number }>(`/payments/${id}/submit`),
  approve: (id: number | string, data?: { remarks?: string }) =>
    apiClient.post<{ message: string; status: string; payment_id: number }>(`/payments/${id}/approve`, data || {}),
  deleteDraft: (id: number | string) =>
    apiClient.delete<{ success: boolean; message: string; payment_id: number }>(`/payments/${id}`),
  cancelPayment: (id: number | string, reason: string) =>
    apiClient.post<{ success: boolean; message: string; payment_id: number; status: string }>(`/payments/${id}/cancel`, { reason }),
  postPayment: (id: number | string) =>
    apiClient.post<{ message: string; status: string; receipt_number: string; payment_id: number }>(`/payments/${id}/post`),
  reverse: (id: number | string, reason: string) =>
    apiClient.post(`/payments/${id}/reverse`, { reason }),
  getReceipt: (receiptNumber: string) =>
    apiClient.get<Receipt>(`/payments/receipts/${receiptNumber}`),
  listReceipts: (params?: {
    academic_year_id?: number | string
    board_id?: number | string
    standard_id?: number | string
    division_id?: number | string
    search?: string
  }) => apiClient.get<PaymentReceiptListItem[]>('/payments/receipts-list', { params }),
  reprintReceipt: (receiptNumber: string, reason?: string) =>
    apiClient.post<{ receipt_number: string; reprint_count: number; message: string; is_duplicate: boolean }>(`/payments/receipts/${receiptNumber}/reprint`, { reason }),
  downloadReceiptPdf: (
    receiptNumber: string,
    params?: {
      print_logo?: boolean
      print_tagline?: boolean
      print_software_branding?: boolean
      print_sovereign_trim?: boolean
      print_verification_seal?: boolean
    }
  ) =>
    apiClient.get(`/payments/receipts/${receiptNumber}/pdf`, { params, responseType: 'blob' }),
  exportBulkReceiptsZip: (
    receiptNumbers: string[],
    options?: {
      print_logo?: boolean
      print_tagline?: boolean
      print_software_branding?: boolean
      print_sovereign_trim?: boolean
      print_verification_seal?: boolean
    }
  ) =>
    apiClient.post('/payments/receipts/bulk-pdf-zip', { receipt_numbers: receiptNumbers, ...options }, { responseType: 'blob' }),
  requestRefund: (paymentId: number | string, data: {
    amount: number
    reason: string
    refund_method?: string
    reference_note?: string
    requires_approval?: boolean
  }) => apiClient.post<{ message: string; refund_id: number; status: string }>(`/payments/${paymentId}/refunds`, data),
  listRefunds: (params?: { student_id?: number | string; status?: string; limit?: number }) =>
    apiClient.get<RefundRecord[]>('/payments/refunds/', { params }),
  approveRefund: (refundId: number | string, data?: { notes?: string }) =>
    apiClient.post<{ message: string; refund_id: number; status: string }>(`/payments/refunds/${refundId}/approve`, data || {}),
  rejectRefund: (refundId: number | string, data: { reason: string }) =>
    apiClient.post<{ message: string; refund_id: number; status: string }>(`/payments/refunds/${refundId}/reject`, data),
  processRefund: (refundId: number | string, data?: { notes?: string }) =>
    apiClient.post<{ message: string; refund_id: number; status: string }>(`/payments/refunds/${refundId}/process`, data || {}),
  getAuditTrail: (paymentId: number | string) =>
    apiClient.get<PaymentAuditLog[]>(`/payments/${paymentId}/audit-trail`),
  getWorkflowConfig: () =>
    apiClient.get<PaymentWorkflowConfig>('/payments/workflow/config'),
  updateWorkflowConfig: (data: Partial<PaymentWorkflowConfig>) =>
    apiClient.put<{ message: string; config: PaymentWorkflowConfig }>('/payments/workflow/config', data),
  getMyPermissions: () =>
    apiClient.get<PaymentPermissions>('/payments/my-permissions'),
  getEditPostedStatus: (role_name?: string) =>
    apiClient.get<{ role_name: string; role_id: number; has_edit_posted_permission: boolean; permission_id?: number }>('/sysadmin/permissions/edit-posted-status', { params: { role_name } }),
  toggleEditPosted: (data: { role_name?: string; granted: boolean; reason: string }) =>
    apiClient.post<{ success: boolean; role_name: string; edit_posted_granted: boolean; action: string; message: string }>('/sysadmin/permissions/toggle-edit-posted', data),
  getOnlineConfig: () =>
    apiClient.get<PaymentGatewayConfig>('/payments/online/config'),
  updateOnlineConfig: (data: Partial<PaymentGatewayConfig>) =>
    apiClient.put<{ status: string; message: string; config: PaymentGatewayConfig }>('/payments/online/config', data),
  createOnlineOrder: (data: { invoice_id: number | string; amount: number; installment_id?: number }) =>
    apiClient.post<OnlineOrderResponse>('/payments/online/create-order', data),
  verifyOnlinePayment: (data: OnlinePaymentVerifyPayload) =>
    apiClient.post<OnlinePaymentVerifyResult>('/payments/online/verify', data),
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export const reportsApi = {
  feeCollection: (params?: {
    academic_year_id?: number | string
    institution_id?: number | string
    status?: string
    include_inactive?: boolean
  }) => apiClient.get<FeeCollectionRow[]>('/reports/fee-collection', { params }),
  outstanding: (params?: {
    academic_year_id?: number | string
    institution_id?: number | string
    status?: string
    include_inactive?: boolean
  }) => apiClient.get<OutstandingRow[]>('/reports/outstanding', { params }),
  exportFeeCollection: (params?: {
    format?: string
    academic_year_id?: number | string
    institution_id?: number | string
    status?: string
    include_inactive?: boolean
  }) =>
    apiClient.get('/reports/fee-collection/export', {
      params,
      responseType: 'blob',
    }),
  paymentsSummary: (params?: { academic_year_id?: number | string }) =>
    apiClient.get('/reports/payments-summary', { params }),
  withdrawals: (params?: {
    academic_year_id?: number | string
    standard_id?: number | string
    division_id?: number | string
    paid_status?: string
    reason?: string
  }) =>
    apiClient.get<WithdrawalReportItem[]>('/reports/withdrawals', { params }),
  withdrawalAnalytics: (params?: {
    academic_year_id?: number | string
  }) =>
    apiClient.get<WithdrawalAnalyticsResponse>('/reports/withdrawal-analytics', { params }),
  exportWithdrawals: (params?: {
    academic_year_id?: number | string
    standard_id?: number | string
    division_id?: number | string
    paid_status?: string
    reason?: string
  }) =>
    apiClient.get('/reports/withdrawals/export', {
      params,
      responseType: 'blob',
    }),
  studentMasterDirectory: (params?: {
    academic_year_id?: number | string
    board_id?: number | string
    standard_id?: number | string
    division_id?: number | string
    status?: string
    search?: string
  }) => apiClient.get<any[]>('/reports/students/master-directory', { params }),
  attendanceSummary: (params?: {
    academic_year_id?: number | string
    standard_id?: number | string
    division_id?: number | string
    start_date?: string
    end_date?: string
    defaulters_only?: boolean
  }) => apiClient.get<any[]>('/reports/attendance/summary', { params }),
  curriculumMatrix: (params?: {
    board_id?: number | string
    standard_id?: number | string
  }) => apiClient.get<any[]>('/reports/academic/curriculum-matrix', { params }),
  timetableUtilization: (params?: {
    division_id?: number | string
    day_of_week?: string
  }) => apiClient.get<any[]>('/reports/academic/timetable-utilization', { params }),
  examMeritRegister: (params?: {
    exam_id?: number | string
    academic_year_id?: number | string
    standard_id?: number | string
  }) => apiClient.get<any[]>('/reports/examinations/consolidated-merit', { params }),
  feeDefaulters: (params?: {
    academic_year_id?: number | string
    standard_id?: number | string
    division_id?: number | string
    min_days_overdue?: number
  }) => apiClient.get<any[]>('/reports/fees/defaulters', { params }),
  dailyCollection: (params?: {
    date?: string
    start_date?: string
    end_date?: string
    payment_mode?: string
  }) => apiClient.get<any[]>('/reports/fees/daily-collection', { params }),
  systemAuditSummary: (params?: {
    severity?: string
    resource_type?: string
    start_date?: string
    end_date?: string
    limit?: number
  }) => apiClient.get<any[]>('/reports/system/audit-summary', { params }),
}

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersApi = {
  me: () => apiClient.get<User>('/users/me'),
  getStats: () => apiClient.get<UserManagementStats>('/users/stats'),
  list: (params?: {
    search?: string
    role?: string
    status?: string
    academic_year_id?: number
    standard_id?: number
    division_id?: number
    sort_by?: string
    sort_dir?: 'asc' | 'desc'
    page?: number
    limit?: number
  }) => apiClient.get<UserListResponse>('/users/', { params }),
  getProfile: (id: number | string) =>
    apiClient.get<UserProfileWorkspaceData>(`/users/${id}`),
  create: (data: UserCreatePayload) =>
    apiClient.post<{ id: number; username: string; role: string; message: string }>('/users/', data),
  update: (id: number | string, data: UserUpdatePayload) =>
    apiClient.put<{ message: string; id: number }>(`/users/${id}`, data),
  resetPassword: (id: number | string, data?: { new_password?: string }) =>
    apiClient.post<{ success: boolean; message: string; temporary_password?: string }>(
      `/users/${id}/reset-password`,
      data || {}
    ),
  toggleStatus: (id: number | string) =>
    apiClient.post<{ id: number; is_active: boolean; message: string }>(`/users/${id}/toggle-status`),
  resendInvitation: (id: number | string) =>
    apiClient.post<{ success: boolean; message: string; invitation_sent_at: string }>(`/users/${id}/resend-invitation`),
  delete: (id: number | string, permanent = false) =>
    apiClient.delete<{ message: string }>(`/users/${id}`, { params: { permanent } }),
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export const attendanceApi = {
  get: (params?: { student_id?: number | string; division_id?: number | string; date_from?: string; date_to?: string }) =>
    apiClient.get('/attendance/', { params }),
  markBulk: (data: {
    date: string
    entries: { student_id: number | string; enrollment_id?: number | string; status: string; remarks?: string }[]
  }) => apiClient.post('/attendance/bulk', data),
  scanCheckin: (data: { identifier: string; date?: string; status?: string; remarks?: string }) =>
    apiClient.post<ScanCheckinResult>('/attendance/scan-checkin', data),
}

// ─── Named Function Aliases for Page Compatibility ───────────────────────────

export const getStudent = (id: number | string) => studentsApi.get(id).then(r => r.data)
export const createStudent = (data: Record<string, unknown>) => studentsApi.create(data).then(r => r.data)
export const updateStudent = (id: number | string, data: Record<string, unknown>) => studentsApi.update(id, data).then(r => r.data)

export const getStandards = (institution_id?: number | string, board_id?: number | string) =>
  standardsApi.list({ institution_id, board_id }).then(r => r.data)
export const createStandard = (data: any) => standardsApi.create(data).then(r => r.data)

export const getDivisions = (standard_id?: number | string, board_id?: number | string) =>
  divisionsApi.list({ standard_id, board_id }).then(r => r.data)
export const createDivision = (data: any) => divisionsApi.create(data).then(r => r.data)

export const getFeeCategories = (institution_id?: number | string) => feeCategoriesApi.list(institution_id).then(r => r.data)
export const createFeeCategory = (data: any) => feeCategoriesApi.create(data).then(r => r.data)

export const getFeeStructures = (params?: any) => feeStructuresApi.list(params).then(r => r.data)
export const createFeeStructure = (data: any) => feeStructuresApi.create(data).then(r => r.data)

export const getStudentInvoices = (studentId: number | string) => invoicesApi.list({ student_id: studentId }).then(r => r.data)

export const createPayment = async (data: any) => {
  const payload = {
    student_id: Number(data.student_id),
    academic_year_id: Number(data.academic_year_id || 1),
    amount: Number(data.amount),
    payment_date: data.payment_date || new Date().toISOString().split('T')[0],
    payment_method: data.payment_method || 'cash',
    transaction_reference: data.transaction_reference,
    notes: data.notes,
    allocations: (data.allocations || []).map((a: any) => ({
      invoice_id: Number(a.invoice_id || data.invoice_id),
      installment_id: a.installment_id ? Number(a.installment_id) : undefined,
      amount: Number(a.amount),
    })),
  }
  const res = await paymentsApi.create(payload)
  return res.data
}

export const getPaymentReceipt = async (receiptNumberOrPaymentId: string | number) => {
  if (typeof receiptNumberOrPaymentId === 'string' && receiptNumberOrPaymentId.startsWith('RCP-')) {
    const res = await paymentsApi.getReceipt(receiptNumberOrPaymentId)
    return res.data
  }
  try {
    const payRes = await paymentsApi.get(receiptNumberOrPaymentId)
    if (payRes.data.receipt_number) {
      const recRes = await paymentsApi.getReceipt(payRes.data.receipt_number)
      return recRes.data
    }
    return payRes.data as any
  } catch {
    const res = await paymentsApi.getReceipt(String(receiptNumberOrPaymentId))
    return res.data
  }
}

// ─── Examinations ─────────────────────────────────────────────────────────────

export const examinationsApi = {
  list: (params?: { academic_year_id?: number | string; standard_id?: number | string }) =>
    apiClient.get<any[]>('/examinations/', { params }),
  create: (data: { academic_year_id: number | string; standard_id: number | string; name: string; exam_type?: string; max_marks?: number; passing_marks?: number }) =>
    apiClient.post('/examinations/', data),
  getMarks: (examId: number | string) =>
    apiClient.get<ExamMarksSheet>(`/examinations/${examId}/marks`),
  saveMarks: (examId: number | string, data: { entries: Array<{ student_id: number; subject_id: number; marks_obtained?: number | null; grade?: string | null; remarks?: string | null; is_absent?: boolean }> }) =>
    apiClient.post<{ status: string; saved_count: number }>(`/examinations/${examId}/marks`, data),
  getAnalytics: (examId: number | string) =>
    apiClient.get<ExamAnalyticsData>(`/examinations/${examId}/analytics`),
  getReportCard: (examId: number | string, studentId: number | string) =>
    apiClient.get<StudentReportCardData>(`/examinations/${examId}/report-card/${studentId}`),
}

// ─── Fee Register Import ──────────────────────────────────────────────────────

export const feeRegisterImportApi = {
  getPreview: (filePath?: string) =>
    apiClient.get<FeeRegisterPreviewResponse>('/import/fee-register/preview', {
      params: filePath ? { file_path: filePath } : undefined,
    }),
  previewUpload: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post<FeeRegisterPreviewResponse>('/import/fee-register/preview-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  execute: (data: { replace_demo_data?: boolean; file_path?: string }) =>
    apiClient.post<FeeRegisterImportExecutionResponse>('/import/fee-register/execute', data),
  getStatus: () =>
    apiClient.get<{
      already_imported: boolean
      default_file_hash: string
      total_imports: number
      history: FeeRegisterImportLog[]
    }>('/import/fee-register/status'),
}

// ─── Student Portal ───────────────────────────────────────────────────────────

export const studentPortalApi = {
  getDashboard: (student_id?: number | string) =>
    apiClient.get<StudentPortalDashboard>('/student-portal/dashboard', {
      params: student_id ? { student_id } : undefined,
    }),
  getClasses: (student_id?: number | string) =>
    apiClient.get<{
      student_id: number
      enrollments: any[]
      subjects: any[]
    }>('/student-portal/classes', {
      params: student_id ? { student_id } : undefined,
    }),
  getTimetable: (student_id?: number | string) =>
    apiClient.get<{
      student_id: number
      division_id: number | null
      batch_name: string
      timetable: TimetableSlot[]
      grouped_by_day: Record<string, TimetableSlot[]>
    }>('/student-portal/timetable', {
      params: student_id ? { student_id } : undefined,
    }),
  getAttendance: (params?: { student_id?: number | string; month?: number; year?: number }) =>
    apiClient.get<{
      summary: {
        total_days: number
        present_days: number
        absent_days: number
        late_days: number
        attendance_percentage: number
      }
      records: { id: number; date: string; status: string; remarks: string }[]
    }>('/student-portal/attendance', { params }),
  getTests: (student_id?: number | string) =>
    apiClient.get<{
      student_id: number
      upcoming_tests: UpcomingTestItem[]
      results: TestResultItem[]
    }>('/student-portal/tests', {
      params: student_id ? { student_id } : undefined,
    }),
  getFees: (student_id?: number | string) =>
    apiClient.get<{
      student_id: number
      summary: {
        total_fees: number
        paid_amount: number
        outstanding_balance: number
        status: string
        collection_percentage: number
      }
      invoices: any[]
      payments: any[]
    }>('/student-portal/fees', {
      params: student_id ? { student_id } : undefined,
    }),
  getStudyMaterials: (params?: { student_id?: number | string; subject_id?: number | string }) =>
    apiClient.get<{
      student_id: number
      materials: StudyMaterialItem[]
    }>('/student-portal/study-materials', { params }),
  getProfile: (student_id?: number | string) =>
    apiClient.get<{
      student: any
      guardians: any[]
      documents: StudentDocumentItem[]
      enrollments: any[]
    }>('/student-portal/profile', {
      params: student_id ? { student_id } : undefined,
    }),
  updateProfile: (data: Record<string, any>, student_id?: number | string) =>
    apiClient.put<{ message: string; student: any }>('/student-portal/profile', data, {
      params: student_id ? { student_id } : undefined,
    }),
}

// ─── Study Materials & Academic Syllabi ───────────────────────────────────────

export const studyMaterialsApi = {
  list: (params?: {
    standard_id?: number
    subject_id?: number
    division_id?: number
    file_type?: string
    search?: string
    skip?: number
    limit?: number
  }) =>
    apiClient.get<{
      items: StudyMaterialItem[]
      total: number
      skip: number
      limit: number
    }>('/study-materials', { params }),

  getStats: () => apiClient.get<StudyMaterialStats>('/study-materials/stats'),

  create: (data: {
    standard_id: number
    subject_id: number
    division_id?: number | null
    title: string
    description?: string
    file_type: string
    file_url: string
    file_size_bytes?: number
  }) => apiClient.post<{ success: boolean; message: string; id: number; title: string }>('/study-materials', data),

  update: (
    id: number,
    data: {
      standard_id?: number
      subject_id?: number
      division_id?: number | null
      title?: string
      description?: string
      file_type?: string
      file_url?: string
      file_size_bytes?: number
    }
  ) => apiClient.put<{ success: boolean; message: string; id: number; title: string }>(`/study-materials/${id}`, data),

  delete: (id: number) =>
    apiClient.delete<{ success: boolean; message: string; id: number }>(`/study-materials/${id}`),
}

// ─── Import & Export ──────────────────────────────────────────────────────────

export const importExportApi = {
  getEntities: () => apiClient.get<SupportedEntity[]>('/import-export/entities'),
  downloadTemplate: (entity_type: string, file_format: 'xlsx' | 'csv' = 'xlsx') =>
    apiClient.get('/import-export/template', {
      params: { entity_type, file_format },
      responseType: 'blob',
    }),
  previewFile: (file: File, entity_type: string, mode: string = 'create_only', academic_year_id?: number) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('entity_type', entity_type)
    formData.append('mode', mode)
    if (academic_year_id) formData.append('academic_year_id', String(academic_year_id))
    return apiClient.post<ImportPreviewResponse>('/import-export/preview-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  previewGrid: (data: {
    entity_type: string
    headers?: string[]
    raw_rows?: any[][]
    raw_text?: string
    column_mapping?: Record<string, string>
    mode?: string
    academic_year_id?: number
  }) => apiClient.post<ImportPreviewResponse>('/import-export/preview-grid', data),
  execute: (data: {
    entity_type: string
    validated_rows: any[]
    mode?: string
    source_type?: string
    file_name?: string
    academic_year_id?: number
  }) => apiClient.post<ImportExecuteResult>('/import-export/execute', data),
  exportData: (params: ExportFilterParams) =>
    apiClient.get('/import-export/export', {
      params,
      responseType: 'blob',
    }),
  getHistory: (params?: { entity_type?: string; limit?: number; offset?: number }) =>
    apiClient.get<{
      items: ImportHistoryItem[]
      total: number
      limit: number
      offset: number
    }>('/import-export/history', { params }),
  getHistoryDetail: (id: number | string) =>
    apiClient.get<ImportHistoryDetail>(`/import-export/history/${id}`),
}

// ─── Print Forms & KYC ─────────────────────────────────────────────────────────

export const formsApi = {
  getCatalogue: (params?: { entity?: string; category?: string }) =>
    apiClient.get<{
      total: number
      forms: FormCatalogItem[]
    }>('/forms/catalogue', { params }),

  renderForm: (
    formId: string,
    params?: { record_id?: number | string; mode?: 'prefilled' | 'blank'; sections?: string }
  ) => apiClient.get<RenderedFormPayload>(`/forms/render/${formId}`, { params }),

  bulkRender: (payload: {
    form_id: string
    mode?: string
    record_ids?: number[]
    division_id?: number
    standard_id?: number
    sections?: string[]
  }) =>
    apiClient.post<{
      form_id: string
      title: string
      mode: string
      total_records: number
      forms: RenderedFormPayload[]
    }>('/forms/bulk-render', payload),

  getAuditLogs: (params?: { limit?: number }) =>
    apiClient.get<{
      total: number
      audit_logs: FormAuditLogItem[]
    }>('/forms/audit-logs', { params }),
}






// ─── Staff & Faculty Management ──────────────────────────────────────────────

export const staffApi = {
  list: (params?: {
    search?: string
    staff_type?: string
    department?: string
    employment_type?: string
    status?: string
    page?: number
    limit?: number
  }) =>
    apiClient.get<{
      items: StaffMember[]
      total: number
      page: number
      limit: number
      pages: number
    }>('/staff/', { params }),

  get: (userId: number | string) =>
    apiClient.get<StaffProfileDetail>(`/staff/${userId}`),

  create: (data: any) =>
    apiClient.post<{ success: boolean; message: string; user_id: number; employee_id: string; username?: string; temporary_password?: string }>(
      '/staff/',
      data
    ),

  update: (userId: number | string, data: any) =>
    apiClient.put<{ success: boolean; message: string }>(`/staff/${userId}`, data),

  assignmentsList: (params?: {
    teacher_id?: number
    division_id?: number
    standard_id?: number
    subject_id?: number
    academic_year_id?: number
  }) => apiClient.get<TeacherAssignmentItem[]>('/staff/assignments/list', { params }),

  createAssignment: (data: {
    teacher_user_id: number
    academic_year_id: number
    board_id: number
    standard_id: number
    division_id: number
    subject_id: number
    weekly_hours?: number
    is_class_teacher?: boolean
    notes?: string
  }) => apiClient.post<{ success: boolean; message: string; id: number }>('/staff/assignments/create', data),

  deleteAssignment: (assignmentId: number) =>
    apiClient.delete<{ success: boolean; message: string }>(`/staff/assignments/${assignmentId}`),

  dailyAttendance: (params?: { attendance_date?: string; staff_type?: string }) =>
    apiClient.get<StaffDailyAttendanceResponse>('/staff/attendance/daily', { params }),

  markAttendance: (data: {
    date: string
    records: Array<{
      user_id: number
      status: string
      check_in_time?: string
      check_out_time?: string
      hours_worked?: number
      remarks?: string
    }>
  }) => apiClient.post<{ success: boolean; message: string }>('/staff/attendance/mark', data),

  leavesList: (params?: { status?: string; user_id?: number }) =>
    apiClient.get<StaffLeaveItem[]>('/staff/leaves/list', { params }),

  applyLeave: (data: {
    leave_type: string
    start_date: string
    end_date: string
    days_count?: number
    reason: string
  }) => apiClient.post<{ success: boolean; message: string; id: number }>('/staff/leaves/apply', data),

  actionLeave: (leaveId: number, data: { action: 'approve' | 'reject'; action_remarks?: string }) =>
    apiClient.post<{ success: boolean; message: string }>(`/staff/leaves/${leaveId}/action`, data),

  dashboardStats: () =>
    apiClient.get<Record<string, any>>('/staff/dashboard/stats'),

  documentCatalogue: (params?: { category?: string }) =>
    apiClient.get<StaffDocumentTemplate[]>('/staff/documents-forms/catalogue', { params }),

  renderDocument: (formId: string, params: { user_id: number | string; period_month?: string }) =>
    apiClient.get<StaffDocumentRenderResponse>(`/staff/documents-forms/render/${formId}`, { params }),

  getTeacherDashboard: (academic_year_id?: number | string) =>
    apiClient.get<TeacherDashboardData>('/staff/teachers/dashboard', { params: { academic_year_id } }),

  getStaffDashboard: () =>
    apiClient.get<StaffDashboardData>('/staff/non-teaching/dashboard'),

  updateLifecycle: (userId: number | string, data: StaffLifecyclePayload) =>
    apiClient.post<{ status: string; action: string; user_id: number; old_status: string; new_status: string; effective_date: string; is_active: boolean }>(
      `/staff/${userId}/lifecycle`,
      data
    ),

  getActivityHistory: (userId: number | string, limit?: number) =>
    apiClient.get<EmployeeActivityHistoryItem[]>(`/staff/${userId}/activity-history`, { params: { limit } }),

  getBankAccounts: (userId: number | string) =>
    apiClient.get<Array<{
      id: number
      staff_profile_id: number
      account_holder_name: string
      bank_name: string
      account_number: string
      ifsc_code: string
      branch_name?: string
      account_type: string
      is_primary: boolean
      is_verified: boolean
    }>>(`/staff/${userId}/bank-accounts`),

  addBankAccount: (userId: number | string, data: any) =>
    apiClient.post<{ success: boolean; message: string; id: number }>(`/staff/${userId}/bank-accounts`, data),

  setPrimaryBankAccount: (userId: number | string, accountId: number) =>
    apiClient.put<{ success: boolean; message: string }>(`/staff/${userId}/bank-accounts/${accountId}/set-primary`),

  deleteBankAccount: (userId: number | string, accountId: number) =>
    apiClient.delete<{ success: boolean; message: string }>(`/staff/${userId}/bank-accounts/${accountId}`),

  getKeyContacts: (userId: number | string) =>
    apiClient.get<Array<{
      id: number
      staff_profile_id: number
      contact_name: string
      relationship: string
      phone_primary: string
      phone_secondary?: string
      email?: string
      address?: string
      is_primary_emergency: boolean
    }>>(`/staff/${userId}/key-contacts`),

  addKeyContact: (userId: number | string, data: any) =>
    apiClient.post<{ success: boolean; message: string; id: number }>(`/staff/${userId}/key-contacts`, data),

  deleteKeyContact: (userId: number | string, contactId: number) =>
    apiClient.delete<{ success: boolean; message: string }>(`/staff/${userId}/key-contacts/${contactId}`),

  getAddresses: (userId: number | string) =>
    apiClient.get<Array<{
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
    }>>(`/staff/${userId}/addresses`),

  addAddress: (userId: number | string, data: any) =>
    apiClient.post<{ success: boolean; message: string; id: number }>(`/staff/${userId}/addresses`, data),

  setPrimaryAddress: (userId: number | string, addressId: number) =>
    apiClient.put<{ success: boolean; message: string }>(`/staff/${userId}/addresses/${addressId}/set-primary`),

  deleteAddress: (userId: number | string, addressId: number) =>
    apiClient.delete<{ success: boolean; message: string }>(`/staff/${userId}/addresses/${addressId}`),
}

// ─── SysAdmin Superuser Governance ───────────────────────────────────────────

export const sysadminApi = {
  getOverview: () =>
    apiClient.get<SysAdminOverview>('/sysadmin/overview'),

  getSecurityAuditLogs: (params?: {
    user_id?: number
    resource_type?: string
    severity?: string
    is_system_only?: boolean
    search?: string
    from_date?: string
    to_date?: string
    page?: number
    limit?: number
  }) => apiClient.get<SecurityAuditLogsResponse>('/sysadmin/security-audit-logs', { params }),

  executeUniversalEdit: (data: UniversalEditPayload) =>
    apiClient.post<{
      success: boolean
      message: string
      model_name: string
      record_id: number
      updated_fields: string[]
      audit_id: number
    }>('/sysadmin/universal-edit', data),

  getSystemSettings: () =>
    apiClient.get<SystemSettings>('/sysadmin/system-settings'),

  updateSystemSettings: (data: Partial<SystemSettings>) =>
    apiClient.put<{ success: boolean; message: string; data: Partial<SystemSettings> }>(
      '/sysadmin/system-settings',
      data
    ),
}

// ─── Institute Settings Workspace & Configuration ───────────────────────────

export const settingsApi = {
  getProfile: () =>
    apiClient.get<InstituteProfile>('/settings/profile'),

  updateProfile: (data: Partial<InstituteProfile>) =>
    apiClient.put<{ status: string; message: string; profile: InstituteProfile }>('/settings/profile', data),

  getAll: () =>
    apiClient.get<AllSettingsState>('/settings/all'),

  updateBatch: (category: string, settings: Record<string, any>, reason?: string) =>
    apiClient.put<{ status: string; message: string }>('/settings/batch', { category, settings, reason }),

  getLookups: (category?: string) =>
    apiClient.get<LookupsResponse>('/settings/lookups', { params: category ? { category } : {} }),

  createLookup: (data: Omit<LookupItem, 'id' | 'is_system'>) =>
    apiClient.post<{ status: string; message: string; item: LookupItem }>('/settings/lookups', data),

  updateLookup: (id: number, data: Partial<LookupItem>) =>
    apiClient.put<{ status: string; message: string; item: LookupItem }>(`/settings/lookups/${id}`, data),

  deleteLookup: (id: number) =>
    apiClient.delete<{ status: string; message: string }>(`/settings/lookups/${id}`),

  getAuditLogs: (params?: { category?: string; limit?: number }) =>
    apiClient.get<SettingAuditLogItem[]>('/settings/audit-logs', { params }),

  resetDefaults: (category: string) =>
    apiClient.post<{ status: string; message: string }>(`/settings/reset-defaults?category=${category}`),
}

// ─── Centralized Communication & Sharing Module ──────────────────────────────

export const communicationApi = {
  getTemplates: (params?: { category?: string; channel?: string }) =>
    apiClient.get<MessageTemplateItem[]>('/communication/templates', { params }),

  createTemplate: (data: Omit<MessageTemplateItem, 'id' | 'is_system' | 'created_at' | 'updated_at'>) =>
    apiClient.post<{ status: string; message: string; template: MessageTemplateItem }>('/communication/templates', data),

  updateTemplate: (id: number, data: Partial<MessageTemplateItem>) =>
    apiClient.put<{ status: string; message: string }>(`/communication/templates/${id}`, data),

  deleteTemplate: (id: number) =>
    apiClient.delete<{ status: string; message: string }>(`/communication/templates/${id}`),

  shareDocument: (data: ShareDocumentPayload) =>
    apiClient.post<ShareDocumentResponse>('/communication/share-document', data),

  getSharedDocument: (token: string, pin?: string) =>
    apiClient.get<any>(`/communication/shared-doc/${token}`, { params: pin ? { pin } : {} }),

  sendMessage: (data: SendMessagePayload) =>
    apiClient.post<{ status: string; message: string; dispatched_count: number; results: any[]; whatsapp_links: any[] }>(
      '/communication/send',
      data
    ),

  searchRecipients: (params: { query?: string; target_type?: string }) =>
    apiClient.get<RecipientItem[]>('/communication/recipients/search', { params }),

  getLogs: (params?: { channel?: string; status?: string; recipient_type?: string; search?: string; page?: number; limit?: number }) =>
    apiClient.get<CommunicationLogsResponse>('/communication/logs', { params }),

  retryLog: (id: number) =>
    apiClient.post<{ status: string; message: string }>(`/communication/logs/${id}/retry`),

  getDiagnostics: () =>
    apiClient.get<ChannelDiagnostics>('/communication/diagnostics'),

  testChannel: (data: { channel: string; destination: string; message?: string }) =>
    apiClient.post<{ status: string; channel: string; destination: string; dispatch_status: string; reference_id?: string }>(
      '/communication/diagnostics/test',
      data
    ),

  getAutomationRules: () =>
    apiClient.get<AutomationRules>('/communication/automation/rules'),

  updateAutomationRules: (data: Partial<AutomationRules>) =>
    apiClient.post<{ status: string; message: string; rules: AutomationRules }>('/communication/automation/rules', data),

  previewFeeReminders: (params?: { min_balance?: number; search?: string }) =>
    apiClient.post<{ count: number; min_balance: number; queue: FeeReminderQueueItem[] }>('/communication/automation/fee-reminders/preview', null, { params }),

  dispatchFeeReminders: (data: { reminders: FeeReminderQueueItem[]; channel?: string }) =>
    apiClient.post<{ status: string; message: string; count: number; results: any[] }>('/communication/automation/fee-reminders/dispatch', data),

  dispatchAttendanceAlert: (data: { student_id: number; date: string; status: string; remarks?: string }) =>
    apiClient.post<{ status: string; message: string; alert: any }>('/communication/automation/attendance-alerts', data),
}

// ─── Release & Change Management ─────────────────────────────────────────────

export const releasesApi = {
  getCurrent: () =>
    apiClient.get<SystemReleaseCurrent>('/releases/current'),

  list: (params?: { status?: string; environment?: string; page?: number; limit?: number }) =>
    apiClient.get<{ total: number; page: number; limit: number; items: SystemReleaseListItem[] }>('/releases/', { params }),

  getPendingChanges: () =>
    apiClient.get<PendingChangesResponse>('/releases/pending-changes'),

  get: (id: number | string) =>
    apiClient.get<SystemReleaseDetail>(`/releases/${id}`),

  generateDraft: (data: {
    version?: string
    title?: string
    environment?: string
    bump_type?: string
    is_critical_security?: boolean
    migration_plan?: string
  }) => apiClient.post<{ message: string; release_id: number; version: string; build_number: string; status: string }>(
    '/releases/generate-draft',
    data
  ),

  update: (id: number | string, data: {
    title?: string
    release_notes_markdown?: string
    release_notes_structured?: any
    migration_plan?: string
    is_critical_security?: boolean
  }) => apiClient.put<{ message: string; release_id: number }>(`/releases/${id}`, data),

  validate: (id: number | string) =>
    apiClient.post<{ release_id: number; version: string; status: string; validation_status: string; checks: any }>(
      `/releases/${id}/validate`
    ),

  promoteRc: (id: number | string) =>
    apiClient.post<{ message: string; status: string; build_number: string }>(`/releases/${id}/promote-rc`),

  approve: (id: number | string) =>
    apiClient.post<{ message: string; status: string; approved_at: string }>(`/releases/${id}/approve`),

  publish: (id: number | string) =>
    apiClient.post<{ message: string; status: string; version: string; build_number: string; published_at: string }>(
      `/releases/${id}/publish`
    ),

  rollback: (id: number | string, data: { reason: string; target_version?: string }) =>
    apiClient.post<{ message: string; status: string; rollback_target_version: string; rollback_reason: string; rolled_back_at: string }>(
      `/releases/${id}/rollback`,
      data
    ),

  getAudit: (id: number | string) =>
    apiClient.get<ReleaseAuditLogItem[]>(`/releases/${id}/audit`),
}


// ─── Teacher Payroll ────────────────────────────────────────────────────────

export const teacherPayrollApi = {
  getTeachers: () => apiClient.get<any[]>('/teacher-payroll/teachers'),
  getProfiles: () => apiClient.get<any[]>('/teacher-payroll/profiles'),
  getProfileDetails: (teacherUserId: number | string) =>
    apiClient.get<any>(`/teacher-payroll/profiles/${teacherUserId}`),
  updateProfile: (teacherUserId: number | string, data: any) =>
    apiClient.put<any>(`/teacher-payroll/profiles/${teacherUserId}`, data),
  addMilestone: (profileId: number | string, data: any) =>
    apiClient.post<any>(`/teacher-payroll/profiles/${profileId}/milestones`, data),
  updateMilestone: (milestoneId: number | string, data: any) =>
    apiClient.put<any>(`/teacher-payroll/milestones/${milestoneId}`, data),

  getSessions: (params?: any) => apiClient.get<any>('/teacher-payroll/sessions', { params }),
  createSession: (data: any) => apiClient.post<any>('/teacher-payroll/sessions', data),
  updateSession: (sessionId: number | string, data: any) =>
    apiClient.put<any>(`/teacher-payroll/sessions/${sessionId}`, data),
  bulkApproveSessions: (sessionIds: number[]) =>
    apiClient.post<any>('/teacher-payroll/sessions/bulk-approve', { session_ids: sessionIds }),
  rejectSession: (sessionId: number | string, reason: string) =>
    apiClient.post<any>(`/teacher-payroll/sessions/${sessionId}/reject`, { reason }),
  assignSubstitute: (sessionId: number | string, substituteTeacherId: number, reason?: string) =>
    apiClient.post<any>(`/teacher-payroll/sessions/${sessionId}/substitute`, {
      substitute_teacher_id: substituteTeacherId,
      reason,
    }),

  getMonthlyPayrolls: (params?: any) => apiClient.get<any[]>('/teacher-payroll/monthly', { params }),
  getPayrollDetails: (payrollId: number | string) =>
    apiClient.get<any>(`/teacher-payroll/monthly/${payrollId}`),
  calculatePayroll: (data: { teacher_user_id: number; month: number; year: number; academic_year_id?: number }) =>
    apiClient.post<any>('/teacher-payroll/monthly/calculate', data),
  bulkCalculatePayroll: (data: { month: number; year: number; academic_year_id?: number }) =>
    apiClient.post<any>('/teacher-payroll/monthly/bulk-calculate', data),
  submitPayroll: (payrollId: number | string) =>
    apiClient.post<any>(`/teacher-payroll/monthly/${payrollId}/submit`),
  approvePayroll: (payrollId: number | string) =>
    apiClient.post<any>(`/teacher-payroll/monthly/${payrollId}/approve`),
  finalizePayroll: (payrollId: number | string) =>
    apiClient.post<any>(`/teacher-payroll/monthly/${payrollId}/finalize`),
  adjustPayroll: (payrollId: number | string, data: any) =>
    apiClient.post<any>(`/teacher-payroll/monthly/${payrollId}/adjust`, data),

  getVouchers: (params?: any) => apiClient.get<any[]>('/teacher-payroll/vouchers', { params }),
  recordVoucher: (payrollId: number | string, data: any) =>
    apiClient.post<any>(`/teacher-payroll/monthly/${payrollId}/vouchers`, data),
  reverseVoucher: (voucherId: number | string, reversalReason: string) =>
    apiClient.post<any>(`/teacher-payroll/vouchers/${voucherId}/reverse`, { reversal_reason: reversalReason }),

  getReport: (reportType: string, params?: any) =>
    apiClient.get<any[]>(`/teacher-payroll/reports/${reportType}`, { params }),
  exportReportUrl: (reportType: string, params?: any) => {
    const q = new URLSearchParams()
    if (params) {
      Object.keys(params).forEach((k) => {
        if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
          q.append(k, String(params[k]))
        }
      })
    }
    return `/api/v1/teacher-payroll/reports/${reportType}/export?${q.toString()}`
  }
}


// ─── CodeX Engine ────────────────────────────────────────────────────────────

export const codexApi = {
  getConfig: () => apiClient.get<CodexConfigResponse>('/codex/config'),
  updateConfig: (data: any) =>
    apiClient.put<{ message: string; config: any }>('/codex/config', data),
  getProfiles: () => apiClient.get<CodexMappingProfile[]>('/codex/profiles'),
  createProfile: (data: any) => apiClient.post<{ message: string; id: number }>('/codex/profiles', data),
  updateProfile: (profileId: number | string, data: any) =>
    apiClient.put<{ message: string; version: number }>(`/codex/profiles/${profileId}`, data),
  getProfileVersions: (profileId: number | string) =>
    apiClient.get<CodexMappingVersion[]>(`/codex/profiles/${profileId}/versions`),
  rollbackProfile: (profileId: number | string, targetVersion: number) =>
    apiClient.post<{ message: string }>(`/codex/profiles/${profileId}/rollback/${targetVersion}`),
  getScopes: () => apiClient.get<CodexScopeAssignment[]>('/codex/scopes'),
  saveScope: (data: any) => apiClient.post<{ message: string; id: number }>('/codex/scopes', data),
  deleteScope: (scopeId: number | string) =>
    apiClient.delete<{ message: string }>(`/codex/scopes/${scopeId}`),
  encode: (data: { value: any; profile_id?: number }) =>
    apiClient.post<{ raw_value: any; encoded_value: string; profile_id: number; version: number }>('/codex/encode', data),
  decode: (data: { code: string; profile_id?: number; version?: number; pin?: string }) =>
    apiClient.post<{ code: string; decoded_value: number; formatted_value: string; version_used: number }>('/codex/decode', data),
  generateQr: (data: { encoded_payload: string; actual_value?: number; duration_seconds?: number; requires_pin?: boolean }) =>
    apiClient.post<{ token: string; encoded_payload: string; expires_at: string; qr_data: string }>('/codex/generate-qr', data),
  getAuditLogs: (params?: { limit?: number; action?: string; search?: string }) =>
    apiClient.get<CodexAuditLogItem[]>('/codex/audit-logs', { params }),
  getUserStatus: (module?: string) =>
    apiClient.get<{ is_enabled: boolean; visibility_mode: string; can_decode: boolean; can_generate_qr: boolean; reason: string }>('/codex/user-status', { params: { module } }),
}

// ─── Lead Management & CRM ───────────────────────────────────────────────────

export const leadsApi = {
  getLeads: (params?: {
    stage?: string
    priority?: string
    source?: string
    assigned_to_id?: number
    standard_id?: number
    academic_year_id?: number
    search?: string
    follow_up_filter?: string
    page?: number
    limit?: number
  }) => apiClient.get<{ items: LeadItem[]; total: number; page: number; limit: number; total_pages: number }>('/leads', { params }),

  getKanban: (params?: { source?: string; assigned_to_id?: number }) =>
    apiClient.get<LeadKanbanResponse>('/leads/kanban', { params }),

  getMetrics: () =>
    apiClient.get<LeadMetricsSummary>('/leads/metrics/summary'),

  getLeadDossier: (id: number | string) =>
    apiClient.get<LeadDossierResponse>(`/leads/${id}`),

  createLead: (data: any) =>
    apiClient.post<LeadItem>('/leads', data),

  updateLead: (id: number | string, data: any) =>
    apiClient.put<LeadItem>(`/leads/${id}`, data),

  updateStage: (id: number | string, data: { stage: string; remarks?: string; lost_reason?: string; lost_notes?: string }) =>
    apiClient.patch<LeadItem>(`/leads/${id}/stage`, data),

  addFollowUp: (id: number | string, data: { follow_up_type: string; outcome?: string; remarks: string; next_follow_up_at?: string | null; update_lead_stage?: string }) =>
    apiClient.post<{ success: boolean; message: string }>(`/leads/${id}/follow-ups`, data),

  scheduleDemo: (id: number | string, data: { standard_id?: number; subject_id?: number; teacher_id?: number; scheduled_at: string; feedback?: string }) =>
    apiClient.post<{ success: boolean; message: string }>(`/leads/${id}/demo-classes`, data),

  scheduleDemoClass: (id: number | string, data: { standard_id?: number; subject_id?: number; teacher_id?: number; scheduled_at: string; feedback?: string }) =>
    apiClient.post<{ success: boolean; message: string }>(`/leads/${id}/demo-classes`, data),

  getFollowUps: (params?: {
    status?: string
    follow_up_type?: string
    counsellor_id?: number
    search?: string
    limit?: number
    offset?: number
  }) => apiClient.get<FollowUpQueueResponse>('/leads/follow-ups', { params }),

  getDemoClasses: (params?: {
    status?: string
    teacher_id?: number
    standard_id?: number
    search?: string
    limit?: number
    offset?: number
  }) => apiClient.get<DemoClassQueueResponse>('/leads/demo-classes', { params }),

  updateDemoClass: (demoId: number | string, data: { status?: string; rating?: number; feedback?: string; scheduled_at?: string }) =>
    apiClient.put<{ success: boolean; message: string; demo: any }>(`/leads/demo-classes/${demoId}`, data),

  getSourcesSummary: () =>
    apiClient.get<LeadSourcesResponse>('/leads/sources/summary'),

  getCampaignsSummary: () =>
    apiClient.get<CampaignsResponse>('/leads/campaigns/summary'),

  getReportsAnalytics: () =>
    apiClient.get<CrmReportsAnalytics>('/leads/reports/analytics'),

  getCrmConfig: () =>
    apiClient.get<CrmConfigSettings>('/leads/settings/config'),

  updateCrmConfig: (data: Partial<CrmConfigSettings>) =>
    apiClient.put<{ success: boolean; message: string; config: CrmConfigSettings }>('/leads/settings/config', data),

  convertToAdmission: (id: number | string, data: any) =>
    apiClient.post<{ success: boolean; message: string; student_id: number; admission_number: string; student_name: string }>(`/leads/${id}/convert`, data),

  logCommunication: (id: number | string, data: { channel: string; content: string; subject?: string; recipient_name?: string; recipient_destination?: string }) =>
    apiClient.post<{ success: boolean; message: string; communication_id: number }>(`/leads/${id}/communications`, data),

  seedDemo: (confirm = true) =>
    apiClient.post<{ success: boolean; message: string; seeded_count: number }>('/leads/seed-demo', null, { params: { confirm } }),

  deleteLead: (id: number | string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/leads/${id}`),
}

export interface TrainingStatusResponse {
  is_enabled: boolean
  reset_policy: string
  inactivity_timeout_minutes: number
  daily_reset_time: string
  dataset_version: string
  institution_id: number
  institution_code: string
  record_counts: {
    leads: number
    students: number
    receipts: number
    follow_ups: number
  }
  active_sessions_count: number
  active_sessions: Array<{
    id: number
    user_id: number
    started_at: string | null
    last_active_at: string | null
  }>
  last_reset: {
    timestamp: string
    status: string
    version: string
  } | null
}

export const trainingApi = {
  getStatus: () => apiClient.get<TrainingStatusResponse>('/training/status'),
  pingSession: () => apiClient.post<{ status: string; session_id: number; last_active_at: string }>('/training/session/ping'),
  exitSession: () => apiClient.post<{ status: string }>('/training/session/exit'),
  resetEnvironment: (data: { force?: boolean; restore_baseline?: boolean; dataset_version?: string }) =>
    apiClient.post<{ status: string; dataset_version: string; records_cleared: number; records_seeded: number; duration_ms: number; timestamp: string }>('/training/reset', data),
  seedDataset: () => apiClient.post<{ status: string; details: any }>('/training/seed'),
  getResetLogs: (limit = 50) => apiClient.get<Array<any>>('/training/reset-logs', { params: { limit } }),
  updateConfig: (data: { is_enabled?: boolean; reset_policy?: string; inactivity_timeout_minutes?: number; daily_reset_time?: string }) =>
    apiClient.put<{ status: string; is_enabled: boolean; reset_policy: string; inactivity_timeout_minutes: number; daily_reset_time: string }>('/training/config', data),
}

export const navigationApi = {
  getConfig: (institutionId?: number) =>
    apiClient.get<NavigationConfigResponse>('/navigation/config', {
      params: institutionId ? { institution_id: institutionId } : {},
    }),

  updatePreferences: (
    payload: {
      navigation_mode?: string
      pinned_items?: string[]
      hidden_items?: string[]
      custom_groups?: Array<{ id?: string; name: string; items: string[] }>
      item_order?: string[]
    },
    institutionId?: number
  ) =>
    apiClient.put<NavigationConfigResponse>('/navigation/preferences', payload, {
      params: institutionId ? { institution_id: institutionId } : {},
    }),

  resetPreferences: (institutionId?: number) =>
    apiClient.post<NavigationConfigResponse>('/navigation/reset-preferences', null, {
      params: institutionId ? { institution_id: institutionId } : {},
    }),

  trackActivity: (
    payload: { module_key: string; route_path: string; label?: string },
    institutionId?: number
  ) =>
    apiClient.post<{ status: string; recorded: boolean }>('/navigation/track-activity', payload, {
      params: institutionId ? { institution_id: institutionId } : {},
    }),

  getSuggestions: (institutionId?: number) =>
    apiClient.get<{ suggestions: NavigationSuggestion[] }>('/navigation/suggestions', {
      params: institutionId ? { institution_id: institutionId } : {},
    }),

  dismissSuggestion: (suggestionId: string, institutionId?: number) =>
    apiClient.post<{ status: string; message: string }>(
      '/navigation/dismiss-suggestion',
      { suggestion_id: suggestionId },
      { params: institutionId ? { institution_id: institutionId } : {} }
    ),

  getRecent: (limit = 8, institutionId?: number) =>
    apiClient.get<{ recent_visits: RecentVisitItem[] }>('/navigation/recent', {
      params: { limit, ...(institutionId ? { institution_id: institutionId } : {}) },
    }),

  getAdminPolicy: (institutionId?: number) =>
    apiClient.get<{ policy: NavigationPolicy }>('/navigation/admin/policy', {
      params: institutionId ? { institution_id: institutionId } : {},
    }),

  updateAdminPolicy: (payload: Partial<NavigationPolicy> & { reason?: string }, institutionId?: number) =>
    apiClient.put<{ status: string; message: string; policy: NavigationPolicy }>(
      '/navigation/admin/policy',
      payload,
      { params: institutionId ? { institution_id: institutionId } : {} }
    ),

  resetAllUsers: (institutionId?: number) =>
    apiClient.post<{ status: string; message: string }>('/navigation/admin/reset-all-users', null, {
      params: institutionId ? { institution_id: institutionId } : {},
    }),
}

// ─── Safe Delete & Data Integrity Governance ─────────────────────────────────

export interface DeletionEligibilityReport {
  entity_type: string
  entity_id: number | string
  entity_name: string
  is_eligible: boolean
  block_category?: 'linked_records' | 'transaction_history' | 'configuration_dependency' | 'system_protected' | null
  block_reason?: string | null
  dependent_counts: Record<string, number>
  dependent_details: string[]
  can_deactivate: boolean
  can_archive: boolean
  recommended_action: 'delete' | 'deactivate' | 'archive' | 'reversal'
  reversal_guidance?: string | null
}

export const governanceApi = {
  checkSafeDelete: (entity_type: string, entity_id: number | string) =>
    apiClient.get<DeletionEligibilityReport>('/governance/safe-delete/check', {
      params: { entity_type, entity_id },
    }),

  executeSafeDelete: (entity_type: string, entity_id: number | string, reason?: string) =>
    apiClient.post<{ success: boolean; message: string; entity_type: string; entity_id: number | string }>(
      '/governance/safe-delete/execute',
      { entity_type, entity_id, reason }
    ),

  executeSafeDeactivate: (entity_type: string, entity_id: number | string, reason?: string) =>
    apiClient.post<{ success: boolean; message: string; entity_type: string; entity_id: number | string; is_active: boolean }>(
      '/governance/safe-delete/deactivate',
      { entity_type, entity_id, reason }
    ),

  executeSafeArchive: (entity_type: string, entity_id: number | string, reason?: string) =>
    apiClient.post<{ success: boolean; message: string; entity_type: string; entity_id: number | string; status: string }>(
      '/governance/safe-delete/archive',
      { entity_type, entity_id, reason }
    ),

  getSafeDeleteAuditLogs: (params?: { resource_type?: string; limit?: number }) =>
    apiClient.get<any[]>('/governance/safe-delete/audit-logs', { params }),
}


