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
 * @updated     2026-11-18
 *
 * @description Tests browser-local appearance preference resolution, DOM application, and persistence.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import {
  applyAppearance,
  resolveAppearance,
  isAppearancePreference,
  useAppearanceStore,
} from '../store/appearanceStore'

describe('appearance preference', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    delete document.documentElement.dataset.theme
    useAppearanceStore.setState({ preference: 'light' })
  })

  it('validates appearance preference values strictly', () => {
    expect(isAppearancePreference('light')).toBe(true)
    expect(isAppearancePreference('dark')).toBe(true)
    expect(isAppearancePreference('system')).toBe(true)
    expect(isAppearancePreference('invalid')).toBe(false)
    expect(isAppearancePreference(null)).toBe(false)
    expect(isAppearancePreference(undefined)).toBe(false)
    expect(isAppearancePreference(123)).toBe(false)
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

  it('preserves tenant brand CSS properties when switching appearance modes', () => {
    document.documentElement.style.setProperty('--brand-primary', '#0B2D6B')
    document.documentElement.style.setProperty('--brand-secondary', '#071C44')
    document.documentElement.style.setProperty('--brand-accent', '#F16906')

    applyAppearance('dark', false)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.style.getPropertyValue('--brand-primary')).toBe('#0B2D6B')
    expect(document.documentElement.style.getPropertyValue('--brand-secondary')).toBe('#071C44')
    expect(document.documentElement.style.getPropertyValue('--brand-accent')).toBe('#F16906')

    applyAppearance('light', false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.style.getPropertyValue('--brand-primary')).toBe('#0B2D6B')
  })
})
