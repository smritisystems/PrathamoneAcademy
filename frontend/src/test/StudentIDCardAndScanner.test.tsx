/**
 * @file        StudentIDCardAndScanner.test.tsx
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
 * @updated     2026-11-06
 *
 * @description Vitest test suite for Digital Student ID Card generation, SVG QR codes, and QR Attendance Terminal check-in.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import StudentIDCardModal from '../components/StudentIDCardModal'
import Attendance from '../pages/Attendance'
import { studentsApi, attendanceApi, standardsApi, divisionsApi } from '../api/endpoints'
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
  studentsApi: {
    getIdCard: vi.fn(),
    list: vi.fn(),
  },
  attendanceApi: {
    get: vi.fn(),
    markBulk: vi.fn(),
    scanCheckin: vi.fn(),
  },
  standardsApi: {
    list: vi.fn(),
  },
  divisionsApi: {
    list: vi.fn(),
  },
}))

describe('Digital Student ID Cards & QR Attendance Scanner', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  const mockCardData = {
    student_id: 10,
    admission_number: 'ADM-2026-0010',
    first_name: 'Aarav',
    last_name: 'Sharma',
    full_name: 'Aarav Sharma',
    date_of_birth: '2009-08-15',
    blood_group: 'O+',
    photo_url: null,
    phone: '+919811122233',
    email: 'aarav@example.com',
    standard_name: 'Standard 10 - Science',
    division_name: 'Batch Alpha',
    roll_number: '101',
    academic_year: '2026-27',
    guardian_name: 'Rajesh Sharma',
    guardian_phone: '+919811122233',
    guardian_relation: 'Father',
    institution: {
      id: 1,
      name: 'Prashant Academy Coaching Institute',
      code: 'PA',
      short_name: 'PA',
      tagline: 'Learn • Practice • Achieve',
      address: 'Station Road',
      city: 'Pune',
      phone: '+91 98765 43210',
      logo_url: null,
      primary_color: '#1E40AF',
    },
    qr_payload: '{"adm":"ADM-2026-0010","id":10,"inst":1,"v":"1.0"}',
    qr_svg: '<svg viewBox="0 0 100 100"><path d="M0 0h10v10H0z"/></svg>',
    valid_until: 'May 2027',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(studentsApi.getIdCard).mockResolvedValue({ data: mockCardData } as any)
    vi.mocked(standardsApi.list).mockResolvedValue({ data: [{ id: 1, name: 'Standard 10' }] } as any)
    vi.mocked(divisionsApi.list).mockResolvedValue({ data: [{ id: 1, name: 'Batch A' }] } as any)
    vi.mocked(studentsApi.list).mockResolvedValue({
      data: {
        data: [
          {
            id: 10,
            admission_number: 'ADM-2026-0010',
            first_name: 'Aarav',
            last_name: 'Sharma',
            enrollments: [{ id: 100 }],
          },
        ],
      },
    } as any)
    vi.mocked(attendanceApi.scanCheckin).mockResolvedValue({
      data: {
        status: 'success',
        message: 'Verified & Recorded: Aarav Sharma checked in successfully as PRESENT.',
        student: {
          id: 10,
          name: 'Aarav Sharma',
          admission_number: 'ADM-2026-0010',
          photo_url: null,
          status: 'present',
          checkin_time: '08:30 AM',
        },
      },
    } as any)
  })

  it('renders student ID card with demographics, institute branding and SVG QR code', async () => {
    render(
      <StudentIDCardModal
        studentId={10}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(studentsApi.getIdCard).toHaveBeenCalledWith(10)
      expect(screen.getByText('Official Student Identity Card (CR80)')).toBeDefined()
      expect(screen.getByText('Aarav Sharma')).toBeDefined()
      expect(screen.getByText(/ADM: ADM-2026-0010/i)).toBeDefined()
      expect(screen.getByText(/Class:/i)).toBeDefined()
      expect(screen.getByText(/Prashant Academy Coaching Institute/i)).toBeDefined()
      expect(screen.getByText('Rajesh Sharma')).toBeDefined()
    })
  })

  it('triggers window.print when Print Card button is clicked', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})

    render(
      <StudentIDCardModal
        studentId={10}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Aarav Sharma')).toBeDefined()
    })

    const printBtns = screen.getAllByRole('button', { name: /Print/i })
    fireEvent.click(printBtns[0])

    expect(printSpy).toHaveBeenCalled()
    printSpy.mockRestore()
  })

  it('opens QR Attendance Terminal in Attendance workspace and records scan check-in', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Attendance />
      </QueryClientProvider>
    )

    // Verify terminal toggle button
    const terminalToggle = screen.getByRole('button', { name: /Open QR Attendance Terminal/i })
    expect(terminalToggle).toBeDefined()

    // Open terminal
    fireEvent.click(terminalToggle)

    expect(screen.getByText('High-Speed QR Attendance Terminal')).toBeDefined()
    expect(screen.getByPlaceholderText(/Scan QR or type ADM.../i)).toBeDefined()

    // Type admission number and submit scan
    const scanInput = screen.getByPlaceholderText(/Scan QR or type ADM.../i)
    fireEvent.change(scanInput, { target: { value: 'ADM-2026-0010' } })

    const scanBtn = screen.getByRole('button', { name: /Record Scan Check-In/i })
    fireEvent.click(scanBtn)

    await waitFor(() => {
      expect(attendanceApi.scanCheckin).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: 'ADM-2026-0010',
          status: 'present',
        })
      )
      expect(screen.getByText(/Aarav Sharma/i)).toBeDefined()
      expect(screen.getByText('08:30 AM')).toBeDefined()
    })
  })
})
