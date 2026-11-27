/**
 * @file        InstitutionOnboarding.test.tsx
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
 * @created     2026-11-27
 * @updated     2026-11-27
 *
 * @description Unit and component tests for neutral institution profile placeholders,
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import InstitutionOnboardingWizard from '../components/InstitutionOnboardingWizard'
import {
  INSTITUTE_PLACEHOLDERS,
  isPlaceholderInstituteName,
  validateProfileFields,
} from '../utils/institutionValidation'

describe('Institution Profile Validation & Onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('provides neutral placeholders without any hardcoded customer data', () => {
    expect(INSTITUTE_PLACEHOLDERS.name).toBe('Your Coaching Institute')
    expect(INSTITUTE_PLACEHOLDERS.branch_name).toBe('Main Branch')
    expect(INSTITUTE_PLACEHOLDERS.address_line_1).toBe('Enter your institute address')
    expect(INSTITUTE_PLACEHOLDERS.phone).toBe('+91 XXXXX XXXXX')
    expect(INSTITUTE_PLACEHOLDERS.email).toBe('Enter your email address')
  })

  it('rejects dummy phones, invalid Indian PIN codes, bad GSTIN/PAN, and accepts valid partial optional data', () => {
    expect(isPlaceholderInstituteName('Your Coaching Institute')).toBe(true)
    expect(isPlaceholderInstituteName('Sankalp Classes')).toBe(false)

    expect(
      validateProfileFields({ name: 'Your Coaching Institute' }, { requireNonPlaceholderName: true })
    ).toContain('Coaching Institute Name')

    expect(
      validateProfileFields({ name: 'Sankalp Classes', country: 'India', pincode: '012345' })
    ).toContain('PIN Code')

    expect(
      validateProfileFields({ name: 'Sankalp Classes', phone: '+91 8779 123 007' })
    ).toContain('sample default')

    expect(
      validateProfileFields({ name: 'Sankalp Classes', gstin: 'INVALID123' })
    ).toContain('GSTIN')

    // Optional GSTIN, PAN, website, phone omitted should succeed cleanly
    expect(
      validateProfileFields(
        { name: 'Sankalp Classes', country: 'India', state: 'Maharashtra', pincode: '411038' },
        { requireNonPlaceholderName: true }
      )
    ).toBeNull()
  })

  it('renders first-launch onboarding wizard with blank editable identity inputs instead of saved dummy strings', () => {
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <InstitutionOnboardingWizard
          isOpen
          initialProfile={{ name: 'Your Coaching Institute', onboarding_completed: false }}
          onComplete={vi.fn()}
        />
      </QueryClientProvider>
    )

    const nameInput = screen.getByPlaceholderText('Your Coaching Institute') as HTMLInputElement
    expect(nameInput.value).toBe('')

    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(screen.getByText(/Coaching Institute Name is required/i)).toBeDefined()

    fireEvent.change(nameInput, { target: { value: 'Vidya Mandir Academy' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(screen.getByPlaceholderText('Enter your institute address')).toBeDefined()
  })
})
