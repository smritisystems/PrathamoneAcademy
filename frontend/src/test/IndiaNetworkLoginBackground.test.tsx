/**
 * @file        IndiaNetworkLoginBackground.test.tsx
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
 * @created     2026-11-28
 * @updated     2026-11-28
 *
 * @description Vitest regression tests verifying IndiaNetworkLoginBackground default canvas, login background switcher, custom SVG/HTML sandboxing, and footer branding lock.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import IndiaNetworkLoginBackground from '../components/common/IndiaNetworkLoginBackground'

let mockedBackgroundOverride: Record<string, any> = {}

vi.mock('../config/branding', async () => {
  const actual = await vi.importActual<typeof import('../config/branding')>('../config/branding')
  return {
    ...actual,
    useBranding: () => ({
      ...actual.FALLBACK_BRANDING,
      academyName: 'Apex Science Academy',
      city: 'Pune',
      state: 'Maharashtra',
      boards: [{ name: 'Maharashtra State Board', code: 'MSBSHSE' }],
      classes: ['Class IX', 'Class X', 'Standard 11'],
      subjects: ['Physics', 'Chemistry', 'Mathematics'],
      background: {
        ...actual.FALLBACK_BRANDING.background,
        ...mockedBackgroundOverride,
      },
    }),
  }
})

vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({
    login: vi.fn(),
    token: null,
    user: null,
  }),
}))

vi.mock('../api/endpoints', () => ({
  authApi: {
    getClientAgentDevice: vi.fn().mockRejectedValue(new Error('No local agent')),
    login: vi.fn(),
  },
  institutionsApi: {
    getPublicBranding: vi.fn().mockResolvedValue({ data: {} }),
    getPublicCampusNotices: vi.fn().mockResolvedValue({ data: { notices: [] } }),
  },
}))

import LoginPage from '../pages/Login'

function renderLogin() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('IndiaNetworkLoginBackground & Login Switcher', () => {
  beforeEach(() => {
    localStorage.clear()
    mockedBackgroundOverride = {}
  })

  it('renders India Network hero overlay mapped to active institute and canvas element', () => {
    const { container } = render(
      <IndiaNetworkLoginBackground
        instituteName="Sunrise Coaching Classes"
        instituteCity="Pune"
        instituteState="Maharashtra"
        boards={[{ name: 'Maharashtra State Board', code: 'MSBSHSE' }]}
        classes={['Class IX', 'Class X']}
        subjects={['Physics', 'Mathematics']}
      />,
    )

    expect(container.querySelector('.inb-root')).not.toBeNull()
    expect(container.querySelector('canvas')).not.toBeNull()
    const text = container.textContent || ''
    expect(text).toContain('WELCOME TO')
    expect(text).toContain('SUNRISE')
    expect(text).toContain('COACHING CLASSES')
    expect(text).toContain('Pune')
    expect(text).toContain('Maharashtra')
    expect(text).toContain('Pan-India')
  })

  it('defaults Login left panel to India Network, allows switching presets, and locks bottom footer branding', () => {
    const { container } = renderLogin()

    // Default active backdrop should be India Network
    expect(container.querySelector('.inb-root')).not.toBeNull()
    const footer = screen.getByTestId('login-footer-branding')
    expect(footer.textContent).toContain('COACHING INSTITUTE EDITION')

    // Switch to Deep Space
    fireEvent.click(screen.getByRole('button', { name: /Deep Space/i }))
    expect(container.querySelector('.dsb-space')).not.toBeNull()
    expect(container.querySelector('.inb-root')).toBeNull()
    expect(screen.getByTestId('login-footer-branding').textContent).toContain('COACHING INSTITUTE EDITION')

    // Switch to Waves
    fireEvent.click(screen.getByRole('button', { name: /Waves/i }))
    expect(container.querySelector('.dsb-space')).toBeNull()
    expect(screen.getByTestId('login-footer-branding').textContent).toContain('COACHING INSTITUTE EDITION')

    // Reset returns to Institute Default (India Network)
    fireEvent.click(screen.getByRole('button', { name: /Reset/i }))
    expect(container.querySelector('.inb-root')).not.toBeNull()
  })

  it('sanitizes custom SVG, sandboxes custom HTML in iframe, and preserves footer branding', () => {
    mockedBackgroundOverride = {
      mode: 'custom_svg',
      customSvg:
        '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>window.hacked=1</script><circle cx="20" cy="20" r="10"/></svg>',
      customHtml: '<!DOCTYPE html><html><body><canvas id="x"></canvas></body></html>',
    }

    const { container, unmount } = renderLogin()
    const svgWrap = screen.getByTestId('login-bg-custom-svg')
    expect(svgWrap.innerHTML).toContain('<circle')
    expect(svgWrap.innerHTML.toLowerCase()).not.toContain('<script')
    expect(svgWrap.innerHTML.toLowerCase()).not.toContain('onload')
    expect(screen.getByTestId('login-footer-branding').textContent).toContain('COACHING INSTITUTE EDITION')
    unmount()

    mockedBackgroundOverride = {
      mode: 'custom_html',
      customHtml: '<!DOCTYPE html><html><body><div>Custom Institute Scene</div></body></html>',
    }
    renderLogin()
    const htmlWrap = screen.getByTestId('login-bg-custom-html')
    const iframe = htmlWrap.querySelector('iframe')
    expect(iframe).not.toBeNull()
    expect(iframe?.getAttribute('sandbox')).toBe('allow-scripts')
    expect(screen.getByTestId('login-footer-branding').textContent).toContain('COACHING INSTITUTE EDITION')
  })
})
