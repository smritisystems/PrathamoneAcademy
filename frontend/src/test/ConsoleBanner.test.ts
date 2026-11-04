/**
 * @file        ConsoleBanner.test.ts
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
 * @created     2026-11-05
 * @updated     2026-11-05
 *
 * @description Unit tests verifying browser console startup banner rendering, execution gating, and security privacy controls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  printConsoleBrandingBanner,
  resetConsoleBrandingBannerFlag,
} from '../utils/consoleBanner'
import { BRANDING_CONFIG } from '../config/branding'

describe('Browser Console Startup Branding Banner', () => {
  let consoleSpy: any

  beforeEach(() => {
    resetConsoleBrandingBannerFlag()
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    resetConsoleBrandingBannerFlag()
  })

  it('prints the styled startup banner once upon application initialization', () => {
    const result = printConsoleBrandingBanner()
    expect(result).toBe(true)
    expect(consoleSpy).toHaveBeenCalledTimes(1)

    const logArgs = consoleSpy.mock.calls[0]
    const bannerText = logArgs[0] as string

    // Must include PrathamOne Academy application name
    expect(bannerText).toContain('PRATHAMONE ACADEMY')
    // Must include Academy name
    expect(bannerText).toContain('PRASHANT ACADEMY')
    // Must include Version and build number
    expect(bannerText).toContain(BRANDING_CONFIG.version)
    expect(bannerText).toContain(BRANDING_CONFIG.buildNumber)
    // Must include Environment
    expect(bannerText).toContain(BRANDING_CONFIG.environment.toUpperCase())
    // Must include Copyright notice
    expect(bannerText).toContain('Copyright')
    // Must include Official support contact or website
    expect(bannerText).toContain(BRANDING_CONFIG.support.websiteDisplay)
    expect(bannerText).toContain(BRANDING_CONFIG.support.email)
  })

  it('suppresses duplicate startup banner logs on subsequent invocations', () => {
    const firstCall = printConsoleBrandingBanner()
    expect(firstCall).toBe(true)
    expect(consoleSpy).toHaveBeenCalledTimes(1)

    // Second call during same session must return false and not re-log
    const secondCall = printConsoleBrandingBanner()
    expect(secondCall).toBe(false)
    expect(consoleSpy).toHaveBeenCalledTimes(1)

    // Third call
    const thirdCall = printConsoleBrandingBanner()
    expect(thirdCall).toBe(false)
    expect(consoleSpy).toHaveBeenCalledTimes(1)
  })

  it('strictly avoids exposing any sensitive information, tokens, or credentials', () => {
    printConsoleBrandingBanner()
    const logArgs = consoleSpy.mock.calls[0]
    const bannerText = JSON.stringify(logArgs)

    // Ensure no secret patterns or tokens are logged
    expect(bannerText).not.toContain('password')
    expect(bannerText).not.toContain('secret')
    expect(bannerText).not.toContain('token')
    expect(bannerText).not.toContain('Bearer')
    expect(bannerText).not.toContain('apiKey')
    expect(bannerText).not.toContain('private')
  })

  it('can be reset via resetConsoleBrandingBannerFlag for new test sessions', () => {
    expect(printConsoleBrandingBanner()).toBe(true)
    expect(printConsoleBrandingBanner()).toBe(false)

    resetConsoleBrandingBannerFlag()
    expect(printConsoleBrandingBanner()).toBe(true)
  })
})

