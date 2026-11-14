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
 * @updated     2026-11-14
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

export const PRINT_FOOTER_BRANDING_TEXT = 'Created by' as const

const PRODUCT_BRAND_ASSET_ROOT = '/artwork/14112026'
const PRODUCT_LOGO_URL = `${PRODUCT_BRAND_ASSET_ROOT}/batch_g1-4_1080.png`
const PRODUCT_LOGO_SVG_URL = `${PRODUCT_BRAND_ASSET_ROOT}/batch_g1-4_1080.svg`
const PRODUCT_APP_ICON_URL = `${PRODUCT_BRAND_ASSET_ROOT}/batch_rect1-1-8-6_10802.png`
const PRODUCT_APP_ICON_SVG_URL = `${PRODUCT_BRAND_ASSET_ROOT}/batch_rect1-1-8-6_10802.svg`
const PRODUCT_APP_ICON_192_URL = PRODUCT_APP_ICON_URL

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
  buildNumber: '2026.11.14-REV-183-v1.100.0-FFCFFA6',
  releaseChannel: 'Release Candidate',
  releaseStatus: 'Minor Release Candidate',
  releaseDate: '2026-11-14',
  productArchitect: 'Jawahar R Mallah',
  environment: (typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE) || 'production',
  copyright: 'Copyright © 2026 SmritiSys. All rights reserved.',
  organization: 'SmritiSys',
  clientOrganization: 'Prashant Academy Coaching Institute',
  parentOrganization: {
    name: 'SmritiSys',
    shortName: 'SMRITISYS',
    website: 'https://smritisys.com',
    websiteDisplay: 'smritisys.com',
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
    primary: '#0B2D6B',       // PrathamOne Navy Blue (Official Artwork Brand)
    primaryHover: '#082354',  // Navy Hover State
    primaryLight: '#16428F',  // Navy Light Accent
    primaryDark: '#051535',   // Deepest Prussian Navy
    secondary: '#071C44',     // Prussian Blue Shell / Gradient Pair
    accent: '#F57C00',        // PrathamOne Saffron Orange (Official Artwork Accent)
    gold: '#FFA726',          // Warm Amber Gold
    success: '#10b981',       // Emerald-500
    prathamNavy: '#0B2D6B',   // PrathamOne Official Deep Navy (New Logo Specification)
    prathamOrange: '#F57C00', // PrathamOne Official Vibrant Orange (New Logo Specification)
    prathamGold: '#FFA726',   // PrathamOne Official Gold / Amber Accent
  },
  assets: {
    // Tenant Coaching Academy Logo (Default Prashant Academy Crest)
    academyLogoUrl: '/media/logo/prashant-academy-logo.svg' as string,
    academyLogoPngUrl: '/media/logo/prashant-academy-logo.png' as string,
    logoUrl: '/media/logo/prashant-academy-logo.svg' as string,
    logoDarkUrl: '/media/logo/prashant-academy-logo.svg' as string,
    faviconUrl: PRODUCT_APP_ICON_192_URL as string,
    faviconPngUrl: PRODUCT_APP_ICON_192_URL as string,
    faviconIcoUrl: '/favicon.ico' as string,
    icon192Url: PRODUCT_APP_ICON_192_URL as string,
    icon512Url: PRODUCT_APP_ICON_URL as string,
    appIconUrl: PRODUCT_APP_ICON_URL as string,
    appIcon192Url: PRODUCT_APP_ICON_192_URL as string,
    // Software Platform Direct Logo & Icon (frontend/public/logo)
    softwareLogoSvgUrl: PRODUCT_LOGO_SVG_URL as string,
    softwareLogoUrl: PRODUCT_LOGO_URL as string,
    softwareLogoPngUrl: PRODUCT_LOGO_URL as string,
    softwareIconSvgUrl: PRODUCT_APP_ICON_SVG_URL as string,
    softwareIconUrl: PRODUCT_APP_ICON_URL as string,
    softwareIconPngUrl: PRODUCT_APP_ICON_URL as string,
    // Official Circular Seal (Emblem Seal)
    sealMarkUrl: '/media/logo/prathamone-eduos-seal.png' as string,
    sealMarkTransparentUrl: '/media/logo/prathamone-eduos-seal-transparent.png' as string,
    // Parent Brand Master Logo
    masterLogoUrl: PRODUCT_LOGO_URL as string,
    masterLogoTransparentUrl: PRODUCT_LOGO_URL as string,
    masterLogoDarkUrl: PRODUCT_LOGO_URL as string,
    // Product Brand Primary Logo
    primaryLogoUrl: PRODUCT_LOGO_URL as string,
    primaryLogoTransparentUrl: PRODUCT_LOGO_URL as string,
    primaryLogoDarkUrl: PRODUCT_LOGO_URL as string,
    // Horizontal Lockup Logo
    horizontalLogoUrl: PRODUCT_LOGO_URL as string,
    horizontalLogoTransparentUrl: PRODUCT_LOGO_URL as string,
    horizontalLogoDarkUrl: PRODUCT_LOGO_URL as string,
    // Official Symbol Mark (New Square Emblem)
    symbolMarkUrl: PRODUCT_APP_ICON_URL as string,
    symbolMarkTransparentUrl: PRODUCT_APP_ICON_URL as string,
    symbolMarkDarkUrl: PRODUCT_APP_ICON_URL as string,
    // Legacy / Convenience aliases
    prathamOneLogoUrl: PRODUCT_LOGO_URL as string,
    prathamOneLogoTransparentUrl: PRODUCT_LOGO_URL as string,
    prathamOneMarkUrl: PRODUCT_APP_ICON_URL as string,
    prathamOneMarkTransparentUrl: PRODUCT_APP_ICON_URL as string,
    prathamOneAppIcon512: PRODUCT_APP_ICON_URL as string,
    prathamOneAppIcon192: PRODUCT_APP_ICON_192_URL as string,
  },
  support: {
    email: 'support@prathamone.com' as string,
    alternateEmail: 'prathamone@outlook.com' as string,
    academyEmail: 'info@example.com' as string,
    phone: '+91-22-12345678' as string,
    website: 'https://prathamone.com' as string,
    websiteDisplay: 'prathamone.com' as string,
    academyWebsite: 'https://example.com' as string,
    academyWebsiteDisplay: 'www.example.com' as string,
    address: '123 Education Lane, School District, Dadar West, Mumbai, Maharashtra 400028' as string,
  },
}

