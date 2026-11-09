/**
 * @file        StudentIDCardPrint.test.tsx
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
 * @created     2026-11-10
 * @updated     2026-11-10
 *
 * @description Unit and DOM integration tests for isolated Student ID Card printing, CR80 / A4 Sheet layouts, and container isolation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import StudentIDCardModal from '../components/StudentIDCardModal'
import { printIDCardElement, directPrintIDCard } from '../utils/printIDCard'
import { studentsApi } from '../api/endpoints'

vi.mock('../api/endpoints', () => ({
  studentsApi: {
    getIdCard: vi.fn(),
  },
}))

describe('Student ID Card Print Engine & Container Isolation', () => {
  let originalPrint: () => void

  beforeEach(() => {
    vi.clearAllMocks()
    originalPrint = window.print
    window.print = vi.fn()
  })

  afterEach(() => {
    window.print = originalPrint
    const iframe = document.getElementById('id-card-isolated-print-frame')
    if (iframe && iframe.parentNode) {
      iframe.parentNode.removeChild(iframe)
    }
  })

  it('locates #student-id-card-printable and creates an isolated sandbox iframe for printing', () => {
    const cardContainer = document.createElement('div')
    cardContainer.id = 'student-id-card-printable'
    cardContainer.innerHTML = `
      <div class="id-card-side id-card-front">
        <span>PRASHANT ACADEMY</span>
        <span>Aarav Sharma</span>
        <span>ADM-2026-0010</span>
      </div>
      <button class="no-print">Close</button>
    `
    document.body.appendChild(cardContainer)

    const result = printIDCardElement('student-id-card-printable', 'Official Student Identity Card')
    expect(result).toBe(true)

    const iframe = document.getElementById('id-card-isolated-print-frame') as HTMLIFrameElement
    expect(iframe).not.toBeNull()
    expect(iframe?.style.position).toBe('fixed')
    expect(iframe?.style.opacity).toBe('0')

    document.body.removeChild(cardContainer)
  })

  it('strips interactive buttons and .no-print elements from cloned print document', () => {
    const cardContainer = document.createElement('div')
    cardContainer.id = 'student-id-card-printable'
    cardContainer.innerHTML = `
      <div class="id-card-content">Card Details</div>
      <button class="no-print">Print Button</button>
      <div class="print:hidden">Screen Only Legend</div>
    `
    document.body.appendChild(cardContainer)

    printIDCardElement({
      elementId: 'student-id-card-printable',
      documentTitle: 'Test Card',
      layout: 'cr80',
    })

    const iframe = document.getElementById('id-card-isolated-print-frame') as HTMLIFrameElement
    const iframeDoc = iframe.contentWindow?.document
    expect(iframeDoc).toBeDefined()

    // Assert that interactive buttons were stripped
    const buttonsInside = iframeDoc?.querySelectorAll('button')
    expect(buttonsInside?.length).toBe(0)

    document.body.removeChild(cardContainer)
  })

  it('falls back gracefully to window.print() if target element is not found', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = printIDCardElement('non-existent-card-container')

    expect(result).toBe(false)
    expect(window.print).toHaveBeenCalledTimes(1)
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Element #non-existent-card-container not found')
    )
  })

  it('directPrintIDCard adds and removes the .printing-id-card class on document.body', () => {
    const card = document.createElement('div')
    card.id = 'student-id-card-printable'
    document.body.appendChild(card)

    directPrintIDCard('student-id-card-printable')
    expect(document.body.classList.contains('printing-id-card')).toBe(true)
    expect(window.print).toHaveBeenCalledTimes(1)

    // Simulate afterprint event
    window.dispatchEvent(new Event('afterprint'))
    expect(document.body.classList.contains('printing-id-card')).toBe(false)

    document.body.removeChild(card)
  })

  describe('StudentIDCardModal Component Print Integration', () => {
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
      vi.mocked(studentsApi.getIdCard).mockResolvedValue({ data: mockCardData } as any)
    })

    it('allows toggling between CR80 PVC and A4 Sheet format and triggers isolated printing', async () => {
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

      // Check format toggle
      const sheetFormatBtn = screen.getByRole('button', { name: /A4 Sheet/i })
      expect(sheetFormatBtn).toBeDefined()
      fireEvent.click(sheetFormatBtn)

      // Footer badge should reflect A4 Sheet
      expect(screen.getByText(/A4 Sheet \(Multi-up\)/i)).toBeDefined()

      // Toggle back to CR80 PVC
      const cr80FormatBtn = screen.getByRole('button', { name: /CR80 PVC/i })
      fireEvent.click(cr80FormatBtn)
      expect(screen.getByText(/CR80 PVC \(85.6 × 54mm\)/i)).toBeDefined()

      // Print card
      const printBtn = screen.getByRole('button', { name: /Print Student ID Card/i })
      fireEvent.click(printBtn)

      expect(window.print).toHaveBeenCalled()
    })

    it('renders front and back sides with SVG QR code and emergency details', async () => {
      render(
        <StudentIDCardModal
          studentId={10}
          isOpen={true}
          onClose={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('ATTENDANCE & SECURITY VERIFICATION')).toBeDefined()
        expect(screen.getByText('Rajesh Sharma')).toBeDefined()
        expect(screen.getByText('+919811122233')).toBeDefined()
      })

      // Toggle to Front only
      const frontBtn = screen.getByRole('button', { name: /^Front$/i })
      fireEvent.click(frontBtn)
      expect(screen.queryByText('ATTENDANCE & SECURITY VERIFICATION')).toBeNull()
      expect(screen.getByText('Aarav Sharma')).toBeDefined()

      // Toggle to Back only
      const backBtn = screen.getByRole('button', { name: /^Back$/i })
      fireEvent.click(backBtn)
      expect(screen.getByText('ATTENDANCE & SECURITY VERIFICATION')).toBeDefined()
      expect(screen.queryByText('Roll No:')).toBeNull()
    })
  })
})
