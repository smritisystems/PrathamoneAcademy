/**
 * @file        useDocumentTitle.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.hooks
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
 * @description Hook dynamically updating browser document title and metadata with centralized application branding.
 */

import { useEffect } from 'react'
import { useBranding } from '../config/branding'

/**
 * Updates the document title reactively incorporating page title and centralized branding.
 */
export function useDocumentTitle(pageTitle?: string): void {
  const branding = useBranding()

  useEffect(() => {
    if (typeof document === 'undefined') return

    const baseTitle = `${branding.academyName} – ${branding.appName}`
    document.title = pageTitle ? `${pageTitle} | ${baseTitle}` : baseTitle
  }, [pageTitle, branding.academyName, branding.appName])
}