export interface LoginBackgroundConfig {
  mode: 'waves' | 'image' | 'svg_pattern' | 'video'
  imageUrl?: string
  fit: 'cover' | 'contain' | 'stretch' | 'tile'
  overlayOpacity: number // 0 to 100
  blur: number // 0 to 20 px
  pattern?: 'geometric' | 'dots' | 'blueprint' | 'lattice'
  videoUrl?: string
  videoType?: 'mp4' | 'youtube'
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
  background: LoginBackgroundConfig
}

const LEGACY_DEFAULT_FAVICON_URLS = new Set([
  '/favicon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
])

export function normalizeInstitutionFaviconUrl(faviconUrl?: string | null): string {
  return faviconUrl && !LEGACY_DEFAULT_FAVICON_URLS.has(faviconUrl)
    ? faviconUrl
    : BRANDING_CONFIG.assets.faviconUrl
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
      logoUrl: (activeInstitution?.logo_url && activeInstitution.logo_url !== '/logo.svg')
        ? activeInstitution.logo_url
        : (!activeInstitution || activeInstitution.id === 1)
          ? BRANDING_CONFIG.assets.academyLogoUrl
          : '',
      academyLogoUrl: (activeInstitution?.logo_url && activeInstitution.logo_url !== '/logo.svg')
        ? activeInstitution.logo_url
        : (!activeInstitution || activeInstitution.id === 1)
          ? BRANDING_CONFIG.assets.academyLogoUrl
          : '',
      faviconUrl: normalizeInstitutionFaviconUrl(activeInstitution?.favicon_url),
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
    background: (() => {
      let cachedBg: any = null
      if (!activeInstitution && typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('pratham_active_branding')
          if (raw) {
            const parsed = JSON.parse(raw)
            if (parsed?.background) cachedBg = parsed.background
          }
        } catch {}
      }
      return {
        mode: (activeInstitution as any)?.background?.mode || cachedBg?.mode || 'waves',
        imageUrl: (activeInstitution as any)?.background?.image_url || cachedBg?.imageUrl || '',
        fit: (activeInstitution as any)?.background?.fit || cachedBg?.fit || 'cover',
        overlayOpacity: typeof (activeInstitution as any)?.background?.overlay_opacity === 'number'
          ? (activeInstitution as any).background.overlay_opacity
          : (typeof cachedBg?.overlayOpacity === 'number' ? cachedBg.overlayOpacity : 60),
        blur: typeof (activeInstitution as any)?.background?.blur === 'number'
          ? (activeInstitution as any).background.blur
          : (typeof cachedBg?.blur === 'number' ? cachedBg.blur : 4),
        pattern: (activeInstitution as any)?.background?.pattern || cachedBg?.pattern || 'geometric',
        videoUrl: (activeInstitution as any)?.background?.video_url || cachedBg?.videoUrl || '',
        videoType: (activeInstitution as any)?.background?.video_type || cachedBg?.videoType || 'mp4',
      }
    })(),
  }
}

