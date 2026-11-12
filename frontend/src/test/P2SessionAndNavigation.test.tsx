/**
 * @file        P2SessionAndNavigation.test.tsx
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
 * @created     2026-11-12
 * @updated     2026-11-12
 *
 * @description Regression tests verifying Sprint 3 HttpOnly cookie session hygiene (no JWT persisted in localStorage), Sidebar SSOT filtering, and shared INR/date formatters.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import apiClient from '../api/client'
import { useAuthStore } from '../store/authStore'
import Sidebar from '../components/Sidebar'
import { useSidebarStore } from '../store/sidebarStore'
import { CANONICAL_MODULE_REGISTRY } from '../config/modules'
import { formatINR, formatDateIN } from '../utils/formatters'

describe('Sprint 3 Cookie Session, Sidebar SSOT & Shared Formatter Specifications', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.getState().logout()
  })

  it('never writes JWT tokens to localStorage and omits Bearer header in cookie-session mode', () => {
    expect(apiClient.defaults.withCredentials).toBe(true)

    useAuthStore.getState().login('cookie-session', {
      id: 10,
      username: 'cookie_admin',
      email: 'admin@test.edu.in',
      first_name: 'Cookie',
      last_name: 'Admin',
      role: 'admin',
      institution_id: 1,
    })

    const persistedRaw = localStorage.getItem('prashant-auth') || '{}'
    expect(persistedRaw).not.toContain('cookie-session')
    expect(persistedRaw).not.toContain('"token"')
    expect(JSON.parse(persistedRaw)?.state?.user?.username).toBe('cookie_admin')

    // @ts-ignore
    const reqInterceptor: any = apiClient.interceptors.request.handlers[0]?.fulfilled
    const cfg = reqInterceptor({ headers: {} })
    expect(cfg.headers.Authorization).toBeUndefined()
  })

  it('enforces modules.ts permission filtering in Sidebar Standard Menu and exposes homework subroutes', () => {
    const hwMod = CANONICAL_MODULE_REGISTRY.find((m) => m.id === 'homework')
    const hwRoutes = hwMod?.subItems.map((s) => s.to) || []
    expect(hwRoutes).toContain('/homework/submissions')
    expect(hwRoutes).toContain('/homework/templates')

    useSidebarStore.setState({ desktopState: 'expanded', mobileOpen: false })
    useAuthStore.setState({
      token: 'cookie-session',
      user: {
        id: 25,
        username: 'teacher_basic',
        email: 'teacher@test.edu.in',
        first_name: 'Basic',
        last_name: 'Teacher',
        role: 'teacher',
        permissions: ['students:view'],
      },
      selectedInstitutionId: 1,
      selectedAcademicYearId: 1,
    })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Sidebar />
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeDefined()
    expect(screen.queryByRole('link', { name: 'Users & Roles' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Housekeeping' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'SysAdmin Center' })).toBeNull()
  })

  it('formats INR amounts and Indian dates consistently via shared SSOT helpers', () => {
    expect(formatINR(125000)).toBe('₹1,25,000')
    expect(formatINR(1250.5, { minimumFractionDigits: 2 })).toBe('₹1,250.50')
    expect(formatINR(950, { withSymbol: false })).toBe('950')
    expect(formatDateIN(null)).toBe('—')
    expect(formatDateIN('2026-11-12')).toContain('2026')
  })
})

