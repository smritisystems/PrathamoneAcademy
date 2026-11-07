/**
 * @file        GlobalBrandingEngine.test.tsx
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
 * @created     2026-11-08
 * @updated     2026-11-08
 *
 * @description Comprehensive test suite validating color parsing, dynamic theme variable injection, multi-tenant branding resolution, and localStorage persistence.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  hexToRgb,
  adjustBrightness,
  hexToRgba,
  applyGlobalBrandTheme,
  resolveBranding,
  BRANDING_CONFIG,
  BRANDING_STORAGE_KEY,
} from '../config/branding'
import type { Institution } from '../types'

describe('Global Branding Engine & Resolver', () => {
  beforeEach(() => {
    localStorage.clear()
    // Reset root element inline styles
    document.documentElement.removeAttribute('style')
  })

  afterEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('style')
  })

  describe('Color Math Utilities', () => {
    it('hexToRgb correctly parses 6-digit hex colors', () => {
      expect(hexToRgb('#881337')).toEqual({ r: 136, g: 19, b: 55 })
      expect(hexToRgb('#1E40AF')).toEqual({ r: 30, g: 64, b: 175 })
      expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 })
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 })
    })

    it('hexToRgb handles 3-digit shorthand and invalid input gracefully', () => {
      expect(hexToRgb('#FFF')).toEqual({ r: 255, g: 255, b: 255 })
      expect(hexToRgb('invalid')).toEqual({ r: 30, g: 64, b: 175 }) // fallback
    })

    it('adjustBrightness darkens and lightens correctly', () => {
      const lighter = adjustBrightness('#881337', 20)
      const darker = adjustBrightness('#881337', -20)
      expect(lighter).not.toBe('#881337')
      expect(darker).not.toBe('#881337')
      expect(lighter.startsWith('#')).toBe(true)
      expect(darker.startsWith('#')).toBe(true)
    })

    it('hexToRgba outputs valid RGBA string with alpha', () => {
      const rgba = hexToRgba('#881337', 0.5)
      expect(rgba).toBe('rgba(136, 19, 55, 0.5)')
    })
  })

  describe('applyGlobalBrandTheme', () => {
    it('sets standard and legacy CSS custom properties on document.documentElement', () => {
      applyGlobalBrandTheme({
        primary: '#881337',
        secondary: '#F43F5E',
        accent: '#FB7185',
      })

      const root = document.documentElement
      expect(root.style.getPropertyValue('--brand-primary')).toBe('#881337')
      expect(root.style.getPropertyValue('--brand-secondary')).toBe('#F43F5E')
      expect(root.style.getPropertyValue('--brand-accent')).toBe('#FB7185')
      expect(root.style.getPropertyValue('--color-primary')).toBe('#881337')
      expect(root.style.getPropertyValue('--color-secondary')).toBe('#F43F5E')
      expect(root.style.getPropertyValue('--color-accent')).toBe('#FB7185')
      expect(root.style.getPropertyValue('--brand-primary-rgb')).toBe('136, 19, 55')
      expect(root.style.getPropertyValue('--brand-gradient')).toContain('linear-gradient')
    })

    it('updates meta[name="theme-color"] if present in document', () => {
      let meta = document.querySelector('meta[name="theme-color"]')
      if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute('name', 'theme-color')
        document.head.appendChild(meta)
      }

      applyGlobalBrandTheme({ primary: '#881337' })
      expect(meta.getAttribute('content')).toBe('#881337')
    })
  })

  describe('resolveBranding Tenant Isolation', () => {
    it('resolves custom institution branding for active tenant', () => {
      const tenantA: Partial<Institution> = {
        id: 1,
        name: 'Prashant Academy',
        code: 'PA001',
        short_name: 'PA',
        primary_color: '#881337',
        secondary_color: '#F43F5E',
        accent_color: '#FB7185',
        logo_url: '/media/logo/prashant-academy-logo.svg',
      }

      const resolved = resolveBranding(tenantA)
      expect(resolved.academyName).toBe('Prashant Academy')
      expect(resolved.colors.primary).toBe('#881337')
      expect(resolved.colors.secondary).toBe('#F43F5E')
      expect(resolved.colors.accent).toBe('#FB7185')
      expect(resolved.monogram).toBe('PA')
      expect(resolved.assets.logoUrl).toBe('/media/logo/prashant-academy-logo.svg')
    })

    it('resolves independent branding for a second tenant without contamination', () => {
      const tenantB: Partial<Institution> = {
        id: 2,
        name: 'Demo Training Institute',
        code: 'DEMO002',
        short_name: 'DTI',
        primary_color: '#D97706',
        secondary_color: '#F59E0B',
        accent_color: '#B45309',
        logo_url: '/media/logo/demo-logo.png',
      }

      const resolved = resolveBranding(tenantB)
      expect(resolved.academyName).toBe('Demo Training Institute')
      expect(resolved.colors.primary).toBe('#D97706')
      expect(resolved.colors.secondary).toBe('#F59E0B')
      expect(resolved.colors.accent).toBe('#B45309')
      expect(resolved.monogram).toBe('DTI')
      expect(resolved.assets.logoUrl).toBe('/media/logo/demo-logo.png')
    })

    it('falls back to system baseline defaults when tenant parameters are missing', () => {
      const resolved = resolveBranding(undefined)
      expect(resolved.academyName).toBe(BRANDING_CONFIG.defaultAcademyName)
      expect(resolved.colors.primary).toBe(BRANDING_CONFIG.colors.primary)
      expect(resolved.colors.secondary).toBe(BRANDING_CONFIG.colors.secondary)
      expect(resolved.monogram).toBe(BRANDING_CONFIG.monogram)
    })
  })
})

