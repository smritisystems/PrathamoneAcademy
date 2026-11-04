/**
 * @file        Footer.test.tsx
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
 * @created     2026-11-04
 * @updated     2026-11-04
 *
 * @description Comprehensive unit and specification tests verifying footer sections, dynamic page title resolution, connection status, user roles, and versioning.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Footer, { resolvePageTitle } from '../components/Footer'
import { useAuthStore } from '../store/authStore'
import { APP_CONFIG } from '../config/appConfig'

describe('Application Footer Specifications', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    })
    useAuthStore.setState({
      token: 'mock-jwt-token',
      user: {
        id: 42,
        username: 'staff.admin',
        email: 'staff.admin@prashantacademy.edu.in',
        first_name: 'Priya',
        last_name: 'Sharma',
        role: 'admin',
        institution_id: 2,
      },
      selectedInstitutionId: 2,
      selectedAcademicYearId: 1,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const renderFooter = (initialPath = '/dashboard') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Footer />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  it('renders Left section with institute name, tenant code, and branch details', () => {
    renderFooter()

    expect(screen.getByText('Prashant Academy')).toBeDefined()
    expect(screen.getByText('[PA001]')).toBeDefined()
    expect(screen.getByText('Branch: Jankalyan Nagar, Malad West')).toBeDefined()
    expect(screen.getByText('(MALAD-W)')).toBeDefined()
  })

  it('renders Center section with dynamically resolved page/menu title', () => {
    renderFooter('/fees')

    const pageTitle = screen.getByTestId('footer-page-title')
    expect(pageTitle.textContent).toBe('Fees & Payments')
  })

  it('correctly resolves academic tabs dynamically without hardcoded labels', () => {
    expect(resolvePageTitle('/academic', '?tab=boards')).toBe('Boards')
    expect(resolvePageTitle('/academic', '?tab=classes')).toBe('Classes / Standards')
    expect(resolvePageTitle('/academic', '?tab=timetable')).toBe('Timetable')
    expect(resolvePageTitle('/academic', '?tab=reports')).toBe('Academic Reports')
    expect(resolvePageTitle('/academic', '')).toBe('Academic Structure')
  })

  it('correctly resolves entity and parameterized routes dynamically', () => {
    expect(resolvePageTitle('/students', '')).toBe('Students')
    expect(resolvePageTitle('/students/add', '')).toBe('Admissions')
    expect(resolvePageTitle('/students/142', '')).toBe('Student Profile')
    expect(resolvePageTitle('/users/5', '')).toBe('User Profile')
    expect(resolvePageTitle('/forms', '')).toBe('Print Forms & KYC')
    expect(resolvePageTitle('/fees/collect/129', '')).toBe('Fee Collection')
    expect(resolvePageTitle('/receipts/RCP-001001', '')).toBe('Fee Receipt')
    expect(resolvePageTitle('/custom-analytics-overview', '')).toBe('Custom Analytics Overview')
  })

  it('renders Product section with system name, Enterprise Edition, and verified prathamone.com link', () => {
    renderFooter()

    expect(screen.getByText('PrathamOne Academy Management System')).toBeDefined()
    expect(screen.getByText('Enterprise Edition')).toBeDefined()

    const link = screen.getByRole('link', { name: 'prathamone.com' })
    expect(link).toBeDefined()
    expect(link.getAttribute('href')).toBe('https://prathamone.com')
    expect(link.getAttribute('target')).toBe('_blank')
  })

  it('renders Right section with user ID, user role, live status, and actual version v6.99.1', () => {
    renderFooter()

    expect(screen.getByText('UID: #42')).toBeDefined()
    expect(screen.getByText('Role: Admin')).toBeDefined()
    expect(screen.getByText('Online')).toBeDefined()
    expect(screen.getByText('v6.99.1')).toBeDefined()
  })

  it('updates live connection indicator when offline and online events trigger', () => {
    renderFooter()

    expect(screen.getByText('Online')).toBeDefined()

    // Trigger offline event
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(screen.getByText('Offline')).toBeDefined()

    // Trigger online event
    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(screen.getByText('Online')).toBeDefined()
  })

  it('handles role variations and displays capitalized role', () => {
    useAuthStore.setState({
      user: {
        id: 88,
        username: 'accountant.rahul',
        email: 'rahul@prashantacademy.edu.in',
        first_name: 'Rahul',
        last_name: 'Verma',
        role: 'accountant',
      },
    })

    renderFooter()

    expect(screen.getByText('UID: #88')).toBeDefined()
    expect(screen.getByText('Role: Accountant')).toBeDefined()
  })

  it('maintains compact styling without horizontal scrollbars or clipping', () => {
    const { container } = renderFooter()

    const footer = container.querySelector('footer')
    expect(footer).toBeDefined()
    expect(footer?.className).toContain('shrink-0')
    expect(footer?.className).toContain('text-[10.5px]')
    expect(footer?.className).not.toContain('overflow-x-auto')
  })
})

