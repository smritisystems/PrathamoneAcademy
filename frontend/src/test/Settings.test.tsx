/**
 * @file        Settings.test.tsx
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
 * @created     2026-11-05
 * @updated     2026-11-14
 *
 * @description Vitest test suite for Institute Settings workspace, live branding preview, sub-tabs, lookups CRUD, and category persistence.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import Settings, { SETTINGS_CATEGORIES } from '../pages/Settings'
import { settingsApi } from '../api/endpoints'
import { useEditModeStore } from '../store/editModeStore'

vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 1, role: 'admin', username: 'admin', first_name: 'Admin', last_name: 'Super' },
    selectedInstitutionId: 1,
  }),
  isUserSysAdmin: () => true,
  isUserAdmin: () => true,
  hasPermission: () => true,
}))

const mockProfile = {
  id: 1,
  name: 'PrathamOne Academy',
  code: 'PA001',
  short_name: 'PA',
  tagline: 'Learn • Practice • Achieve',
  institute_type: 'Coaching Institute',
  establishment_year: 2018,
  registration_number: 'MH-COACH-2018-0157',
  tax_id: 'AABCP1234K',
  description: 'A comprehensive coaching academy for school & competitive examinations, focused on concept clarity and student success.',
  is_active: true,
  default_language: 'en',
  timezone: 'Asia/Kolkata',
  address: 'Vasai Road (W), Palghar - 401202',
  city: 'Palghar',
  state: 'Maharashtra',
  pincode: '401202',
  phone: '+91 98765 43210',
  email: 'info@prathamoneacademy.in',
  website: 'https://prathamone.com',
  logo_url: '/logo.svg',
  favicon_url: '/artwork/14112026/batch_rect1-1-8-6_10802.png',
  primary_color: '#0B2D6B',
  secondary_color: '#071C44',
  accent_color: '#F57C00',
}

const mockAllSettings = {
  academic: {
    default_academic_year: '2026-27',
    term_structure: 'Quarterly',
    standard_naming: 'Roman',
    timetable_slot_duration: 45,
    batch_capacity_warning: 40,
  },
  fees: {
    receipt_prefix: 'RCP',
    next_receipt_number: 168,
    currency_symbol: '₹',
    grace_period_days: 7,
  },
}

const mockLookupsResponse = {
  categories: ['EXAM_TYPE', 'PAYMENT_METHOD', 'STUDENT_CATEGORY'],
  items: [
    {
      id: 1,
      category: 'PAYMENT_METHOD',
      code: 'UPI',
      label: 'UPI / QR',
      description: 'GPay, PhonePe, Paytm, BHIM',
      sort_order: 2,
      is_active: true,
      is_system: true,
    },
    {
      id: 2,
      category: 'STUDENT_CATEGORY',
      code: 'GEN',
      label: 'General',
      description: 'General category',
      sort_order: 1,
      is_active: true,
      is_system: true,
    },
  ],
}

const mockAuditLogs = [
  {
    id: 1,
    setting_key: 'profile.name',
    category: 'profile',
    previous_value: 'Old Academy',
    new_value: 'PrathamOne Academy',
    changed_by_name: 'Admin Super',
    reason: 'Updated name',
    created_at: new Date().toISOString(),
  },
]

describe('Institute Settings & Configuration Workspace', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    vi.spyOn(settingsApi, 'getProfile').mockResolvedValue({ data: mockProfile } as any)
    vi.spyOn(settingsApi, 'getAll').mockResolvedValue({ data: mockAllSettings } as any)
    vi.spyOn(settingsApi, 'getLookups').mockResolvedValue({ data: mockLookupsResponse } as any)
    vi.spyOn(settingsApi, 'getAuditLogs').mockResolvedValue({ data: mockAuditLogs } as any)
    vi.spyOn(settingsApi, 'updateProfile').mockResolvedValue({ data: { status: 'success', profile: mockProfile } } as any)
    vi.spyOn(settingsApi, 'updateBatch').mockResolvedValue({ data: { status: 'success' } } as any)
  })

  it('renders all 16 settings workspace categories in navigation', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Settings />
        </BrowserRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Institute Settings')).toBeDefined()
    })

    // Check key categories exist in navigation
    expect(screen.getAllByText('Institute Profile').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Branding & Appearance')).toBeDefined()
    expect(screen.getByText('Academic Configuration')).toBeDefined()
    expect(screen.getByText('Student & Admission Settings')).toBeDefined()
    expect(screen.getByText('Staff & HR Settings')).toBeDefined()
    expect(screen.getByText('Fees & Finance Settings')).toBeDefined()
    expect(screen.getByText('General Lookups')).toBeDefined()
    expect(screen.getByText('Data & Maintenance')).toBeDefined()

    expect(screen.getByText('Navigation & Menu Governance')).toBeDefined()
    expect(screen.getByText('CodeX Configuration Studio')).toBeDefined()

    expect(SETTINGS_CATEGORIES.length).toBe(17)
  })

  it('filters navigation categories when typing in search box', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Settings />
        </BrowserRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search settings...')).toBeDefined()
    })

    const searchInput = screen.getByPlaceholderText('Search settings...')
    fireEvent.change(searchInput, { target: { value: 'fee' } })

    expect(screen.getByText('Fees & Finance Settings')).toBeDefined()
    // Should filter out non-matching categories
    expect(screen.queryByText('Staff & HR Settings')).toBeNull()
  })

  it('renders Institute Profile with Basic Details and live Branding Preview', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Settings />
        </BrowserRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('PrathamOne Academy')).toBeDefined()
      expect(screen.getByDisplayValue('PA')).toBeDefined()
      expect(screen.getByText('Branding Preview')).toBeDefined()
    })

    // Sub-tabs exist
    expect(screen.getByText('Basic Details')).toBeDefined()
    expect(screen.getByText('Address & Contact')).toBeDefined()
    expect(screen.getByText('Branches')).toBeDefined()
    expect(screen.getByText('Affiliations')).toBeDefined()
    expect(screen.getByText('Legal & Compliance')).toBeDefined()
  })

  it('switches sub-tabs within Institute Profile', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Settings />
        </BrowserRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Address & Contact')).toBeDefined()
    })

    fireEvent.click(screen.getByText('Address & Contact'))
    expect(screen.getByText('Campus Address & Public Contact Information')).toBeDefined()

    fireEvent.click(screen.getByText('Branches'))
    expect(screen.getByText('Campus Centers & Branches')).toBeDefined()
  })

  it('switches categories and renders General Lookups table with add lookup modal', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Settings />
        </BrowserRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('General Lookups')).toBeDefined()
    })

    fireEvent.click(screen.getByText('General Lookups'))

    await waitFor(() => {
      expect(screen.getByText('UPI / QR')).toBeDefined()
      expect(screen.getByText('UPI')).toBeDefined()
    })

    // Open Add Lookup modal
    const addButton = screen.getByText('Add New Lookup')
    fireEvent.click(addButton)

    expect(screen.getByText('Add New Lookup Item')).toBeDefined()
    expect(screen.getByPlaceholderText('e.g. UPI_DIRECT')).toBeDefined()
  })

  it('dispatches updateProfile when Save Changes is clicked in Profile category', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Settings />
        </BrowserRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('PrathamOne Academy')).toBeDefined()
    })

    // Enable Edit Mode explicitly
    const enableBtn = screen.getByText('Enable Edit Mode')
    fireEvent.click(enableBtn)

    await waitFor(() => {
      expect(screen.getByText('Save & Exit')).toBeDefined()
    })

    const saveButton = screen.getByText('Save & Exit')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(settingsApi.updateProfile).toHaveBeenCalled()
    })
  })
})
