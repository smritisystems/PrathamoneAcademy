/**
 * @file        helpNavigation.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      src.components.help
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-11
 * @updated     2026-11-12
 *
 * @description Source component for Helpnavigation in the src.components.help module.
 */

// /**
//  * @file        helpNavigation.ts
//  * @project     PrathamOne EduOS Coaching Institute Management System
//  * @module      frontend.src.components.help
//  *
//  * @author      Jawahar R. Mallah
//  * @organization AITDL (AI Technology & Development Lab)
//  * @client      Prashant Academy Coaching Institute
//  * @copyright   Copyright (c) 2026 AITDL
//  * @license     Proprietary
//  *
//  * @version     1.0.0
//  * @created     2026-11-11
//  * @updated     2026-11-11
//  *
//  * @description Shared navigation structure, section metadata, and role helpers for the Help & About Centre.
//  */

import type { HelpSectionKey } from '../../types'

export type HelpWorkspaceTab =
  | 'overview'
  | 'getting_started'
  | 'module_guide'
  | 'tutorial'
  | 'faq'
  | 'support'
  | 'about_product'
  | 'about_company'
  | 'version'
  | 'legal'
  | 'system_info'
  | 'governance'

export interface HelpTabDescriptor {
  id: HelpWorkspaceTab
  label: string
  shortLabel: string
  path: string
  adminOnly?: boolean
}

export const HELP_WORKSPACE_TABS: HelpTabDescriptor[] = [
  { id: 'overview', label: 'Help Home', shortLabel: 'Home', path: '/help' },
  { id: 'getting_started', label: 'Getting Started', shortLabel: 'Start', path: '/help?section=getting_started' },
  { id: 'module_guide', label: 'Module Guides', shortLabel: 'Guides', path: '/help?section=module_guide' },
  { id: 'tutorial', label: 'Tutorials & Workflows', shortLabel: 'Tutorials', path: '/help?section=tutorial' },
  { id: 'faq', label: 'FAQ & Troubleshooting', shortLabel: 'FAQ', path: '/help?section=faq' },
  { id: 'support', label: 'Support Centre', shortLabel: 'Support', path: '/help/support' },
  { id: 'about_product', label: 'About PrathamOne EduOS', shortLabel: 'Product', path: '/help/about-product' },
  { id: 'about_company', label: 'About SMRITI Systems', shortLabel: 'Company', path: '/help/about-company' },
  { id: 'version', label: 'Product & Version', shortLabel: 'Version', path: '/help/version' },
  { id: 'legal', label: 'Legal & Compliance', shortLabel: 'Legal', path: '/help/legal' },
  { id: 'system_info', label: 'System Information', shortLabel: 'System Info', path: '/help/system-info', adminOnly: true },
  { id: 'governance', label: 'Content Governance', shortLabel: 'Manage Help', path: '/help/governance', adminOnly: true },
]

export const SECTION_LABELS: Record<HelpSectionKey | string, string> = {
  getting_started: 'Getting Started',
  module_guide: 'Module User Guides',
  tutorial: 'Tutorials & Workflows',
  faq: 'FAQ & Troubleshooting',
  legal: 'Legal & Compliance',
  about_product: 'About PrathamOne EduOS',
  about_company: 'About SMRITI Systems',
  version: 'Product & Version Info',
  support: 'Support Centre',
}

export const HELP_ADMIN_ROLES = ['superadmin', 'sysadmin', 'super_admin', 'admin', 'principal']

export function isHelpAdminRole(role?: string | null): boolean {
  return HELP_ADMIN_ROLES.includes((role || '').toLowerCase())
}

export function getApprovalBadgeMeta(approvalStatus?: string, status?: string): {
  label: string
  tone: 'emerald' | 'amber' | 'slate'
} {
  if (approvalStatus === 'pending_approval' || status === 'pending_approval') {
    return { label: 'Management Approval Required', tone: 'amber' }
  }
  if (status === 'draft' || status === 'unpublished') {
    return { label: status === 'draft' ? 'Draft' : 'Unpublished', tone: 'slate' }
  }
  return { label: 'Published', tone: 'emerald' }
}
