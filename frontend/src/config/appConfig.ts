/**
 * @file        appConfig.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.config
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.1.0
 * @created     2026-11-04
 * @updated     2026-11-05
 *
 * @description Centralized application metadata, edition branding, tenant defaults, and version configuration.
 */

import { BRANDING_CONFIG } from './branding'

export const APP_CONFIG = {
  productName: BRANDING_CONFIG.productName,
  edition: BRANDING_CONFIG.edition,
  version: BRANDING_CONFIG.version,
  versionDisplay: `v${BRANDING_CONFIG.version}`,
  website: BRANDING_CONFIG.support.websiteDisplay,
  websiteUrl: BRANDING_CONFIG.support.website,
  defaultTenantName: BRANDING_CONFIG.defaultAcademyName,
  defaultTenantCode: BRANDING_CONFIG.defaultAcademyCode,
  defaultBranchName: BRANDING_CONFIG.defaultBranchName,
  defaultBranchCode: BRANDING_CONFIG.defaultBranchCode,
} as const

export { BRANDING_CONFIG }
