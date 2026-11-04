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
 * @updated     2026-11-04
 *
 * @description Centralized API client functions mapping all backend endpoints for academic, fees, and students.
 */

import apiClient from './client'
import type {
  Institution, AcademicYear, Board, Standard, Division,
  Student, FeeCategory, FeeStructure, FeeInvoice,
  FeeInstallment, Payment, Receipt, DashboardStats,
  FeeCollectionRow, OutstandingRow, PaginatedResponse, User,
  FeeRegisterPreviewResponse, FeeRegisterImportExecutionResponse, FeeRegisterImportLog,
  StudentPortalDashboard, StudentAdminProfile, TimetableSlot, StudyMaterialItem,
  StudentDocumentItem, TestResultItem, UpcomingTestItem,
  FeeOverviewData, FeeRegisterEntry, PaymentReceiptListItem, PaymentTransactionItem,
  AcademicOverviewResponse, BatchRosterResponse,
  SupportedEntity, ImportPreviewResponse, ImportExecuteResult, ImportHistoryItem,
  ImportHistoryDetail, ExportFilterParams,
  UserManagementStats, UserListItem, UserListResponse, UserProfileWorkspaceData,
  UserCreatePayload, UserUpdatePayload,
  AcademicSubject, AcademicTimetableEntry, EnrollmentRecord, EnrollmentStats,
  UnassignedStudent, BatchCapacityReportRow, AcademicDistributionReportRow, FacultyLoadReportRow,
  StaffMember, StaffProfileDetail, TeacherAssignmentItem, StaffAttendanceItem,
  StaffDailyAttendanceResponse, StaffLeaveItem, StaffDocumentTemplate, StaffDocumentRenderResponse,
  SysAdminOverview, SecurityAuditLogItem, SecurityAuditLogsResponse, UniversalEditPayload, SystemSettings,
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
    standard_id?: number | string
    division_id?: number | string
  }) => apiClient.get<DashboardStats>('/dashboard/stats', { params }),
}

// ─── Institutions ─────────────────────────────────────────────────────────────

export const institutionsApi = {
  list: () => apiClient.get<Institution[]>('/institutions/'),
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
}

// ─── Timetable ────────────────────────────────────────────────────────────────

export const timetableApi = {
  list: (params?: {
    division_id?: number | string
    standard_id?: number | string
    board_id?: number | string
    day_of_week?: string
    room_number?: string
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
  getRoster: (id: number | string) =>
    apiClient.get<BatchRosterResponse>(`/divisions/${id}/roster`),
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
  getProfile: (id: number | string) =>
    apiClient.get<StudentAdminProfile>(`/students/${id}/profile`),
  addDocument: (
    id: number | string,
    data: { title: string; document_type: string; file_url: string; status?: string }
  ) => apiClient.post<StudentDocumentItem>(`/students/${id}/documents`, data),
  deleteDocument: (studentId: number | string, docId: number | string) =>
    apiClient.delete(`/students/${studentId}/documents/${docId}`),
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
    search?: string
  }) => apiClient.get<FeeRegisterEntry[]>('/fees/register', { params }),
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
    allocations: { invoice_id: number | string; installment_id?: number | string; amount: number }[]
  }) => apiClient.post<{ payment_id: number; receipt_number: string; amount: number }>('/payments/', data),
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
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export const reportsApi = {
  feeCollection: (params?: { academic_year_id?: number | string; institution_id?: number | string }) =>
    apiClient.get<FeeCollectionRow[]>('/reports/fee-collection', { params }),
  outstanding: (params?: { academic_year_id?: number | string; institution_id?: number | string }) =>
    apiClient.get<OutstandingRow[]>('/reports/outstanding', { params }),
  exportFeeCollection: (params?: {
    format?: string
    academic_year_id?: number | string
    institution_id?: number | string
  }) =>
    apiClient.get('/reports/fee-collection/export', {
      params,
      responseType: 'blob',
    }),
  paymentsSummary: (params?: { academic_year_id?: number | string }) =>
    apiClient.get('/reports/payments-summary', { params }),
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
    apiClient.post<{ success: boolean; message: string; user_id: number; employee_id: string }>(
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
