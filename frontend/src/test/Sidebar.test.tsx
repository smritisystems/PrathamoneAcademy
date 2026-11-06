/**
 * @file        Sidebar.test.tsx
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
 * @updated     2026-11-07
 *
 * @description Vitest test suite verifying sidebar collapse/expand states, keyboard shortcuts, and active links.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Sidebar from '../components/Sidebar'
import Layout from '../components/Layout'
import { useSidebarStore } from '../store/sidebarStore'
import { useAuthStore } from '../store/authStore'
import { APP_CONFIG } from '../config/appConfig'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
})

const renderWithProviders = (ui: React.ReactElement, initialRoute = '/') => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Collapsible & Responsive Sidebar Component', () => {
  beforeEach(() => {
    localStorage.clear()
    useSidebarStore.setState({
      desktopState: 'expanded',
      mobileOpen: false,
      academicOpen: true,
    })
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
  })

  it('renders expanded sidebar with branding, navigation links, and academic accordion', () => {
    renderWithProviders(<Sidebar />)

    // Institute branding
    expect(screen.getByText('Prashant Academy')).toBeDefined()
    expect(screen.getByText('The Power of Enterprise Education. The Simplicity of WhatsApp.')).toBeDefined()

    // Main navigation items
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeDefined()
    expect(screen.getByRole('link', { name: /students/i })).toBeDefined()
    expect(screen.getByRole('link', { name: /admissions/i })).toBeDefined()

    // Academic accordion parent
    const academicButton = screen.getByRole('button', { name: /academic/i })
    expect(academicButton).toBeDefined()
    expect(academicButton.getAttribute('aria-expanded')).toBe('true')

    // Academic sub-items
    expect(screen.getByText('Academic Structure')).toBeDefined()
    expect(screen.getByText('Classes / Standards')).toBeDefined()
    expect(screen.getByText('Batches')).toBeDefined()

    // Secondary items
    expect(screen.getByRole('link', { name: /attendance/i })).toBeDefined()
    expect(screen.getByRole('link', { name: /tests & results/i })).toBeDefined()
    expect(screen.getByRole('link', { name: /fees & payments/i })).toBeDefined()
    expect(screen.getByRole('link', { name: /users & roles/i })).toBeDefined()

    // Action controls
    expect(screen.getByLabelText('Collapse sidebar')).toBeDefined()
    expect(screen.getByLabelText('Hide sidebar completely')).toBeDefined()

    // User profile footer
    expect(screen.getByText('Super Admin')).toBeDefined()
  })

  it('collapses sidebar to compact icon rail and renders tooltips and flyout popover', () => {
    act(() => {
      useSidebarStore.setState({ desktopState: 'collapsed' })
    })

    renderWithProviders(<Sidebar />)

    const sidebar = screen.getByRole('navigation', { name: 'Main Navigation' })
    expect(sidebar.className).toContain('w-20')

    // Expand button is present
    expect(screen.getByLabelText('Expand sidebar')).toBeDefined()

    // Tooltips are rendered for items in collapsed state
    const tooltips = screen.getAllByRole('tooltip', { hidden: true })
    expect(tooltips.length).toBeGreaterThan(0)
    expect(tooltips.some((t) => t.textContent?.includes('Dashboard'))).toBe(true)

    // Flyout menu for Academic Workspace exists
    const flyoutMenu = screen.getByRole('menu', { hidden: true })
    expect(flyoutMenu).toBeDefined()
    expect(flyoutMenu.textContent).toContain('Academic Workspace')
  })

  it('toggles collapse state using collapse/expand button', () => {
    renderWithProviders(<Sidebar />)

    const collapseBtn = screen.getByLabelText('Collapse sidebar')
    fireEvent.click(collapseBtn)

    expect(useSidebarStore.getState().desktopState).toBe('collapsed')

    // Click expand button
    const expandBtn = screen.getByLabelText('Expand sidebar')
    fireEvent.click(expandBtn)

    expect(useSidebarStore.getState().desktopState).toBe('expanded')
  })

  it('hides sidebar when hide button is clicked', () => {
    renderWithProviders(<Sidebar />)

    const hideBtn = screen.getByLabelText('Hide sidebar completely')
    fireEvent.click(hideBtn)

    expect(useSidebarStore.getState().desktopState).toBe('hidden')
  })

  it('preserves academic accordion toggle state in expanded mode', () => {
    renderWithProviders(<Sidebar />)

    const academicBtn = screen.getByRole('button', { name: /academic/i })
    expect(academicBtn.getAttribute('aria-expanded')).toBe('true')

    // Toggle closed
    fireEvent.click(academicBtn)
    expect(useSidebarStore.getState().academicOpen).toBe(false)
  })

  it('renders student portal sidebar when logged in as student', () => {
    useAuthStore.setState({
      user: {
        id: 99,
        username: 'student.aarav',
        email: 'aarav@example.com',
        role: 'student',
        first_name: 'Aarav',
        last_name: 'Sharma',
      },
    })

    renderWithProviders(<Sidebar />)

    expect(screen.getByRole('navigation', { name: 'Student Navigation' })).toBeDefined()
    expect(screen.getByText('Student Portal')).toBeDefined()
    expect(screen.getByText('Student Dashboard')).toBeDefined()
    expect(screen.getByText('Aarav Sharma')).toBeDefined()
  })
})

describe('Layout Integration & Mobile Drawer', () => {
  beforeEach(() => {
    localStorage.clear()
    useSidebarStore.setState({
      desktopState: 'expanded',
      mobileOpen: false,
      academicOpen: true,
    })
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
  })

  it('renders header with mobile toggle and responds to opening and closing drawer', () => {
    renderWithProviders(<Layout />)

    // Mobile menu toggle button in header
    const mobileToggle = screen.getByLabelText('Open navigation menu')
    expect(mobileToggle).toBeDefined()

    // Open mobile drawer
    fireEvent.click(mobileToggle)
    expect(useSidebarStore.getState().mobileOpen).toBe(true)

    // Backdrop should now be visible
    const backdrop = document.querySelector('.fixed.inset-0.bg-slate-950\\/70')
    expect(backdrop).toBeDefined()

    // Clicking backdrop closes drawer
    if (backdrop) {
      fireEvent.click(backdrop)
      expect(useSidebarStore.getState().mobileOpen).toBe(false)
    }
  })

  it('shows persistent Show Sidebar button in header when desktop state is hidden', () => {
    act(() => {
      useSidebarStore.setState({ desktopState: 'hidden' })
    })

    renderWithProviders(<Layout />)

    // Sidebar aside is hidden
    const sidebar = screen.getByRole('navigation', { name: 'Main Navigation' })
    expect(sidebar.className).toContain('w-0')

    // Header has Show Sidebar button
    const showSidebarBtn = screen.getByLabelText('Show sidebar (Ctrl+B)')
    expect(showSidebarBtn).toBeDefined()

    // Clicking it restores expanded sidebar
    fireEvent.click(showSidebarBtn)
    expect(useSidebarStore.getState().desktopState).toBe('expanded')
  })

  it('handles Ctrl+B keyboard shortcut to toggle sidebar', () => {
    renderWithProviders(<Layout />)

    expect(useSidebarStore.getState().desktopState).toBe('expanded')

    // Trigger Ctrl+B
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true })
    expect(useSidebarStore.getState().desktopState).toBe('collapsed')

    // Trigger Ctrl+B again
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true })
    expect(useSidebarStore.getState().desktopState).toBe('expanded')
  })

  it('closes mobile drawer on Escape key press', () => {
    act(() => {
      useSidebarStore.setState({ mobileOpen: true })
    })

    renderWithProviders(<Layout />)
    expect(useSidebarStore.getState().mobileOpen).toBe(true)

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(useSidebarStore.getState().mobileOpen).toBe(false)
  })

  it('enforces stationary desktop shell with fixed sidebar and independently scrolling main area', () => {
    renderWithProviders(<Layout />)

    // Shell root: 100dvh viewport height and overflow-hidden to prevent document-level scrolling
    const shellRoot = document.querySelector('.flex.h-screen')
    expect(shellRoot).toBeDefined()
    expect(shellRoot?.className).toContain('h-[100dvh]')
    expect(shellRoot?.className).toContain('overflow-hidden')

    // Sidebar: stationary desktop height and no flex shrink
    const sidebar = screen.getByRole('navigation', { name: 'Main Navigation' })
    expect(sidebar.className).toContain('h-full')
    expect(sidebar.className).toContain('md:h-full')
    expect(sidebar.className).toContain('shrink-0')

    // Main content area: owns vertical scrolling with overflow-y-auto and min-h-0
    const mainContent = document.querySelector('main')
    expect(mainContent).toBeDefined()
    expect(mainContent?.className).toContain('overflow-y-auto')
    expect(mainContent?.className).toContain('min-h-0')
    expect(mainContent?.className).toContain('min-w-0')
  })

  it('renders application footer with fully visible institute branch details and product edition information', () => {
    renderWithProviders(<Layout />)

    const footer = screen.getByRole('contentinfo', { name: 'Application Footer' })
    expect(footer).toBeDefined()
    expect(footer.className).toContain('shrink-0')
    expect(footer.className).toContain('print:hidden')

    // Left section: Institute name, tenant code, and branch details
    expect(within(footer).getByText('Prashant Academy')).toBeDefined()
    expect(screen.getByText('Branch: Jankalyan Nagar, Malad West')).toBeDefined()

    // Product and right sections: Product, edition, system, version, and website
    expect(screen.getByText('Coaching Institute Edition')).toBeDefined()
    expect(screen.getByText('PrathamOne EduOS — Education Operating System')).toBeDefined()
    expect(screen.getAllByText(APP_CONFIG.versionDisplay).length).toBeGreaterThanOrEqual(1)

    const websiteLink = screen.getByRole('link', { name: 'prathamone.com' })
    expect(websiteLink).toBeDefined()
    expect(websiteLink.getAttribute('href')).toBe('https://prathamone.com')
    expect(websiteLink.getAttribute('target')).toBe('_blank')

    // Ensure no restrictive truncation classes are applied to the footer
    expect(footer.className).not.toContain('truncate')
    expect(footer.className).not.toContain('overflow-x-auto')
  })

  it('maintains proper footer alignment across collapsed and expanded sidebar states', () => {
    renderWithProviders(<Layout />)

    const footer = screen.getByRole('contentinfo', { name: 'Application Footer' })
    expect(footer).toBeDefined()

    // When sidebar collapses to rail
    act(() => {
      useSidebarStore.setState({ desktopState: 'collapsed' })
    })

    expect(screen.getByText('Branch: Jankalyan Nagar, Malad West')).toBeDefined()
    expect(screen.getByText('Coaching Institute Edition')).toBeDefined()
    expect(screen.getAllByText(APP_CONFIG.versionDisplay).length).toBeGreaterThanOrEqual(1)

    // When sidebar expands back
    act(() => {
      useSidebarStore.setState({ desktopState: 'expanded' })
    })

    expect(screen.getByText('Branch: Jankalyan Nagar, Malad West')).toBeDefined()
    expect(screen.getByText('Coaching Institute Edition')).toBeDefined()
    expect(screen.getAllByText(APP_CONFIG.versionDisplay).length).toBeGreaterThanOrEqual(1)
  })
})

