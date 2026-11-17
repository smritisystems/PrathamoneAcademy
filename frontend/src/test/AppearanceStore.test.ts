/**
 * @file        AppearanceStore.test.ts
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
 * @description Tests browser-local appearance preference resolution, DOM application, and persistence.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import {
  applyAppearance,
  resolveAppearance,
  useAppearanceStore,
} from '../store/appearanceStore'

describe('appearance preference', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    delete document.documentElement.dataset.theme
    useAppearanceStore.setState({ preference: 'light' })
  })

  it('resolves system appearance from the operating-system preference', () => {
    expect(resolveAppearance('system', true)).toBe('dark')
    expect(resolveAppearance('system', false)).toBe('light')
    expect(resolveAppearance('light', true)).toBe('light')
    expect(resolveAppearance('dark', false)).toBe('dark')
  })

  it('applies the resolved mode to the document root', () => {
    applyAppearance('system', true)

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.dataset.theme).toBe('dark')

    applyAppearance('light', true)

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('persists explicit preference changes in browser storage', () => {
    useAppearanceStore.getState().setPreference('dark')

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(JSON.parse(localStorage.getItem('pratham-appearance') || '{}').state.preference).toBe('dark')
  })
})
