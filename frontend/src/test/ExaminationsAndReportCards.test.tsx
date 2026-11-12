/**
 * @file        ExaminationsAndReportCards.test.tsx
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
 * @created     2026-11-06
 * @updated     2026-11-13
 *
 * @description Vitest test suite for Examinations workspace, Marks Entry grid, Performance Analytics, and Graphical Report Cards.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ReportCardModal from '../components/ReportCardModal'
import ExaminationsPage from '../pages/Examinations'
import { examinationsApi, standardsApi, academicYearsApi } from '../api/endpoints'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 1, role: 'admin', username: 'admin', first_name: 'System', last_name: 'Admin' },
    selectedInstitutionId: 1,
    selectedAcademicYearId: 1,
  }),
  isUserAdmin: () => true,
}))

vi.mock('../api/endpoints', () => ({
  standardsApi: {
    list: vi.fn(),
  },
  academicYearsApi: {
    list: vi.fn(),
  },
  examinationsApi: {
    list: vi.fn(),
    create: vi.fn(),
    getMarks: vi.fn(),
    saveMarks: vi.fn(),
    getAnalytics: vi.fn(),
    getReportCard: vi.fn(),
    getBatchReportCards: vi.fn(),
    getCumulativeReport: vi.fn(),
    getPolicies: vi.fn(),
    savePolicies: vi.fn(),
  },
}))

describe('Examinations, Marks Entry, Analytics and Report Cards', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    vi.clearAllMocks()
  })

  const mockReportCardData = {
    student: {
      id: 101,
      admission_number: 'ADM-2026-001',
      full_name: 'Aarav Sharma',
      standard_name: 'Class 10',
      division_name: 'Division A',
      roll_number: '10A01',
      guardian_name: 'Rajesh Sharma',
      guardian_phone: '9876543210',
    },
    examination: {
      id: 1,
      name: 'Mid-Term Assessment 2026',
      exam_type: 'Mid-Term',
    },
    institution: {
      name: 'Prashant Academy Coaching Institute',
      short_name: 'Prashant Academy',
      tagline: 'Excellence in Coaching & Mentorship',
      address: '123 Knowledge Park',
      city: 'Pune',
      phone: '020-12345678',
    },
    subjects: [
      {
        subject_id: 1,
        subject_name: 'Mathematics',
        subject_code: 'MATH10',
        max_marks: 100,
        passing_marks: 35,
        marks_obtained: '95',
        percentage: 95,
        grade: 'A+',
        status: 'PASS',
        remarks: 'Outstanding logical reasoning',
      },
      {
        subject_id: 2,
        subject_name: 'Physics',
        subject_code: 'PHY10',
        max_marks: 100,
        passing_marks: 35,
        marks_obtained: '88',
        percentage: 88,
        grade: 'A',
        status: 'PASS',
        remarks: 'Excellent numerical problem solving',
      },
    ],
    summary: {
      total_max_marks: 200,
      total_obtained: 183,
      percentage: 91.5,
      grade: 'A+',
      result: 'PASSED',
      class_rank: '#1 of 25',
      total_candidates: 25,
    },
  }

  it('renders student report card modal with transcript details, marks table, and summary', async () => {
    render(
      <ReportCardModal
        isOpen={true}
        onClose={vi.fn()}
        initialData={mockReportCardData}
      />
    )

    expect(screen.getByText('Student Academic Report Card')).toBeDefined()
    expect(screen.getByText('Prashant Academy Coaching Institute')).toBeDefined()
    expect(screen.getByText('Aarav Sharma')).toBeDefined()
    expect(screen.getByText('10A01 / ADM-2026-001')).toBeDefined()
    expect(screen.getByText('Mathematics')).toBeDefined()
    expect(screen.getByText('95')).toBeDefined()
    expect(screen.getByText('Physics')).toBeDefined()
    expect(screen.getByText('88')).toBeDefined()
    expect(screen.getByText('91.5%')).toBeDefined()
    expect(screen.getByText('#1 of 25')).toBeDefined()
    expect(screen.getByText('PASSED')).toBeDefined()
  })

  it('renders examinations list with action buttons for marks entry and analytics', async () => {
    vi.mocked(standardsApi.list).mockResolvedValue({
      data: [{ id: 1, name: 'Class 10', code: 'C10' }] as any,
    } as any)
    vi.mocked(academicYearsApi.list).mockResolvedValue({
      data: [{ id: 1, name: '2026-2027', is_current: true }] as any,
    } as any)
    vi.mocked(examinationsApi.list).mockResolvedValue({
      data: [
        {
          id: 5,
          name: 'Mid-Term Assessment 2026',
          exam_type: 'Mid-Term',
          standard_name: 'Class 10',
          max_marks: 100,
          passing_marks: 35,
        },
      ] as any,
    } as any)

    render(
      <QueryClientProvider client={queryClient}>
        <ExaminationsPage />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Mid-Term Assessment 2026')).toBeDefined()
    })

    expect(screen.getByTitle('Enter student marks for all subjects')).toBeDefined()
    expect(screen.getByTitle('View class performance analytics & leaderboard')).toBeDefined()
  })

  it('opens marks entry sheet and analytics drawer properly', async () => {
    vi.mocked(standardsApi.list).mockResolvedValue({
      data: [{ id: 1, name: 'Class 10', code: 'C10' }] as any,
    } as any)
    vi.mocked(academicYearsApi.list).mockResolvedValue({
      data: [{ id: 1, name: '2026-2027', is_current: true }] as any,
    } as any)
    vi.mocked(examinationsApi.list).mockResolvedValue({
      data: [
        {
          id: 5,
          name: 'Mid-Term Assessment 2026',
          exam_type: 'Mid-Term',
          standard_name: 'Class 10',
          max_marks: 100,
          passing_marks: 35,
        },
      ] as any,
    } as any)

    vi.mocked(examinationsApi.getMarks).mockResolvedValue({
      data: {
        exam: { id: 5, name: 'Mid-Term Assessment 2026', exam_type: 'Mid-Term', standard_id: 1, max_marks: 100, passing_marks: 35 },
        subjects: [{ id: 10, name: 'Mathematics', code: 'MATH10', max_marks: 100, pass_marks: 35 }],
        students: [
          {
            student_id: 101,
            admission_number: 'ADM-2026-001',
            name: 'Aarav Sharma',
            roll_number: '10A01',
            scores: { 10: { marks_obtained: 95, grade: 'A+', is_absent: false } },
          },
        ],
      } as any,
    } as any)

    vi.mocked(examinationsApi.getAnalytics).mockResolvedValue({
      data: {
        examination_id: 5,
        exam_name: 'Mid-Term Assessment 2026',
        total_candidates: 20,
        appeared_candidates: 18,
        pass_count: 17,
        fail_count: 1,
        pass_percentage: 94.4,
        class_average: 78.2,
        highest_score: 98,
        lowest_score: 32,
        grade_distribution: { 'A+': 5, A: 6, B: 4, C: 2, D: 0, F: 1 },
        subject_analytics: [
          { subject_id: 10, subject_name: 'Mathematics', candidates_count: 18, average_marks: 78.2, highest_marks: 98, lowest_marks: 32 },
        ],
        leaderboard: [
          {
            student_id: 101,
            name: 'Aarav Sharma',
            admission_number: 'ADM-2026-001',
            total_obtained: 98,
            total_max: 100,
            percentage: 98,
            grade: 'A+',
            result: 'PASS',
            rank: 1,
          },
        ],
      } as any,
    } as any)

    render(
      <QueryClientProvider client={queryClient}>
        <ExaminationsPage />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Mid-Term Assessment 2026')).toBeDefined()
    })

    // Click "Marks"
    const marksBtn = screen.getByTitle('Enter student marks for all subjects')
    fireEvent.click(marksBtn)

    await waitFor(() => {
      expect(screen.getByText(/Marks Entry Sheet/i)).toBeDefined()
      expect(screen.getByText('Aarav Sharma')).toBeDefined()
    })

    // Click "Analytics"
    const analyticsBtn = screen.getByTitle('View class performance analytics & leaderboard')
    fireEvent.click(analyticsBtn)

    await waitFor(() => {
      expect(screen.getByText(/Exam Performance Analytics/i)).toBeDefined()
      expect(screen.getByText('94.4%')).toBeDefined()
      expect(screen.getByText('78.2%')).toBeDefined()
    })
  })

  it('renders report card with CBSE 9-point scale and GPA', () => {
    const cbseReportData = {
      ...mockReportCardData,
      summary: {
        ...mockReportCardData.summary,
        grade: 'A1',
        gpa: 9.8,
        grading_scale: 'CBSE_9_POINT',
        grading_scale_name: 'CBSE 9-Point Scale',
        grading_scale_thresholds: [
          { grade: 'A1', min_pct: 91, max_pct: 100, grade_point: 10.0, label: 'Top 1/8th' },
          { grade: 'A2', min_pct: 81, max_pct: 90.99, grade_point: 9.0, label: 'Next 1/8th' },
        ],
      },
    }

    render(
      <ReportCardModal
        isOpen={true}
        onClose={vi.fn()}
        initialData={cbseReportData}
      />
    )

    expect(screen.getByText('CBSE 9-Point Scale')).toBeDefined()
    expect(screen.getAllByText('A1').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/GPA: 9.8/i)).toBeDefined()
  })

  it('triggers batch report card dossier compilation', async () => {
    ;(standardsApi.list as any).mockResolvedValue({
      data: [{ id: 1, name: 'Standard 10' }],
    })
    ;(academicYearsApi.list as any).mockResolvedValue({
      data: [{ id: 1, name: '2026-27', is_current: true }],
    })
    ;(examinationsApi.list as any).mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'Mid-Term Assessment 2026',
          exam_type: 'Term Exam',
          standard_id: 1,
          academic_year_id: 1,
          max_marks: 100,
          passing_marks: 35,
          is_active: true,
        },
      ],
    })
    ;(examinationsApi.getMarks as any).mockResolvedValue({
      data: {
        exam: { id: 1, name: 'Mid-Term Assessment 2026', max_marks: 100, passing_marks: 35 },
        subjects: [{ id: 1, name: 'Mathematics', code: 'MATH' }],
        students: [
          {
            student_id: 101,
            admission_number: 'ADM-001',
            name: 'Aarav Sharma',
            roll_number: '10A01',
            scores: { '1': { marks_obtained: 95, grade: 'A+', is_absent: false } },
          },
        ],
      },
    })
    ;(examinationsApi.getPolicies as any).mockResolvedValue({
      data: {
        active_policies: {
          default_grading_scale: 'CBSE_9_POINT',
          default_passing_threshold: 35,
        },
        available_scales: [],
      },
    })
    ;(examinationsApi.getBatchReportCards as any).mockResolvedValue({
      data: {
        examination: { id: 1, name: 'Mid-Term Assessment 2026' },
        metrics: {
          total_candidates: 1,
          passed_count: 1,
          failed_count: 0,
          pass_percentage: 100.0,
          class_average_pct: 95.0,
          toppers: [
            { rank: 1, student_id: 101, name: 'Aarav Sharma', roll_number: '10A01', percentage: 95.0, grade: 'A1' },
          ],
        },
        report_cards: [
          {
            student: { id: 101, full_name: 'Aarav Sharma', roll_number: '10A01' },
            summary: { total_obtained: 95, total_max_marks: 100, percentage: 95.0, grade: 'A1', result: 'PASS' },
          },
        ],
      },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <ExaminationsPage />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Mid-Term Assessment 2026')).toBeDefined()
    })

    // Click Report Cards Tab
    const reportCardsTab = screen.getByRole('button', { name: /Report Cards/i })
    fireEvent.click(reportCardsTab)

    await waitFor(() => {
      expect(screen.getByText('Print All Report Cards')).toBeDefined()
    })

    // Click Print All Report Cards
    const printAllBtn = screen.getByText('Print All Report Cards')
    fireEvent.click(printAllBtn)

    await waitFor(() => {
      expect(examinationsApi.getBatchReportCards).toHaveBeenCalledWith(1, { scale: 'CBSE_9_POINT' })
      expect(screen.getByText(/Batch Examination Dossier/i)).toBeDefined()
      expect(screen.getByText(/Cohort Merit Leaderboard/i)).toBeDefined()
    })
  })
})
