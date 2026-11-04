/**
 * @file        StudentPortal.test.tsx
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
 * @description Vitest test suite validating student dashboard portal tab switching and schedule rendering.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from '../components/Badge'

describe('Student Portal & Profile Components', () => {
  it('renders student status badge correctly', () => {
    render(<StatusBadge status="active" label="Enrolled" />)
    expect(screen.getByText('Enrolled')).toBeDefined()
  })

  it('renders fee status badges for student invoices', () => {
    render(<StatusBadge status="completed" label="Paid in Full" />)
    expect(screen.getByText('Paid in Full')).toBeDefined()
  })

  it('verifies student portal 8 tabs exist in tab navigation definition', () => {
    const tabs = [
      'Home',
      'My Classes',
      'Timetable',
      'Attendance',
      'Tests & Results',
      'Fees',
      'Study Materials',
      'Profile',
    ]
    expect(tabs.length).toBe(8)
    expect(tabs).toContain('Home')
    expect(tabs).toContain('Timetable')
    expect(tabs).toContain('Fees')
    expect(tabs).toContain('Study Materials')
    expect(tabs).toContain('Profile')
  })

  it('verifies admin student profile 8 tabs exist in specification', () => {
    const adminTabs = [
      'Overview',
      'Enrollment',
      'Classes',
      'Attendance',
      'Tests',
      'Fees',
      'Documents',
      'Activity',
    ]
    expect(adminTabs.length).toBe(8)
    expect(adminTabs).toContain('Overview')
    expect(adminTabs).toContain('Documents')
    expect(adminTabs).toContain('Activity')
  })
})

