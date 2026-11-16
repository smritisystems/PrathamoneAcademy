/**
 * @file        SidebarStore.test.ts
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
 * @created     2026-11-17
 * @updated     2026-11-17
 *
 * @description Sidebar store default-state regression tests.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

const originalViewportWidth = window.innerWidth

afterEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalViewportWidth })
  localStorage.clear()
  vi.resetModules()
})

describe('sidebar default state', () => {
  it('starts expanded on tablet-sized viewports when no preference is saved', async () => {
    localStorage.clear()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 900 })
    vi.resetModules()

    const { useSidebarStore } = await import('../store/sidebarStore')

    expect(useSidebarStore.getState().desktopState).toBe('expanded')
  })
})
