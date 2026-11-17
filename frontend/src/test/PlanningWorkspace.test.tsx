/**
 * @file        PlanningWorkspace.test.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.test
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-17
 * @updated     2026-11-17
 *
 * @description Regression tests for Planning workspace accessibility and linked schedule projections.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { academicYearsApi, divisionsApi, planningApi, standardsApi, subjectsApi } from '../api/endpoints'
import type { PlanningItem } from '../types'
import PlanningWorkspace from '../pages/PlanningWorkspace'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'

const mockPlanningData = vi.hoisted(() => ({
  items: [] as PlanningItem[],
}))

vi.mock('../api/endpoints', () => ({
  academicYearsApi: {
    list: vi.fn(() => Promise.resolve({ data: [{ id: 8, name: '2026-27', is_current: true }] })),
  },
  divisionsApi: {
    list: vi.fn(() => Promise.resolve({ data: [{ id: 12, name: 'Batch A', standard_id: 4, standard_name: 'Grade 8' }] })),
  },
  planningApi: {
    listActivities: () => Promise.resolve({ data: { items: mockPlanningData.items, timezone: 'Asia/Kolkata' } }),
    getAssignees: () => Promise.resolve({ data: { users: [], departments: [] } }),
    createActivity: vi.fn(() => Promise.resolve({ data: { item: {} } })),
    cancelOccurrence: vi.fn(() => Promise.resolve({ data: {} })),
    cancelActivity: vi.fn(() => Promise.resolve({ data: {} })),
    rescheduleOccurrence: vi.fn(() => Promise.resolve({ data: {} })),
    deleteOccurrenceException: vi.fn(() => Promise.resolve({ data: { restored: true } })),
  },
  standardsApi: {
    list: vi.fn(() => Promise.resolve({ data: [{ id: 4, name: 'Grade 8' }] })),
  },
  subjectsApi: {
    list: vi.fn(() => Promise.resolve({ data: [{ id: 19, name: 'Mathematics', code: 'MATH' }] })),
  },
}))

describe('Planning workspace view switcher accessibility', () => {
  beforeEach(() => {
    mockPlanningData.items = []
    useAuthStore.setState({
      user: {
        id: 1,
        username: 'admin',
        email: 'admin@example.test',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        institution_id: 1,
        permissions: ['planning:create'],
      },
      selectedInstitutionId: 1,
      selectedAcademicYearId: 8,
    })
    useEditModeStore.setState({ scopes: { 'planning:workspace': true } })
  })

  it('names each view control and exposes the selected mobile default', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PlanningWorkspace />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const group = screen.getByRole('group', { name: 'Planning views' })
    const selectedViews = ['Month', 'Week', 'Day', 'Kanban', 'Agenda', 'Timeline']
      .filter((name) => screen.getByRole('button', { name }).getAttribute('aria-pressed') === 'true')

    expect(group).toBeTruthy()
    expect(selectedViews).toEqual(['Agenda'])
  })

  it('labels linked schedule and CRM projections and keeps them out of the Kanban workflow', async () => {
    const item = (overrides: Partial<PlanningItem>): PlanningItem => ({
      id: 'source:1',
      key: 'source:1:once',
      source_type: 'timetable_entry',
      source_id: 1,
      title: 'Mathematics · Batch A',
      description: null,
      activity_type: 'event',
      category: 'academic',
      start_at: null,
      end_at: null,
      due_at: null,
      occurrence_date: null,
      timezone: 'Asia/Kolkata',
      all_day: false,
      location: null,
      priority: 'normal',
      status: 'todo',
      visibility: 'institution',
      is_published: true,
      academic_year_id: null,
      division_id: null,
      subject_id: null,
      assignees: [],
      attachments: [],
      references: [],
      recurrence: null,
      version: null,
      created_by_id: null,
      created_at: null,
      updated_at: null,
      editable: false,
      ...overrides,
    })
    mockPlanningData.items = [
      item({}),
      item({
        id: 'lead_follow_up:7',
        key: 'lead_follow_up:7:once',
        source_type: 'lead_follow_up',
        source_id: 7,
        title: 'CRM follow-up · Call',
        activity_type: 'event',
        category: 'administrative',
        start_at: '2026-03-08T10:00:00Z',
      }),
      item({
        id: 2,
        key: 'activity:2:once',
        source_type: 'activity',
        source_id: 2,
        title: 'Prepare lesson plan',
        activity_type: 'task',
        editable: true,
      }),
    ]

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PlanningWorkspace />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Timeline' }))
    expect(await screen.findByText('Mathematics · Batch A')).toBeTruthy()
    expect(screen.getByText('Timetable')).toBeTruthy()
    expect(screen.getByText('CRM follow-up')).toBeTruthy()
    expect(screen.getAllByText('Read-only source')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'Kanban' }))
    expect(screen.getByText('Prepare lesson plan')).toBeTruthy()
    expect(screen.queryByText('Mathematics · Batch A')).toBeNull()
  })

  it('submits the selected academic year, class, and subject IDs', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PlanningWorkspace />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'New activity' }))

    await screen.findByRole('option', { name: '2026-27 (Current)' })
    fireEvent.change(screen.getByLabelText('Academic year'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Class / batch'), { target: { value: '12' } })
    await screen.findByRole('option', { name: 'Mathematics (MATH)' })
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: '19' } })
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Maths revision' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create activity' }))

    await waitFor(() => {
      expect(vi.mocked(planningApi.createActivity)).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Maths revision',
        academic_year_id: 8,
        division_id: 12,
        subject_id: 19,
      }))
    })
    expect(vi.mocked(standardsApi.list)).toHaveBeenCalledWith({ institution_id: 1 })
    expect(vi.mocked(divisionsApi.list)).toHaveBeenCalled()
    expect(vi.mocked(subjectsApi.list)).toHaveBeenCalledWith({ standard_id: 4 })
    expect(vi.mocked(academicYearsApi.list)).toHaveBeenCalledWith(1)
  })

  it('allows choosing between cancelling only an occurrence or the entire recurring series', async () => {
    const recurringItem: PlanningItem = {
      id: 'activity:5',
      key: 'activity:5:2026-11-24',
      source_type: 'activity',
      source_id: 5,
      title: 'Weekly Faculty Meeting',
      description: null,
      activity_type: 'event',
      category: 'meeting',
      start_at: '2026-11-24T09:00:00Z',
      end_at: '2026-11-24T10:00:00Z',
      due_at: null,
      occurrence_date: '2026-11-24',
      timezone: 'Asia/Kolkata',
      all_day: false,
      location: 'Staff Room',
      priority: 'high',
      status: 'todo',
      visibility: 'institution',
      is_published: true,
      academic_year_id: null,
      division_id: null,
      subject_id: null,
      assignees: [],
      attachments: [],
      references: [],
      recurrence: { frequency: 'weekly', interval: 1, until: '2026-12-31', weekdays: [2] },
      version: 1,
      created_by_id: 1,
      created_at: null,
      updated_at: null,
      editable: true,
    }
    mockPlanningData.items = [recurringItem]

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PlanningWorkspace />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const cards = await screen.findAllByText('Weekly Faculty Meeting')
    fireEvent.click(cards[0])
    expect(screen.getByText('Cancel activity')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel activity' }))
    expect(screen.getByText('Cancel Recurring Activity')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cancel only 2026-11-24' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cancel entire series' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel only 2026-11-24' }))
    await waitFor(() => {
      expect(vi.mocked(planningApi.cancelOccurrence)).toHaveBeenCalledWith(5, '2026-11-24')
    })
  })

  it('allows rescheduling a single occurrence to a new date and time', async () => {
    const recurringItem: PlanningItem = {
      id: 'activity:6',
      key: 'activity:6:2026-11-25',
      source_type: 'activity',
      source_id: 6,
      title: 'Lab Session Recurring',
      description: null,
      activity_type: 'event',
      category: 'academic',
      start_at: '2026-11-25T10:00:00Z',
      end_at: '2026-11-25T11:00:00Z',
      due_at: null,
      occurrence_date: '2026-11-25',
      timezone: 'Asia/Kolkata',
      all_day: false,
      location: 'Physics Lab',
      priority: 'normal',
      status: 'todo',
      visibility: 'institution',
      is_published: true,
      academic_year_id: null,
      division_id: null,
      subject_id: null,
      assignees: [],
      attachments: [],
      references: [],
      recurrence: { frequency: 'weekly', interval: 1, until: '2026-12-31', weekdays: [3] },
      version: 1,
      created_by_id: 1,
      created_at: null,
      updated_at: null,
      editable: true,
    }
    mockPlanningData.items = [recurringItem]

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PlanningWorkspace />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const cards = await screen.findAllByText('Lab Session Recurring')
    fireEvent.click(cards[0])

    const rescheduleBtn = screen.getByRole('button', { name: 'Reschedule occurrence' })
    expect(rescheduleBtn).toBeTruthy()
    fireEvent.click(rescheduleBtn)

    expect(screen.getByText('Rescheduling Single Occurrence')).toBeTruthy()
    const dateInput = screen.getByLabelText('New date')
    const timeInput = screen.getByLabelText('Start time')

    fireEvent.change(dateInput, { target: { value: '2026-11-27' } })
    fireEvent.change(timeInput, { target: { value: '14:00' } })

    const saveBtn = screen.getByRole('button', { name: 'Save reschedule' })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(vi.mocked(planningApi.rescheduleOccurrence)).toHaveBeenCalledWith(
        6,
        expect.objectContaining({
          occurrence_date: '2026-11-25',
          rescheduled_start_at: expect.any(String),
        }),
      )
    })
  })

  it('displays rescheduled badge and allows restoring the original schedule', async () => {
    const rescheduledItem: PlanningItem = {
      id: 'activity:7',
      key: 'activity:7:2026-11-28',
      source_type: 'activity',
      source_id: 7,
      title: 'Rescheduled Staff Briefing',
      description: null,
      activity_type: 'event',
      category: 'meeting',
      start_at: '2026-11-28T14:00:00Z',
      end_at: '2026-11-28T15:00:00Z',
      due_at: null,
      occurrence_date: '2026-11-28',
      original_occurrence_date: '2026-11-26',
      is_rescheduled: true,
      timezone: 'Asia/Kolkata',
      all_day: false,
      location: 'Conference Room',
      priority: 'high',
      status: 'todo',
      visibility: 'institution',
      is_published: true,
      academic_year_id: null,
      division_id: null,
      subject_id: null,
      assignees: [],
      attachments: [],
      references: [],
      recurrence: { frequency: 'weekly', interval: 1, until: '2026-12-31', weekdays: [4] },
      version: 2,
      created_by_id: 1,
      created_at: null,
      updated_at: null,
      editable: true,
    }
    mockPlanningData.items = [rescheduledItem]

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PlanningWorkspace />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    // Verify Rescheduled badge is visible on card
    const badges = await screen.findAllByText('Rescheduled')
    expect(badges.length).toBeGreaterThan(0)

    const cards = await screen.findAllByText('Rescheduled Staff Briefing')
    fireEvent.click(cards[0])

    // Verify modal shows badge and restore button
    expect(screen.getByTestId('rescheduled-badge')).toBeTruthy()
    const restoreBtn = screen.getByRole('button', { name: 'Restore original schedule' })
    expect(restoreBtn).toBeTruthy()

    fireEvent.click(restoreBtn)
    await waitFor(() => {
      expect(vi.mocked(planningApi.deleteOccurrenceException)).toHaveBeenCalledWith(7, '2026-11-26')
    })
  })
})
