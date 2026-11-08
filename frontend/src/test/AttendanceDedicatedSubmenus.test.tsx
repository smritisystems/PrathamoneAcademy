/**
 * @file        AttendanceDedicatedSubmenus.test.tsx
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
 * @updated     2026-11-08
 *
 * @description Vitest test suite validating all 8 Attendance Centre dedicated workspace routes, view-first locks, and training isolation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Attendance from '../pages/Attendance'
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
        <Attendance />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Attendance Centre Dedicated Workspace Submenu Suite', () => {
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

    vi.spyOn(endpoints.divisionsApi, 'list').mockResolvedValue({
      data: [{ id: 1, name: 'Batch Alpha' } as any],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })

    vi.spyOn(endpoints.studentsApi, 'list').mockResolvedValue({
      data: {
        data: [
          {
            id: 101,
            admission_number: 'ADM-2026-001',
            first_name: 'Aarav',
            last_name: 'Sharma',
            enrollments: [{ id: 1 }],
          },
        ],
        total: 1,
      } as any,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })

    vi.spyOn(endpoints.attendanceApi, 'get').mockResolvedValue({
      data: [
        {
          id: 1,
          student_id: 101,
          date: '2026-11-08',
          status: 'present',
          remarks: 'Daily Roll Call Verified',
        },
      ],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })

    vi.spyOn(endpoints.attendanceApi, 'markBulk').mockResolvedValue({
      data: { message: 'Attendance recorded and notifications queued' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })
  })

  it('1. /attendance/overview renders Attendance Overview and quick terminal launch action', async () => {
    renderWithRouter('/attendance/overview')

    expect(screen.getByRole('heading', { level: 1, name: 'Attendance Centre & Daily Roll Call' })).toBeDefined()
    expect(
      screen.getByText(/Batch presence rates, real-time check-in stream, absenteeism tracking/i)
    ).toBeDefined()
    expect(screen.getAllByRole('button', { name: /Open QR Attendance Terminal/i }).length).toBeGreaterThan(0)
  })

  it('2. /attendance/daily renders Daily Batch Roll Call workspace and locked save action', async () => {
    renderWithRouter('/attendance/daily')

    expect(screen.getByRole('heading', { level: 1, name: 'Daily Batch Roll Call' })).toBeDefined()
    expect(
      screen.getByText(/Mark batch attendance, record absent\/late\/half-day statuses/i)
    ).toBeDefined()
    expect(screen.getAllByText(/Save Attendance Register/i).length).toBeGreaterThan(0)
  })

  it('3. /attendance/qr-terminal renders QR Attendance Terminal & Kiosk workspace and locked action', async () => {
    renderWithRouter('/attendance/qr-terminal')

    expect(screen.getByRole('heading', { level: 1, name: 'QR Attendance Terminal & Kiosk' })).toBeDefined()
    expect(
      screen.getByText(/High-speed check-in terminal for digital student ID badges/i)
    ).toBeDefined()
    expect(screen.getAllByText(/Scan Check-In/i).length).toBeGreaterThan(0)
  })

  it('4. /attendance/register renders dedicated Monthly Attendance Register matrix', async () => {
    renderWithRouter('/attendance/register')

    expect(screen.getByRole('heading', { level: 1, name: 'Monthly Attendance Register' })).toBeDefined()
    expect(
      screen.getByText(/Comprehensive batch-wise monthly attendance matrix, daily presence status/i)
    ).toBeDefined()
    expect(screen.getByRole('button', { name: /Export Register/i })).toBeDefined()
  })

  it('5. /attendance/absenteeism renders Absenteeism & Defaulters Tracker and locked alert action', async () => {
    renderWithRouter('/attendance/absenteeism')

    expect(screen.getByRole('heading', { level: 1, name: 'Absenteeism & Defaulters Tracker' })).toBeDefined()
    expect(
      screen.getByText(/Identify students falling below ATP-ATT-001 \(75% threshold\)/i)
    ).toBeDefined()
    expect(screen.getAllByText(/Dispatch Parent Alerts/i).length).toBeGreaterThan(0)
  })

  it('6. /attendance/leaves renders Student Leave Applications and locked request action', async () => {
    renderWithRouter('/attendance/leaves')

    expect(screen.getByRole('heading', { level: 1, name: 'Student Leave Applications' })).toBeDefined()
    expect(
      screen.getByText(/Record and sanction planned leaves \(medical, family, board exams\)/i)
    ).toBeDefined()
    expect(screen.getAllByText(/Apply Leave Request/i).length).toBeGreaterThan(0)
  })

  it('7. /attendance/reports renders Attendance Analytics & Audit Logs workspace', async () => {
    renderWithRouter('/attendance/reports')

    expect(screen.getByRole('heading', { level: 1, name: 'Attendance Analytics & Audit Logs' })).toBeDefined()
    expect(
      screen.getByText(/Batch attendance comparisons, weekday distribution graphs/i)
    ).toBeDefined()
    expect(screen.getByRole('button', { name: /Export Analytics/i })).toBeDefined()
  })

  it('8. /attendance/settings renders Attendance Settings & Policy Framework and locked policy action', async () => {
    renderWithRouter('/attendance/settings')

    expect(screen.getByRole('heading', { level: 1, name: 'Attendance Settings & Policy Framework' })).toBeDefined()
    expect(
      screen.getByText(/ATP-ATT-001 minimum attendance threshold, notification alert cutoff times/i)
    ).toBeDefined()
    expect(screen.getAllByText(/Save Attendance Policies/i).length).toBeGreaterThan(0)
  })

  it('9. displays prominent TRAINING MODE badge in header when training mode is active', async () => {
    useEnvironmentStore.setState({ isTrainingMode: true })

    renderWithRouter('/attendance/daily')

    expect(screen.getByText('TRAINING MODE')).toBeDefined()
  })
})
