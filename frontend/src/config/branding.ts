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
 * @updated     2026-11-06
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

export const PRINT_SHARE_BRANDING = {
  text: 'PrathamOne EduOS · Coaching Institute Edition · prathamone.com',
  suiteName: 'PrathamOne EduOS — Coaching Institute Edition',
  domain: 'prathamone.com',
  url: 'https://prathamone.com',
} as const

/**
 * Static baseline branding tokens for PrathamOne Academy suite
 */
export const BRANDING_CONFIG = {
  appName: 'PrathamOne EduOS',
  printShareBranding: PRINT_SHARE_BRANDING,
  productName: 'PrathamOne EduOS — Education Operating System',
  shortName: 'PrathamOne',
  suiteName: 'PrathamOne EduOS',
  edition: 'Coaching Institute Edition',
  editionFull: 'PrathamOne EduOS — Coaching Institute Edition',
  defaultAcademyName: 'Prashant Academy',
  defaultAcademyCode: 'PA001',
  defaultBranchName: 'Jankalyan Nagar, Malad West',
  defaultBranchCode: 'MALAD-W',
  tagline: 'The Power of Enterprise Education. The Simplicity of WhatsApp.',
  motto: 'The Power of Enterprise Education. The Simplicity of WhatsApp.',
  monogram: 'PA' as string,
  version: pkg.version || '1.0.0',
  versionDisplay: `v${pkg.version || '1.0.0'}`,
  buildNumber: '2026.11.06-STABLE-v1.0.0',
  releaseChannel: 'Stable',
  releaseStatus: 'Production Candidate',
  releaseDate: '2026-11-06',
  productArchitect: 'Jawahar R Mallah',
  environment: (typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE) || 'production',
  copyright: 'Copyright © 2026 AITDL (AI Technology & Development Lab). All rights reserved.',
  organization: 'AITDL — AI Technology & Development Lab',
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
  printShareBranding: typeof PRINT_SHARE_BRANDING
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
  const tagline = activeInstitution?.tagline?.trim() || BRANDING_CONFIG.tagline
  const shortName = activeInstitution?.short_name?.trim()

  // Derive monogram: prefer explicit short_name if provided, otherwise compute from academyName
  let monogram = shortName || BRANDING_CONFIG.monogram
  if (!shortName && academyName) {
    const parts = academyName.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      monogram = (parts[0][0] + parts[1][0]).toUpperCase()
    } else if (parts.length === 1 && parts[0].length >= 2) {
      monogram = parts[0].slice(0, 2).toUpperCase()
    }
  }

  const primaryColor = activeInstitution?.primary_color || BRANDING_CONFIG.colors.primary
  const secondaryColor = activeInstitution?.secondary_color || BRANDING_CONFIG.colors.secondary
  const accentColor = activeInstitution?.accent_color || BRANDING_CONFIG.colors.accent

  const address = activeInstitution?.address
    ? `${activeInstitution.address}${activeInstitution.city ? `, ${activeInstitution.city}` : ''}${
        activeInstitution.state ? `, ${activeInstitution.state}` : ''
      }${activeInstitution.pincode ? ` - ${activeInstitution.pincode}` : ''}`
    : BRANDING_CONFIG.support.address

  return {
    appName: BRANDING_CONFIG.appName,
    productName: BRANDING_CONFIG.productName,
    shortName: shortName || BRANDING_CONFIG.shortName,
    suiteName: BRANDING_CONFIG.suiteName,
    edition: BRANDING_CONFIG.edition,
    editionFull: BRANDING_CONFIG.editionFull,
    academyName,
    academyCode,
    branchName: BRANDING_CONFIG.defaultBranchName,
    branchCode: BRANDING_CONFIG.defaultBranchCode,
    tagline,
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
    printShareBranding: BRANDING_CONFIG.printShareBranding,
    colors: {
      ...BRANDING_CONFIG.colors,
      primary: primaryColor,
      primaryHover: secondaryColor,
      secondary: secondaryColor,
      accent: accentColor,
    },
    assets: {
      ...BRANDING_CONFIG.assets,
      logoUrl: activeInstitution?.logo_url || BRANDING_CONFIG.assets.logoUrl,
      faviconUrl: activeInstitution?.favicon_url || BRANDING_CONFIG.assets.faviconUrl,
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

export const BRANDING_STORAGE_KEY = 'pratham_active_branding'

/**
 * React hook accessing reactive, institution-aware branding across UI components.
 * Safely operates with or without an ambient QueryClientProvider in the tree.
 */
export function useBranding(): ResolvedBranding {
  const { selectedInstitutionId, token } = useAuthStore()
  const activeClient = useContext(QueryClientContext)

  // 1. Authenticated query for tenant institutions
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

  // 2. Unauthenticated public branding query (for login/guest view)
  const { data: publicInst } = useQuery(
    {
      queryKey: ['public_branding'],
      queryFn: () => institutionsApi.getPublicBranding().then((r) => r.data).catch(() => null),
      enabled: !token && !(typeof window !== 'undefined' && (window as any).__VITEST__ || (import.meta as any).env?.MODE === 'test'),
      staleTime: 1000 * 60 * 10,
      retry: false,
    },
    activeClient ?? fallbackQueryClient
  )

  const activeInstitution = useMemo(() => {
    if (token) {
      return institutions.find((i) => i.id === selectedInstitutionId) ?? institutions[0]
    }
    return publicInst || null
  }, [institutions, selectedInstitutionId, token, publicInst])

  const resolved = useMemo(() => {
    const res = resolveBranding(activeInstitution)
    // Synchronize to localStorage for instantaneous load on reload
    if (typeof window !== 'undefined' && activeInstitution) {
      try {
        localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(res))
      } catch {}
    }
    return res
  }, [activeInstitution])

  // Reactively apply dynamic theme CSS variables & Favicon link to DOM
  useMemo(() => {
    if (typeof document === 'undefined') return
    try {
      const root = document.documentElement
      root.style.setProperty('--color-primary', resolved.colors.primary)
      root.style.setProperty('--color-secondary', resolved.colors.secondary)
      root.style.setProperty('--color-accent', resolved.colors.accent)

      // Favicon link update
      if (resolved.assets.faviconUrl) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']")
        if (!link) {
          link = document.createElement('link')
          link.rel = 'icon'
          document.getElementsByTagName('head')[0].appendChild(link)
        }
        if (link.href !== resolved.assets.faviconUrl) {
          link.href = resolved.assets.faviconUrl
        }
      }
    } catch {}
  }, [resolved.colors.primary, resolved.colors.secondary, resolved.colors.accent, resolved.assets.faviconUrl])

  return resolved
}
