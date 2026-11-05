/**
 * @file        branding.ts
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
 * @created     2026-11-05
 * @updated     2026-11-05
 *
 * @description Master branding configuration and dynamic identity resolver for PrathamOne Academy and tenant institutions.
 */

import { useContext, useMemo } from 'react'
import { QueryClientContext, useQuery, QueryClient } from '@tanstack/react-query'
import pkg from '../../package.json'
import { useAuthStore } from '../store/authStore'
import { institutionsApi } from '../api/endpoints'
import type { Institution } from '../types'

// Fallback query client allowing useBranding to operate safely inside isolated test harnesses
const fallbackQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

export interface OrganizationProduct {
  id: string
  name: string
  description: string
  website: string
  websiteDisplay: string
  isCurrent?: boolean
}

export interface ParentOrganization {
  name: string
  shortName: string
  website: string
  websiteDisplay: string
}

export interface SalesSupportInfo {
  phones: string[]
  displayPhones: string
  email: string
  alternateEmail: string
}

/**
 * Static baseline branding tokens for PrathamOne Academy suite
 */
export const BRANDING_CONFIG = {
  appName: 'PrathamOne Academy',
  productName: 'PrathamOne Academy Management System',
  shortName: 'PrathamOne',
  suiteName: 'PrathamOne Academic Suite',
  edition: 'Enterprise Edition',
  editionFull: 'Coaching Institute Management System – Enterprise Edition',
  defaultAcademyName: 'Prashant Academy',
  defaultAcademyCode: 'PA001',
  defaultBranchName: 'Jankalyan Nagar, Malad West',
  defaultBranchCode: 'MALAD-W',
  tagline: 'Coaching Institute',
  motto: 'Empowering Academic & Competitive Excellence',
  monogram: 'PA' as string,
  version: pkg.version || '6.99.1',
  versionDisplay: `v${pkg.version || '6.99.1'}`,
  buildNumber: '2026.11.05-PROD-REL',
  environment: (typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE) || 'production',
  copyright: 'Copyright © 2026 AITDL (AI Technology & Development Lab). All rights reserved.',
  organization: 'AITDL (AI Technology & Development Lab)',
  clientOrganization: 'Prashant Academy Coaching Institute',
  parentOrganization: {
    name: 'AITDL — AI Technology & Development Lab',
    shortName: 'AITDL',
    website: 'https://aitdl.com',
    websiteDisplay: 'aitdl.com',
  } as ParentOrganization,
  products: [
    {
      id: 'prathamone',
      name: 'PrathamOne',
      description: 'Education, Coaching Institute Management, ERP & AI Solutions',
      website: 'https://prathamone.com',
      websiteDisplay: 'prathamone.com',
      isCurrent: true,
    },
    {
      id: 'smritibooks',
      name: 'SmritiBooks',
      description: 'Accounting & Bookkeeping Software',
      website: 'https://smritibooks.com',
      websiteDisplay: 'smritibooks.com',
      isCurrent: false,
    },
    {
      id: 'smritisys',
      name: 'SmritiSys',
      description: 'E-commerce, Inventory & Warehouse Management',
      website: 'https://smritisys.com',
      websiteDisplay: 'smritisys.com',
      isCurrent: false,
    },
  ] as OrganizationProduct[],
  salesSupport: {
    phones: ['9323 023 007', '9324 117 007'],
    displayPhones: '9323 023 007 | 9324 117 007',
    email: 'support@prathamone.com',
    alternateEmail: 'prathamone@outlook.com',
  } as SalesSupportInfo,
  colors: {
    primary: '#1e40af',       // Deep Royal Blue
    primaryHover: '#1d4ed8',  // Blue-700
    primaryLight: '#3b82f6',  // Blue-500
    primaryDark: '#0f172a',   // Slate-900
    secondary: '#071739',     // Midnight Navy
    accent: '#0284c7',        // Cyan-600
    gold: '#f59e0b',          // Amber-500
    success: '#10b981',       // Emerald-500
  },
  assets: {
    logoUrl: '/logo.svg' as string,
    logoDarkUrl: '/logo.svg' as string,
    faviconUrl: '/favicon.svg' as string,
    icon192Url: '/icons/icon-192x192.png' as string,
    icon512Url: '/icons/icon-512x512.png' as string,
  },
  support: {
    email: 'support@prathamone.com' as string,
    alternateEmail: 'prathamone@outlook.com' as string,
    academyEmail: 'info@prashantacademy.edu.in' as string,
    phone: '+91-22-12345678' as string,
    website: 'https://prathamone.com' as string,
    websiteDisplay: 'prathamone.com' as string,
    academyWebsite: 'https://prashantacademy.edu.in' as string,
    academyWebsiteDisplay: 'www.prashantacademy.edu.in' as string,
    address: '123 Education Lane, School District, Dadar West, Mumbai, Maharashtra 400028' as string,
  },
}

