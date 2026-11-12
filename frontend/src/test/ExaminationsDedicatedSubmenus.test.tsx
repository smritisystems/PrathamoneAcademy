/**
 * @file        ExaminationsDedicatedSubmenus.test.tsx
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
 * @created     2026-11-08
 * @updated     2026-11-13
 *
 * @description Vitest test suite validating all 7 Examination Centre dedicated workspace routes, view-first locks, and training isolation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Examinations from '../pages/Examinations'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { useEnvironmentStore } from '../store/environmentStore'
import * as endpoints from '../api/endpoints'

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

const renderWithRouter = (initialRoute: string) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Examinations />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Examinations Dedicated Workspace Submenu Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      user: {
        id: 1,
        username: 'admin',
        email: 'admin@prashantacademy.in',
        role: 'superadmin',
        first_name: 'Super',
        last_name: 'Admin',
      },
      token: 'fake-jwt-token',
      selectedInstitutionId: 1,
      selectedAcademicYearId: 1,
    })
    useEditModeStore.setState({ scopes: {} })
    useEnvironmentStore.setState({ isTrainingMode: false })

    // Default mocks for APIs
    vi.spyOn(endpoints.standardsApi, 'list').mockResolvedValue({
      data: [{ id: 1, name: 'Class 10', code: 'C10' } as any],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })

    vi.spyOn(endpoints.academicYearsApi, 'list').mockResolvedValue({
      data: [{ id: 1, name: '2026-2027', is_current: true } as any],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })

    vi.spyOn(endpoints.examinationsApi, 'list').mockResolvedValue({
      data: [
        {
          id: 5,
          name: 'Mid-Term Assessment 2026',
          exam_type: 'Mid-Term',
          standard_name: 'Class 10',
          max_marks: 100,
          passing_marks: 35,
          start_date: '2026-10-15',
          end_date: '2026-10-22',
        } as any,
      ],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })

    vi.spyOn(endpoints.examinationsApi, 'getMarks').mockResolvedValue({
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
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })

    vi.spyOn(endpoints.examinationsApi, 'getAnalytics').mockResolvedValue({
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
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })

    vi.spyOn(endpoints.examinationsApi, 'getPolicies').mockResolvedValue({
      data: {
        active_policies: {
          default_grading_scale: 'STANDARD_6_POINT',
          default_passing_threshold: 35,
          grace_marks_policy: 'Max 3 Grace Marks per candidate',
          rank_tie_breaker: 'Mathematics & Science Priority, then Roll Number',
        },
        available_scales: [
          {
            id: 'STANDARD_6_POINT',
            name: 'Standard 6-Point Scale (A+ to F)',
            description: 'Traditional academic grade boundaries',
            thresholds: [
              { grade: 'A+', min_pct: 90, max_pct: 100, grade_point: 4.0, label: 'Outstanding' },
            ],
          },
        ],
      } as any,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })
  })

  it('1. /examinations/overview renders Examinations Overview and locked schedule action', async () => {
    renderWithRouter('/examinations/overview')

    expect(screen.getByRole('heading', { level: 1, name: 'Examinations & Test Series' })).toBeDefined()
    expect(
      screen.getByText(/Schedule exams, record subject marks, analyze class performance/i)
    ).toBeDefined()
    expect(screen.getByText(/Schedule Examination \(Locked\)/i)).toBeDefined()
  })

  it('2. /examinations/schedules renders Examination Schedules & Timetable workspace', async () => {
    renderWithRouter('/examinations/schedules')

    expect(screen.getByRole('heading', { level: 1, name: 'Examination Schedules & Timetable' })).toBeDefined()
    expect(
      screen.getByText(/Comprehensive timetable of scheduled unit tests, mid-terms/i)
    ).toBeDefined()
    expect(screen.getByText(/Schedule Examination \(Locked\)/i)).toBeDefined()
  })

  it('3. /examinations/marks-entry renders dedicated Marks Entry Centre and locked save action', async () => {
    renderWithRouter('/examinations/marks-entry')

    expect(screen.getByRole('heading', { level: 1, name: 'Marks Entry Centre' })).toBeDefined()
    expect(
      screen.getByText(/Subject-wise marks entry grid, absent marking, automatic pass\/fail/i)
    ).toBeDefined()
    expect(screen.getAllByText(/Save All Marks/i).length).toBeGreaterThan(0)
  })

  it('4. /examinations/analytics renders dedicated Exam Performance Analytics workspace', async () => {
    renderWithRouter('/examinations/analytics')

    expect(screen.getByRole('heading', { level: 1, name: 'Exam Performance Analytics' })).toBeDefined()
    expect(
      screen.getByText(/Class-wide performance insights, grade distribution graphs/i)
    ).toBeDefined()
    expect(screen.getByRole('button', { name: /Export Analytics/i })).toBeDefined()
  })

  it('5. /examinations/report-cards renders Report Cards & Transcripts workspace', async () => {
    renderWithRouter('/examinations/report-cards')

    expect(screen.getByRole('heading', { level: 1, name: 'Report Cards & Transcripts' })).toBeDefined()
    expect(
      screen.getByText(/Official graphical student report cards with institution branding/i)
    ).toBeDefined()
    expect(screen.getByRole('button', { name: /Print Batch Reports/i })).toBeDefined()
  })

  it('6. /examinations/papers renders Question Papers & Blueprints workspace and locked upload action', async () => {
    renderWithRouter('/examinations/papers')

    expect(screen.getByRole('heading', { level: 1, name: 'Question Papers & Blueprints' })).toBeDefined()
    expect(
      screen.getByText(/Examination paper blueprints, marking schemes, chapter-wise weightage/i)
    ).toBeDefined()
    expect(screen.getByText(/Upload Blueprint \(Locked\)/i)).toBeDefined()
  })

  it('7. /examinations/settings renders Settings & Grading Scales workspace and locked policy action', async () => {
    renderWithRouter('/examinations/settings')

    expect(screen.getByRole('heading', { level: 1, name: 'Examination Settings & Grading Scales' })).toBeDefined()
    expect(
      screen.getByText(/Grading scales \(CBSE\/ICSE\/State\), pass percentage threshold/i)
    ).toBeDefined()
    expect(screen.getAllByText(/Save Grading Policies/i).length).toBeGreaterThan(0)
  })

  it('8. displays prominent TRAINING MODE badge in header when training mode is active', async () => {
    useEnvironmentStore.setState({ isTrainingMode: true })

    renderWithRouter('/examinations/schedules')

    expect(screen.getByText('TRAINING MODE')).toBeDefined()
  })
})
