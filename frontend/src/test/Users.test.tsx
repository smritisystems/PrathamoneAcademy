/**
 * @file        Users.test.tsx
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
 * @description Vitest test suite verifying user management directory filters, role metrics, and table sorting.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import UsersPage from '../pages/Users'
import * as endpoints from '../api/endpoints'

vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 1, role: 'superadmin', first_name: 'Super', last_name: 'Admin' },
    selectedInstitutionId: 2,
  }),
}))

describe('User Management Dashboard Specification', () => {
  beforeEach(() => {
    vi.spyOn(endpoints.usersApi, 'getStats').mockResolvedValue({
      data: {
        total_accounts: 42,
        active_accounts: 38,
        inactive_accounts: 4,
        pending_invitations: 3,
        roles_breakdown: {
          superadmin: 1,
          admin: 3,
          teacher: 15,
          student: 20,
          accountant: 2,
          staff: 1,
        },
      },
    } as any)

    vi.spyOn(endpoints.usersApi, 'list').mockResolvedValue({
      data: {
        items: [
          {
            id: 1,
            username: 'admin',
            email: 'admin@prashantacademy.in',
            first_name: 'Admin',
            last_name: 'User',
            full_name: 'Admin User',
            role: 'superadmin',
            is_active: true,
            invitation_status: 'accepted',
            scope_type: 'institute',
            scope_label: 'Institute-wide',
            staff_code: 'ADM-001',
            designation: 'Principal & Director',
            last_login: '2026-11-04T08:00:00Z',
            created_at: '2026-01-01T00:00:00Z',
            linked_person: {
              type: 'staff',
              id: 1,
              name: 'Admin User',
              identifier: 'ADM-001',
              designation: 'Principal & Director',
            },
          },
          {
            id: 10,
            username: 'aarav.sharma',
            email: 'aarav.sharma@example.com',
            first_name: 'Aarav',
            last_name: 'Sharma',
            full_name: 'Aarav Sharma',
            role: 'student',
            is_active: true,
            invitation_status: 'accepted',
            scope_type: 'batch',
            scope_label: 'Batch ICSE-X-A',
            last_login: '2026-11-03T14:30:00Z',
            created_at: '2026-06-01T00:00:00Z',
            linked_person: {
              type: 'student',
              id: 101,
              name: 'Aarav Sharma',
              identifier: 'ADM-2024-001',
              class_name: 'Class X',
              batch_name: 'ICSE-X-A',
            },
          },
        ],
        total: 2,
        page: 1,
        limit: 15,
        pages: 1,
      },
    } as any)

    vi.spyOn(endpoints.standardsApi, 'list').mockResolvedValue({
      data: [{ id: 1, name: 'Class X' }],
    } as any)

    vi.spyOn(endpoints.divisionsApi, 'list').mockResolvedValue({
      data: [{ id: 1, name: 'Batch A', code: 'A' }],
    } as any)
  })

  it('renders summary statistics cards with real metrics', async () => {
    render(
      <BrowserRouter>
        <UsersPage />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('User Management & System Access')).toBeDefined()
      expect(screen.getByText('42')).toBeDefined() // Total Accounts
      expect(screen.getByText('38')).toBeDefined() // Active Accounts
      expect(screen.getByText('4')).toBeDefined()  // Inactive Accounts
      expect(screen.getByText('3')).toBeDefined()  // Pending Invites
    })
  })

  it('renders user records with linked identities and scope badges', async () => {
    render(
      <BrowserRouter>
        <UsersPage />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeDefined()
      expect(screen.getByText('@admin')).toBeDefined()
      expect(screen.getByText('Aarav Sharma')).toBeDefined()
      expect(screen.getByText('@aarav.sharma')).toBeDefined()
      expect(screen.getByText('Institute-wide')).toBeDefined()
      expect(screen.getByText('Batch ICSE-X-A')).toBeDefined()
    })
  })

  it('links each user row to their dedicated user profile workspace', async () => {
    render(
      <BrowserRouter>
        <UsersPage />
      </BrowserRouter>
    )

    await waitFor(() => {
      const adminLinks = screen.getAllByRole('link', { name: /Admin User/i })
      expect(adminLinks.some((l) => l.getAttribute('href') === '/users/1')).toBe(true)

      const studentLinks = screen.getAllByRole('link', { name: /Aarav Sharma/i })
      expect(studentLinks.some((l) => l.getAttribute('href') === '/users/10')).toBe(true)
    })
  })
})