export interface ResolvedBranding {
  appName: string
  productName: string
  shortName: string
  suiteName: string
  edition: string
  editionFull: string
  academyName: string
  academyCode: string
  branchName: string
  branchCode: string
  tagline: string
  motto: string
  monogram: string
  version: string
  versionDisplay: string
  buildNumber: string
  environment: string
  copyright: string
  organization: string
  clientOrganization: string
  parentOrganization: ParentOrganization
  products: OrganizationProduct[]
  salesSupport: SalesSupportInfo
  colors: typeof BRANDING_CONFIG.colors
  assets: typeof BRANDING_CONFIG.assets
  support: typeof BRANDING_CONFIG.support
  institutionAddress: string
  institutionPhone: string
  institutionEmail: string
  institutionWebsite: string
}

/**
 * Pure function resolving tenant-specific overrides merged with baseline branding.
 */
export function resolveBranding(activeInstitution?: Partial<Institution> | null): ResolvedBranding {
  const academyName = activeInstitution?.name?.trim() || BRANDING_CONFIG.defaultAcademyName
  const academyCode = activeInstitution?.code?.trim() || BRANDING_CONFIG.defaultAcademyCode

  // Derive monogram (first letter of first two words, or first two letters)
  let monogram = BRANDING_CONFIG.monogram
  if (academyName) {
    const parts = academyName.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      monogram = (parts[0][0] + parts[1][0]).toUpperCase()
    } else if (parts.length === 1 && parts[0].length >= 2) {
      monogram = parts[0].slice(0, 2).toUpperCase()
    }
  }

  const address = activeInstitution?.address
    ? `${activeInstitution.address}${activeInstitution.city ? `, ${activeInstitution.city}` : ''}${
        activeInstitution.state ? `, ${activeInstitution.state}` : ''
      }${activeInstitution.pincode ? ` - ${activeInstitution.pincode}` : ''}`
    : BRANDING_CONFIG.support.address

  return {
    appName: BRANDING_CONFIG.appName,
    productName: BRANDING_CONFIG.productName,
    shortName: BRANDING_CONFIG.shortName,
    suiteName: BRANDING_CONFIG.suiteName,
    edition: BRANDING_CONFIG.edition,
    editionFull: BRANDING_CONFIG.editionFull,
    academyName,
    academyCode,
    branchName: BRANDING_CONFIG.defaultBranchName,
    branchCode: BRANDING_CONFIG.defaultBranchCode,
    tagline: BRANDING_CONFIG.tagline,
    motto: BRANDING_CONFIG.motto,
    monogram,
    version: BRANDING_CONFIG.version,
    versionDisplay: `v${BRANDING_CONFIG.version}`,
    buildNumber: BRANDING_CONFIG.buildNumber,
    environment: BRANDING_CONFIG.environment,
    copyright: BRANDING_CONFIG.copyright,
    organization: BRANDING_CONFIG.organization,
    clientOrganization: BRANDING_CONFIG.clientOrganization,
    parentOrganization: BRANDING_CONFIG.parentOrganization,
    products: BRANDING_CONFIG.products,
    salesSupport: BRANDING_CONFIG.salesSupport,
    colors: BRANDING_CONFIG.colors,
    assets: {
      ...BRANDING_CONFIG.assets,
      logoUrl: (activeInstitution as any)?.logo_url || BRANDING_CONFIG.assets.logoUrl,
    },
    support: {
      ...BRANDING_CONFIG.support,
      academyEmail: activeInstitution?.email || BRANDING_CONFIG.support.academyEmail,
      phone: activeInstitution?.phone || BRANDING_CONFIG.support.phone,
      academyWebsite: activeInstitution?.website || BRANDING_CONFIG.support.academyWebsite,
      address,
    },
    institutionAddress: address,
    institutionPhone: activeInstitution?.phone || BRANDING_CONFIG.support.phone,
    institutionEmail: activeInstitution?.email || BRANDING_CONFIG.support.academyEmail,
    institutionWebsite: activeInstitution?.website || BRANDING_CONFIG.support.academyWebsite,
  }
}

export const FALLBACK_BRANDING = resolveBranding(undefined)

/**
 * React hook accessing reactive, institution-aware branding across UI components.
 * Safely operates with or without an ambient QueryClientProvider in the tree.
 */
export function useBranding(): ResolvedBranding {
  const { selectedInstitutionId, token } = useAuthStore()
  const activeClient = useContext(QueryClientContext)

  const { data: institutions = [] } = useQuery(
    {
      queryKey: ['institutions'],
      queryFn: () => institutionsApi.list().then((r) => r.data),
      enabled: !!token,
      staleTime: 1000 * 60 * 5,
      retry: false,
    },
    activeClient ?? fallbackQueryClient
  )

  const activeInstitution = useMemo(() => {
    return institutions.find((i) => i.id === selectedInstitutionId) ?? institutions[0]
  }, [institutions, selectedInstitutionId])

  return useMemo(() => resolveBranding(activeInstitution), [activeInstitution])
}
