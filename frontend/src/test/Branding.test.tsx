/**
 * @file        Branding.test.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.test
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.1.0
 * @created     2026-11-05
 * @updated     2026-11-11
 *
 * @description Unit and integration tests verifying centralized branding configuration, AITDL parent organization, product ecosystem, and dynamic tenant resolution.
 */

import { describe, it, expect } from 'vitest'
import { BRANDING_CONFIG, resolveBranding } from '../config/branding'
import { APP_CONFIG } from '../config/appConfig'

describe('Centralized Application Branding & Identity System', () => {
  it('defines valid core application branding tokens', () => {
    expect(BRANDING_CONFIG.appName).toBe('PrathamOne EduOS')
    expect(BRANDING_CONFIG.shortName).toBe('PrathamOne')
    expect(BRANDING_CONFIG.suiteName).toBe('PrathamOne EduOS')
    expect(BRANDING_CONFIG.edition).toBe('Coaching Institute Edition')
    expect(BRANDING_CONFIG.defaultAcademyName).toBe('Prashant Academy')
    expect(BRANDING_CONFIG.defaultAcademyCode).toBe('PA001')
    expect(BRANDING_CONFIG.monogram).toBe('PA')
  })

  it('exposes version, build number, and environment without leakage', () => {
    expect(BRANDING_CONFIG.version).toMatch(/^\d+\.\d+\.\d+$/)
    expect(BRANDING_CONFIG.buildNumber).toBeDefined()
    expect(typeof BRANDING_CONFIG.buildNumber).toBe('string')
    expect(BRANDING_CONFIG.environment).toBeDefined()
    expect(BRANDING_CONFIG.copyright).toContain('AITDL')
  })

  it('defines AITDL parent organization structure and product ecosystem', () => {
    const { parentOrganization, products, salesSupport } = BRANDING_CONFIG

    // Parent Organization
    expect(parentOrganization.name).toBe('AITDL — AI Technology & Development Lab')
    expect(parentOrganization.website).toBe('https://aitdl.com')
    expect(parentOrganization.websiteDisplay).toBe('aitdl.com')

    // Products hierarchy
    expect(products).toHaveLength(3)

    const [prathamOne, smritiBooks, smritiSys] = products

    expect(prathamOne.name).toBe('PrathamOne')
    expect(prathamOne.description).toBe('Education, Coaching Institute Management, ERP & AI Solutions')
    expect(prathamOne.website).toBe('https://prathamone.com')
    expect(prathamOne.isCurrent).toBe(true)

    expect(smritiBooks.name).toBe('SmritiBooks')
    expect(smritiBooks.description).toBe('Accounting & Bookkeeping Software')
    expect(smritiBooks.website).toBe('https://smritibooks.com')

    expect(smritiSys.name).toBe('SmritiSys')
    expect(smritiSys.description).toBe('E-commerce, Inventory & Warehouse Management')
    expect(smritiSys.website).toBe('https://smritisys.com')

    // Sales & Support phone numbers
    expect(salesSupport.phones).toContain('9323 023 007')
    expect(salesSupport.phones).toContain('9324 117 007')
    expect(salesSupport.displayPhones).toBe('9323 023 007 | 9324 117 007')
  })

  it('defines consistent design tokens and brand colors', () => {
    const { colors } = BRANDING_CONFIG
    expect(colors.primary).toMatch(/^#[0-9a-fA-F]{6}$/)
    expect(colors.secondary).toMatch(/^#[0-9a-fA-F]{6}$/)
    expect(colors.accent).toMatch(/^#[0-9a-fA-F]{6}$/)
    expect(colors.gold).toMatch(/^#[0-9a-fA-F]{6}$/)
    expect(colors.success).toMatch(/^#[0-9a-fA-F]{6}$/)
  })

  it('provides official support contact information', () => {
    const { support } = BRANDING_CONFIG
    expect(support.email).toBe('support@prathamone.com')
    expect(support.phone).toBe('+91-22-12345678')
    expect(support.website).toBe('https://prathamone.com')
    expect(support.academyWebsite).toBe('https://example.com')
  })

  it('maintains backwards compatibility with APP_CONFIG', () => {
    expect(APP_CONFIG.productName).toBe(BRANDING_CONFIG.productName)
    expect(APP_CONFIG.version).toBe(BRANDING_CONFIG.version)
    expect(APP_CONFIG.defaultTenantName).toBe(BRANDING_CONFIG.defaultAcademyName)
    expect(APP_CONFIG.defaultTenantCode).toBe(BRANDING_CONFIG.defaultAcademyCode)
    expect(APP_CONFIG.parentOrganization).toEqual(BRANDING_CONFIG.parentOrganization)
    expect(APP_CONFIG.products).toEqual(BRANDING_CONFIG.products)
    expect(APP_CONFIG.salesSupport).toEqual(BRANDING_CONFIG.salesSupport)
  })

  describe('resolveBranding() Tenant Overrides', () => {
    it('returns default academy branding when no institution is provided', () => {
      const resolved = resolveBranding(null)
      expect(resolved.academyName).toBe('Prashant Academy')
      expect(resolved.academyCode).toBe('PA001')
      expect(resolved.monogram).toBe('PA')
      expect(resolved.appName).toBe('PrathamOne EduOS')
      expect(resolved.parentOrganization.name).toBe('AITDL — AI Technology & Development Lab')
      expect(resolved.products).toHaveLength(3)
    })

    it('dynamically adapts branding to custom institutions while preserving core engine identity', () => {
      const customInst = {
        id: 99,
        name: 'Apex Tutorials',
        code: 'AT999',
        city: 'Pune',
        state: 'Maharashtra',
        address: 'FC Road',
        phone: '+91-20-98765432',
        email: 'info@apextutorials.edu.in',
        website: 'https://apextutorials.edu.in',
        logo_url: '/custom-logo.png',
      }

      const resolved = resolveBranding(customInst)
      // Custom overrides
      expect(resolved.academyName).toBe('Apex Tutorials')
      expect(resolved.academyCode).toBe('AT999')
      expect(resolved.monogram).toBe('AT')
      expect(resolved.institutionPhone).toBe('+91-20-98765432')
      expect(resolved.institutionEmail).toBe('info@apextutorials.edu.in')
      expect(resolved.institutionAddress).toContain('FC Road, Pune, Maharashtra')
      expect(resolved.assets.logoUrl).toBe('/custom-logo.png')

      // Core PrathamOne engine branding remains intact
      expect(resolved.appName).toBe('PrathamOne EduOS')
      expect(resolved.suiteName).toBe('PrathamOne EduOS')
      expect(resolved.version).toBe(BRANDING_CONFIG.version)
      expect(resolved.parentOrganization.name).toBe('AITDL — AI Technology & Development Lab')
      expect(resolved.salesSupport.displayPhones).toContain('9323 023 007')
    })

    it('correctly calculates monograms for single-word institutions', () => {
      const singleWordInst = { name: 'Ignite', code: 'IG01' }
      const resolved = resolveBranding(singleWordInst)
      expect(resolved.monogram).toBe('IG')
    })
  })
})