export const FALLBACK_BRANDING = resolveBranding(undefined)

export const getTenantBrandingKey = (instId?: number | null): string => `pratham_branding_inst_${instId || 1}`
export const BRANDING_STORAGE_KEY = 'pratham_active_branding'

/**
 * Safely parses a hex color string into RGB integers.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = (hex || '').replace('#', '').trim()
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('')
  }
  if (clean.length !== 6) {
    return { r: 11, g: 45, b: 107 } // Fallback to Pratham Navy (#0B2D6B)
  }
  const num = parseInt(clean, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

/**
 * Adjusts hex color brightness by a percentage (-100 to 100).
 */
export function adjustBrightness(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex)
  const factor = percent / 100
  const clamp = (val: number) => Math.min(255, Math.max(0, Math.round(val)))

  let newR: number, newG: number, newB: number
  if (percent > 0) {
    // Lighten towards white
    newR = clamp(r + (255 - r) * factor)
    newG = clamp(g + (255 - g) * factor)
    newB = clamp(b + (255 - b) * factor)
  } else {
    // Darken towards black
    newR = clamp(r * (1 + factor))
    newG = clamp(g * (1 + factor))
    newB = clamp(b * (1 + factor))
  }

  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`
}

/**
 * Returns an RGBA string with the given alpha opacity.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Centrally apply the resolved branding theme to the DOM, CSS custom properties, and HTML meta tags.
 */
export function applyGlobalBrandTheme(
  colors: { primary: string; secondary?: string; accent?: string },
  logoUrl?: string
): void {
  if (typeof document === 'undefined') return
  try {
    const root = document.documentElement
    const primary = colors.primary || '#0B2D6B'
    const secondary = colors.secondary || '#071C44'
    const accent = colors.accent || '#F57C00'

    const pRgb = hexToRgb(primary)
    const sRgb = hexToRgb(secondary)
    const aRgb = hexToRgb(accent)

    const primaryHover = adjustBrightness(primary, -12)
    const primaryLight = adjustBrightness(primary, 35)
    const primaryDark = adjustBrightness(primary, -25)
    const primary50 = hexToRgba(primary, 0.06)
    const primary100 = hexToRgba(primary, 0.12)
    const primary200 = hexToRgba(primary, 0.22)
    const primary300 = adjustBrightness(primary, 62)
    const primary400 = adjustBrightness(primary, 46)
    const primaryShadow = hexToRgba(primary, 0.28)

    // Standard CSS Custom Properties
    root.style.setProperty('--brand-primary', primary)
    root.style.setProperty('--brand-primary-hover', primaryHover)
    root.style.setProperty('--brand-primary-light', primaryLight)
    root.style.setProperty('--brand-primary-dark', primaryDark)
    root.style.setProperty('--brand-primary-50', primary50)
    root.style.setProperty('--brand-primary-100', primary100)
    root.style.setProperty('--brand-primary-200', primary200)
    root.style.setProperty('--brand-primary-300', primary300)
    root.style.setProperty('--brand-primary-400', primary400)
    root.style.setProperty('--brand-primary-shadow', primaryShadow)
    root.style.setProperty('--brand-primary-rgb', `${pRgb.r}, ${pRgb.g}, ${pRgb.b}`)

    root.style.setProperty('--brand-secondary', secondary)
    root.style.setProperty('--brand-secondary-hover', adjustBrightness(secondary, -12))
    root.style.setProperty('--brand-secondary-light', adjustBrightness(secondary, 20))
    root.style.setProperty('--brand-secondary-rgb', `${sRgb.r}, ${sRgb.g}, ${sRgb.b}`)

    root.style.setProperty('--brand-accent', accent)
    root.style.setProperty('--brand-accent-rgb', `${aRgb.r}, ${aRgb.g}, ${aRgb.b}`)

    root.style.setProperty('--brand-gradient', `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`)

    // Backwards-compatible legacy tokens
    root.style.setProperty('--color-primary', primary)
    root.style.setProperty('--color-secondary', secondary)
    root.style.setProperty('--color-accent', accent)

    // Update browser theme-color meta tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', primary)
    }

    // Update favicon if provided
    if (logoUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']")
      if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        document.getElementsByTagName('head')[0].appendChild(link)
      }
      const extension = logoUrl.split(/[?#]/, 1)[0].split('.').pop()?.toLowerCase()
      const iconMimeType =
        extension === 'svg'
          ? 'image/svg+xml'
          : extension === 'ico'
            ? 'image/vnd.microsoft.icon'
            : extension === 'png'
              ? 'image/png'
              : undefined
      if (iconMimeType) link.type = iconMimeType
      if (link.href !== logoUrl) {
        link.href = logoUrl
      }
    }
  } catch (err) {
    console.warn('[BrandingEngine] Failed to apply global theme variables:', err)
  }
}

// Immediate synchronous execution on module load for instant bootstrap
if (typeof window !== 'undefined') {
  try {
    let instId = 1
    const authRaw = localStorage.getItem('prashant-auth')
    if (authRaw) {
      try {
        const auth = JSON.parse(authRaw)
        if (auth?.state?.selectedInstitutionId) {
          instId = auth.state.selectedInstitutionId
        }
      } catch {}
    }
    const cached = localStorage.getItem(getTenantBrandingKey(instId)) || localStorage.getItem(BRANDING_STORAGE_KEY)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (parsed?.colors?.primary) {
        applyGlobalBrandTheme(parsed.colors, parsed.assets?.faviconUrl)
      }
    }
  } catch {}
}

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
        const tenantKey = getTenantBrandingKey(activeInstitution.id || 1)
        localStorage.setItem(tenantKey, JSON.stringify(res))
        localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(res))
      } catch {}
    }
    return res
  }, [activeInstitution])

  // Reactively apply dynamic theme CSS variables & Favicon link to DOM
  useMemo(() => {
    applyGlobalBrandTheme(resolved.colors, resolved.assets.faviconUrl)
  }, [resolved.colors.primary, resolved.colors.secondary, resolved.colors.accent, resolved.assets.faviconUrl])

  return resolved
}
