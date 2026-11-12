/**
 * @file        HomeworkWorkspace.test.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.test
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-11
 * @updated     2026-11-12
 *
 * @description Comprehensive Vitest test suite for Homework & Assignment Management System workspace.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import HomeworkWorkspace from '../pages/HomeworkWorkspace'
import { homeworkApi, standardsApi, divisionsApi, subjectsApi, usersApi } from '../api/endpoints'

vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 1, role: 'teacher', username: 'teacher1', first_name: 'Jane', last_name: 'Doe' },
    selectedInstitutionId: 1,
    selectedAcademicYearId: 1,
  }),
  isUserAdmin: () => true,
}))

vi.mock('../store/editModeStore', () => ({
  useEditModeStore: (selector: any) =>
    selector({
      scopes: { 'homework:workspace': true },
      enableEditMode: vi.fn(),
      disableEditMode: vi.fn(),
    }),
}))

vi.mock('../api/endpoints', () => ({
  standardsApi: {
    list: vi.fn(),
  },
  divisionsApi: {
    list: vi.fn(),
  },
  subjectsApi: {
    list: vi.fn(),
  },
  usersApi: {
    list: vi.fn(),
  },
  homeworkApi: {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    uploadFile: vi.fn(),
    getDownloadUrl: (u: string) => u,
    searchStudents: vi.fn(),
    previewRecipients: vi.fn(),
    listAssignments: vi.fn(),
    createAssignment: vi.fn(),
    getAssignment: vi.fn(),
    publishAssignment: vi.fn(),
    closeAssignment: vi.fn(),
    reopenAssignment: vi.fn(),
    syncLateJoiners: vi.fn(),
    getCheckingRegister: vi.fn(),
    evaluateRecord: vi.fn(),
    checkStudentPhysicalHomework: vi.fn(),
    bulkCheckPhysicalHomework: vi.fn(),
    submitHomework: vi.fn(),
    requestResubmission: vi.fn(),
    extendDueDate: vi.fn(),
    exemptStudent: vi.fn(),
    getTeacherDashboard: vi.fn(),
    getDailyRegisterReport: vi.fn(),
    getBatchReport: vi.fn(),
    getInstituteAnalytics: vi.fn(),
    getMyNotifications: vi.fn(),
    runReminders: vi.fn(),
    listTemplates: vi.fn(),
  },
}))

describe('HomeworkWorkspace Component Suite', () => {
  let queryClient: QueryClient

  const mockAssignments = [
    {
      id: 1,
      assignment_code: 'HW-2026-0001',
      title: 'Quadratic Equations Exercise 4.2',
      standard_id: 10,
      standard_name: 'Class X',
      subject_id: 1,
      subject_name: 'Mathematics',
      teacher_id: 1,
      teacher_name: 'Jane Doe',
      division_name: 'Batch A',
      recipient_type: 'batch',
      recipient_count: 25,
      submission_method: 'physical_notebook',
      due_date: '2026-11-15',
      due_time: '23:59',
      max_marks: 25,
      is_published: true,
      difficulty_level: 'medium',
      priority: 'normal',
      status: 'active',
      summary: {
        total_assigned: 25,
        done_count: 15,
        incomplete_count: 3,
        not_done_count: 2,
        absent_count: 1,
        excused_count: 0,
        pending_count: 4,
        completion_rate: 60.0,
      },
      created_at: '2026-11-11T10:00:00Z',
    },
  ]

  const mockStudents = [
    {
      record_id: 101,
      student_id: 501,
      student_name: 'Aarav Sharma',
      admission_number: 'ADM-101',
      roll_number: '12',
      status: 'assigned',
      review_status: 'pending',
      marks_obtained: null,
      max_marks: 25,
      teacher_remarks: null,
      exemption_reason: null,
      resubmission_count: 0,
      is_extended: false,
      is_exempted: false,
    },
    {
      record_id: 102,
      student_id: 502,
      student_name: 'Diya Patel',
      admission_number: 'ADM-102',
      roll_number: '15',
      status: 'completed',
      review_status: 'checked',
      marks_obtained: 24,
      max_marks: 25,
      teacher_remarks: 'Neat working',
      exemption_reason: null,
      resubmission_count: 0,
      is_extended: false,
      is_exempted: false,
    },
  ]

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    vi.clearAllMocks()

    vi.mocked(standardsApi.list).mockResolvedValue({
      data: [{ id: 10, name: 'Class X', level: 10 }],
    } as any)
    vi.mocked(divisionsApi.list).mockResolvedValue({
      data: [{ id: 20, name: 'Batch A', standard_id: 10 }],
    } as any)
    vi.mocked(subjectsApi.list).mockResolvedValue({
      data: [{ id: 1, name: 'Mathematics', code: 'MATH' }],
    } as any)
    vi.mocked(usersApi.list).mockResolvedValue({
      data: { items: [{ id: 1, first_name: 'Jane', last_name: 'Doe' }], total: 1 },
    } as any)

    vi.mocked(homeworkApi.getTeacherDashboard).mockResolvedValue({
      data: {
        total_assigned: 12,
        assigned_today: 2,
        active_assignments: 5,
        awaiting_check: 8,
        overdue_count: 1,
      },
    } as any)

    vi.mocked(homeworkApi.listAssignments).mockResolvedValue({
      data: { items: mockAssignments, total: 1, page: 1, limit: 20 },
    } as any)

    vi.mocked(homeworkApi.getCheckingRegister).mockResolvedValue({
      data: {
        assignment: mockAssignments[0],
        students: mockStudents,
        total: 2,
      },
    } as any)

    vi.mocked(homeworkApi.getSettings).mockResolvedValue({
      data: {
        allowed_extensions: ['pdf', 'doc', 'docx', 'png', 'jpg'],
        max_file_size_mb: 10,
        custom_assignment_types: [],
        available_assignment_types: ['homework', 'classwork', 'worksheet', 'project'],
        default_late_joiner_policy: 'manual',
        reminder_hours_before_due: 24,
        pending_eval_alert_threshold: 5,
        allow_parent_portal_view: true,
      },
    } as any)

    vi.mocked(homeworkApi.getBatchReport).mockResolvedValue({
      data: {
        assignment_id: 1,
        assignment_code: 'HW-2026-0001',
        title: 'Quadratic Equations Exercise 4.2',
        due_date: '2026-11-15',
        max_marks: 25,
        original_recipient_count: 25,
        summary: mockAssignments[0].summary,
        rows: [
          {
            record_id: 101,
            student_id: 501,
            student_name: 'Aarav Sharma',
            admission_number: 'ADM-101',
            roll_number: '12',
            assignment_status: 'assigned',
            submission_status: 'pending',
            marks_obtained: null,
            max_marks: 25,
            feedback: null,
            review_status: 'pending',
            is_late_addition: false,
            submission_version: 0,
          },
        ],
      },
    } as any)

    vi.mocked(homeworkApi.listTemplates).mockResolvedValue({
      data: {
        templates: [
          {
            id: 99,
            title: 'Weekly Formula Drill',
            assignment_type: 'practice',
            standard_id: 10,
            subject_id: 1,
            topic: 'Algebra',
            max_marks: 20,
            submission_method: 'pdf_document',
          },
        ],
      },
    } as any)

    vi.mocked(homeworkApi.getDailyRegisterReport).mockResolvedValue({
      data: {
        date: '2026-11-11',
        total_assignments: 1,
        items: [
          {
            assignment_code: 'HW-2026-0001',
            title: 'Quadratic Equations Exercise 4.2',
            subject_name: 'Mathematics',
            standard_name: 'Class X',
            division_name: 'Batch A',
            teacher_name: 'Jane Doe',
            submission_method: 'physical_notebook',
            total_students: 25,
            done_count: 15,
            incomplete_count: 3,
            not_done_count: 2,
            absent_count: 1,
            completion_rate: 60.0,
          },
        ],
      },
    } as any)
  })

  it('renders Homework Studio workspace with KPI summary cards', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/homework']}>
          <HomeworkWorkspace />
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByText('Homework & Assignment Studio')).toBeDefined()
    await waitFor(() => {
      expect(screen.getByText('Quadratic Equations Exercise 4.2')).toBeDefined()
      expect(screen.getByText('HW-2026-0001')).toBeDefined()
      expect(screen.getByText('Active Homework')).toBeDefined()
    })
  })

  it('navigates to Checking Register tab and renders student records', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/homework?tab=checking&assignment_id=1']}>
          <HomeworkWorkspace />
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Active Assignment to Check')).toBeDefined()
      expect(screen.getByText('Aarav Sharma')).toBeDefined()
      expect(screen.getByText('Diya Patel')).toBeDefined()
      expect(screen.getByText('ADM-101')).toBeDefined()
    })
  })

  it('navigates to Daily Homework Register report tab', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/homework?tab=reports']}>
          <HomeworkWorkspace />
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Print Homework Register')).toBeDefined()
      expect(screen.getByText('All Batches')).toBeDefined()
    })
  })

  it('renders Create Homework tab with Batch, Individual Student & Selected Group target selector', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/homework/create']}>
          <HomeworkWorkspace />
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Create Homework or Assignment')).toBeDefined()
      expect(screen.getByText('Review Recipient Count')).toBeDefined()
      expect(screen.getByText('Save as Draft')).toBeDefined()
      expect(screen.getByText('Publish & Notify Students')).toBeDefined()
    })
  })

  it('renders Digital Submissions tab and Templates Library tab without dead routes', async () => {
    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/homework/submissions?assignment_id=1']}>
          <HomeworkWorkspace />
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Digital Submissions')).toBeDefined()
    })
    unmount()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/homework/templates']}>
          <HomeworkWorkspace />
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Reusable Homework & Worksheet Templates')).toBeDefined()
      expect(screen.getByText('Weekly Formula Drill')).toBeDefined()
    })
  })
})
