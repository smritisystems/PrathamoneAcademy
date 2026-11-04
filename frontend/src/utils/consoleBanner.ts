/**
 * @file        consoleBanner.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.utils
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
 * @description Secure, once-only startup console branding banner logging application identity without sensitive credential leakage.
 */

import { BRANDING_CONFIG } from '../config/branding'

declare global {
  interface Window {
    __PRATHAMONE_CONSOLE_BANNER_PRINTED__?: boolean
  }
}

let isBannerPrintedLocally = false

/**
 * Renders an official styled startup banner in the browser console.
 * Guarded against repeated execution during hot-reloads or route transitions.
 */
export function printConsoleBrandingBanner(branding = BRANDING_CONFIG): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  // Prevent duplicate logs across React strict mode or HMR
  if (isBannerPrintedLocally || window.__PRATHAMONE_CONSOLE_BANNER_PRINTED__) {
    return false
  }

  isBannerPrintedLocally = true
  window.__PRATHAMONE_CONSOLE_BANNER_PRINTED__ = true

  // Colors and typography styles for console rendering
  const titleStyle = [
    'background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #06b6d4 100%)',
    'color: #ffffff',
    'font-size: 14px',
    'font-weight: 900',
    'padding: 8px 16px',
    'border-radius: 6px 6px 0 0',
    'display: block',
    'text-shadow: 0 1px 2px rgba(0,0,0,0.4)',
    'letter-spacing: 0.5px',
  ].join(';')

  const metaStyle = [
    'background: #0f172a',
    'color: #94a3b8',
    'font-size: 11px',
    'font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    'padding: 6px 16px',
    'border-left: 3px solid #3b82f6',
    'display: block',
    'line-height: 1.5',
  ].join(';')

  const badgeStyle = [
    'background: #1e293b',
    'color: #38bdf8',
    'font-size: 10px',
    'font-weight: 700',
    'padding: 4px 16px',
    'border-radius: 0 0 6px 6px',
    'display: block',
  ].join(';')

  const { appName, edition, version, buildNumber, environment, copyright, defaultAcademyName, support } = branding

  const line1 = `%c🎓 ${appName.toUpperCase()} • ${defaultAcademyName.toUpperCase()}`
  const line2 = [
    `%cEdition:      ${edition}`,
    `Version:      v${version} (Build: ${buildNumber})`,
    `Environment:  ${environment.toUpperCase()}`,
    `Official Web: ${support.websiteDisplay} | ${support.academyWebsiteDisplay}`,
    `Support:      ${support.email}`,
    `Legal:        ${copyright}`,
  ].join('\n')
  const line3 = `%c⚡ Enterprise-Grade Security • DPDP Act 2023 Compliant • Role-Based Access Control`

  // Format safely into console without exposing any memory addresses or tokens
  try {
    console.log(`${line1}\n${line2}\n${line3}`, titleStyle, metaStyle, badgeStyle)
  } catch {
    // Graceful fallback for non-standard console environments
    console.log(`[${appName}] v${version} (${environment}) - ${defaultAcademyName}`)
  }

  return true
}

/**
 * Resets the banner print guard (strictly used in testing harnesses).
 */
export function resetConsoleBrandingBannerFlag(): void {
  isBannerPrintedLocally = false
  if (typeof window !== 'undefined') {
    delete window.__PRATHAMONE_CONSOLE_BANNER_PRINTED__
  }
}

