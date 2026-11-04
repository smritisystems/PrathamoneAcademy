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
 * @version     1.0.0
 * @created     2026-11-04
 * @updated     2026-11-04
 *
 * @description Centralized application metadata, edition branding, tenant defaults, and version configuration.
 */

import pkg from '../../package.json'

export const APP_CONFIG = {
  productName: 'PrathamOne Academy Management System',
  edition: 'Enterprise Edition',
  version: pkg.version || '6.99.1',
  versionDisplay: `v${pkg.version || '6.99.1'}`,
  website: 'prathamone.com',
  websiteUrl: 'https://prathamone.com',
  defaultTenantName: 'Prashant Academy',
  defaultTenantCode: 'PA001',
  defaultBranchName: 'Jankalyan Nagar, Malad West',
  defaultBranchCode: 'MALAD-W',
} as const

