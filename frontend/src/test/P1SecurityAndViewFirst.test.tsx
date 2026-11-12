/**
 * @file        P1SecurityAndViewFirst.test.tsx
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
 * @description Sprint 2 P1 frontend regression suite validating HTML/SVG/DOM XSS sanitization (H3), Rule 010 role parity & EditModeBar authorization, and View-First reset on tab/query navigation (H4).
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  escapeHtml,
  sanitizeSvgMarkup,
  sanitizeRichHtml,
  sanitizeDomSubtree,
} from '../utils/htmlSanitizer'
import {
  useEditModeStore,
  canActivateEditMode,
} from '../store/editModeStore'
import { EditModeBar } from '../components/common'
import Layout from '../components/Layout'
import { useAuthStore } from '../store/authStore'
import type { User } from '../types'

vi.mock('../api/endpoints', async () => {
  const actual = await vi.importActual<any>('../api/endpoints')
  return {
    ...actual,
    institutionsApi: {
      list: vi.fn().mockResolvedValue({ data: { data: [{ id: 1, name: 'Prashant Academy', code: 'PA001' }] } }),
    },
    academicYearsApi: {
      list: vi.fn().mockResolvedValue({ data: [{ id: 1, name: '2026-27', is_current: true }] }),
    },
  }
})

vi.mock('./Sidebar', () => ({ default: () => <div data-testid="mock-sidebar" /> }))
vi.mock('../components/Sidebar', () => ({ default: () => <div data-testid="mock-sidebar" /> }))
vi.mock('../components/Footer', () => ({ default: () => <div data-testid="mock-footer" /> }))
vi.mock('../components/navigation/GlobalNavigationSearch', () => ({ default: () => null }))
vi.mock('../components/navigation/MenuCustomizerModal', () => ({ default: () => null }))

const makeUser = (role: string, permissions: string[] = []): User => ({
  id: 101,
  username: `${role}_user`,
  first_name: 'Test',
  last_name: role,
  email: `${role}@aitdl.edu.in`,
  role,
  is_active: true,
  permissions,
})

describe('P1 H3 XSS Sanitization Utilities', () => {
  it('escapes HTML metacharacters including quotes and slashes', () => {
    const escaped = escapeHtml(`<script>alert("xss" & '1/2')</script>`)
    expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot; &amp; &#39;1&#x2F;2&#39;)&lt;&#x2F;script&gt;')
  })

  it('sanitizes malicious SVG markup while preserving valid QR vectors', () => {
    const dirtySvg =
      '<svg viewBox="0 0 10 10" onload="alert(1)"><script>alert(2)</script><foreignObject><body onload="alert(3)"></body></foreignObject><use xlink:href="https://evil.example/a.svg#x" /><a href="javascript:alert(4)"><rect x="1" y="1" width="2" height="2" onclick="alert(5)" /></a></svg>'
    const clean = sanitizeSvgMarkup(dirtySvg)

    expect(clean).toContain('<svg')
    expect(clean).toContain('<rect')
    expect(clean.toLowerCase()).not.toContain('<script')
    expect(clean.toLowerCase()).not.toContain('<foreignobject')
    expect(clean.toLowerCase()).not.toContain('onload')
    expect(clean.toLowerCase()).not.toContain('onclick')
    expect(clean.toLowerCase()).not.toContain('javascript:')
    expect(clean.toLowerCase()).not.toContain('https://evil.example')
  })

  it('strips dangerous tags, event handlers, and javascript URIs from rich HTML', () => {
    const dirtyHtml =
      '<div style="color:expression(alert(1))"><p>Hello <strong>World</strong></p><iframe src="https://evil.test"></iframe><img src="x" onerror="alert(1)" /><a href="javascript:alert(2)">Click</a></div>'
    const clean = sanitizeRichHtml(dirtyHtml)

    expect(clean).toContain('<p>Hello <strong>World</strong></p>')
    expect(clean.toLowerCase()).not.toContain('<iframe')
    expect(clean.toLowerCase()).not.toContain('onerror')
    expect(clean.toLowerCase()).not.toContain('javascript:')
    expect(clean.toLowerCase()).not.toContain('expression(')
  })

  it('sanitizes cloned DOM subtrees in-place before print injection', () => {
    const container = document.createElement('div')
    container.innerHTML =
      '<div onclick="evil()"><p>Receipt #101</p><script>window.pwn=1</script><object data="evil.swf"></object><a href="javascript:void(0)">Link</a></div>'
    sanitizeDomSubtree(container)
    const html = container.innerHTML.toLowerCase()

    expect(html).toContain('receipt #101')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('<object')
    expect(html).not.toContain('onclick')
    expect(html).not.toContain('javascript:')
  })
})

describe('P1 H4 Role Parity & Rule 010 View-First Navigation Reset', () => {
  beforeEach(() => {
    useEditModeStore.getState().resetAll()
    useAuthStore.setState({ user: null })
  })

  it('allows counselor, counsellor, coordinator, and receptionist parity in canActivateEditMode & store', () => {
    for (const role of ['counselor', 'counsellor', 'coordinator', 'receptionist', 'admin', 'staff', 'teacher', 'accountant', 'sysadmin']) {
      const u = makeUser(role)
      expect(canActivateEditMode(u).allowed).toBe(true)
      const res = useEditModeStore.getState().enableEditMode(`scope:${role}`, u)
      expect(res.success).toBe(true)
    }

    for (const restricted of ['student', 'parent']) {
      const u = makeUser(restricted)
      expect(canActivateEditMode(u).allowed).toBe(false)
      const res = useEditModeStore.getState().enableEditMode(`scope:${restricted}`, u)
      expect(res.success).toBe(false)
    }

    expect(canActivateEditMode(null).allowed).toBe(false)
  })

  it('renders EditModeBar Enable Edit Mode button for counselor role and unlocks scoped state', () => {
    const counselor = makeUser('counselor')
    useAuthStore.setState({ user: counselor })

    render(<EditModeBar scope="crm:leads" title="Lead Pipeline" />)
    const enableBtn = screen.getByRole('button', { name: /Enable Edit Mode/i })
    fireEvent.click(enableBtn)

    expect(useEditModeStore.getState().isEditMode('crm:leads')).toBe(true)
    expect(screen.getByText(/Edit Mode Active/i)).toBeDefined()
  })

  it('resets active Edit Mode to View Mode when URL query ?tab= changes inside Layout', () => {
    const admin = makeUser('admin', ['*:*'])
    useAuthStore.setState({ user: admin })
    useEditModeStore.getState().enableEditMode('fees:payments', admin)
    expect(useEditModeStore.getState().isEditMode('fees:payments')).toBe(true)

    const NavTester = () => {
      const navigate = useNavigate()
      return (
        <div>
          <Layout />
          <button type="button" onClick={() => navigate('/fees?tab=concessions')}>
            Switch Tab
          </button>
        </div>
      )
    }

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/fees?tab=collect']}>
          <NavTester />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Initial render should remain consistent or reset on navigation to a different ?tab=
    useEditModeStore.getState().enableEditMode('fees:payments', admin)
    expect(useEditModeStore.getState().isEditMode('fees:payments')).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Switch Tab' }))
    expect(useEditModeStore.getState().isEditMode('fees:payments')).toBe(false)
  })
})

