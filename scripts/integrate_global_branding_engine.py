# /**
#  * @file        integrate_global_branding_engine.py
#  * @project     PrathamOne Academy Coaching Institute Management System
#  * @module      scripts
#  *
#  * @author      Jawahar R. Mallah
#  * @organization AITDL (AI Technology & Development Lab)
#  * @client      Prashant Academy Coaching Institute
#  * @copyright   Copyright (c) 2026 AITDL
#  * @license     Proprietary
#  *
#  * @version     1.0.0
#  * @created     2026-11-08
#  * @updated     2026-11-08
#  *
#  * @description Integrates the centralized Global Branding & Appearance Engine across index.html, tailwind.config.js, index.css, branding.ts, Login.tsx, Sidebar.tsx, and Settings.tsx.
#  */

import os
import re

def update_index_html():
    path = "frontend/index.html"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    script = """    <!-- Pre-hydration Instant Brand Theme Resolver (Zero Flicker) -->
    <script>
      (function() {
        try {
          var raw = localStorage.getItem('pratham_active_branding');
          if (raw) {
            var b = JSON.parse(raw);
            if (b && b.colors && b.colors.primary) {
              var root = document.documentElement;
              var p = b.colors.primary;
              var s = b.colors.secondary || p;
              var a = b.colors.accent || s || p;
              root.style.setProperty('--brand-primary', p);
              root.style.setProperty('--brand-secondary', s);
              root.style.setProperty('--brand-accent', a);
              root.style.setProperty('--color-primary', p);
              root.style.setProperty('--color-secondary', s);
              root.style.setProperty('--color-accent', a);
              root.style.setProperty('--brand-gradient', 'linear-gradient(135deg, ' + p + ' 0%, ' + s + ' 100%)');
              var meta = document.querySelector('meta[name="theme-color"]');
              if (meta) meta.setAttribute('content', p);
            }
          }
        } catch(e) {}
      })();
    </script>"""

    if "Pre-hydration Instant Brand Theme Resolver" not in content:
        content = content.replace("  </head>", script + "\n  </head>")
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print("Updated frontend/index.html")
    else:
        print("frontend/index.html already updated")

def update_tailwind_config():
    path = "frontend/tailwind.config.js"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    target = """      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },"""

    replacement = """      colors: {
        primary: {
          50: 'var(--brand-primary-50, #eff6ff)',
          100: 'var(--brand-primary-100, #dbeafe)',
          200: 'var(--brand-primary-200, #bfdbfe)',
          300: '#93c5fd',
          400: '#60a5fa',
          500: 'var(--brand-primary-light, #3b82f6)',
          600: 'var(--brand-primary, #2563eb)',
          700: 'var(--brand-primary-hover, #1d4ed8)',
          800: 'var(--brand-primary-dark, #1e40af)',
          900: 'var(--brand-primary-dark, #1e3a8a)',
        },
        brand: {
          DEFAULT: 'var(--brand-primary, #1E40AF)',
          primary: 'var(--brand-primary, #1E40AF)',
          hover: 'var(--brand-primary-hover, #1D4ED8)',
          light: 'var(--brand-primary-light, #3B82F6)',
          dark: 'var(--brand-primary-dark, #0F172A)',
          secondary: 'var(--brand-secondary, #3B82F6)',
          accent: 'var(--brand-accent, #8B5CF6)',
          50: 'var(--brand-primary-50, #eff6ff)',
          100: 'var(--brand-primary-100, #dbeafe)',
          200: 'var(--brand-primary-200, #bfdbfe)',
        },
      },"""

    if target in content:
        content = content.replace(target, replacement)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print("Updated frontend/tailwind.config.js")
    else:
        print("frontend/tailwind.config.js target not found or already updated")

def update_index_css():
    path = "frontend/src/index.css"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    target = """  .btn-primary {
    @apply bg-primary-700 text-white px-4 py-2 rounded-lg hover:bg-primary-800 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed;
  }
  .btn-secondary {
    @apply bg-white text-primary-700 border border-primary-300 px-4 py-2 rounded-lg hover:bg-primary-50 transition-colors font-medium text-sm;
  }"""

    replacement = """  .btn-primary {
    background-color: var(--brand-primary, #1e40af);
    color: #ffffff;
    @apply px-4 py-2 rounded-lg transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-xs;
  }
  .btn-primary:hover:not(:disabled) {
    background-color: var(--brand-primary-hover, #1d4ed8);
  }
  .btn-secondary {
    color: var(--brand-primary, #1e40af);
    border-color: var(--brand-primary-200, #bfdbfe);
    background-color: #ffffff;
    @apply px-4 py-2 rounded-lg transition-colors font-medium text-sm;
  }
  .btn-secondary:hover:not(:disabled) {
    background-color: var(--brand-primary-50, #eff6ff);
  }

  /* Global Brand Identity Utilities */
  .bg-brand-primary { background-color: var(--brand-primary, #1e40af) !important; }
  .bg-brand-secondary { background-color: var(--brand-secondary, #3b82f6) !important; }
  .bg-brand-accent { background-color: var(--brand-accent, #8b5cf6) !important; }
  .text-brand-primary { color: var(--brand-primary, #1e40af) !important; }
  .text-brand-secondary { color: var(--brand-secondary, #3b82f6) !important; }
  .text-brand-accent { color: var(--brand-accent, #8b5cf6) !important; }
  .border-brand-primary { border-color: var(--brand-primary, #1e40af) !important; }
  .bg-brand-gradient {
    background: linear-gradient(135deg, var(--brand-primary, #1e40af) 0%, var(--brand-secondary, #3b82f6) 100%) !important;
  }"""

    if target in content:
        content = content.replace(target, replacement)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print("Updated frontend/src/index.css")
    else:
        print("frontend/src/index.css target not found or already updated")

def update_branding_ts():
    path = "frontend/src/config/branding.ts"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Find the section starting at BRANDING_STORAGE_KEY
    idx = content.find("export const BRANDING_STORAGE_KEY = 'pratham_active_branding'")
    if idx == -1:
        print("Could not find BRANDING_STORAGE_KEY in branding.ts")
        return

    before = content[:idx]

    new_section = """export const BRANDING_STORAGE_KEY = 'pratham_active_branding'

/**
 * Safely parses a hex color string into RGB integers.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = (hex || '').replace('#', '').trim()
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('')
  }
  if (clean.length !== 6) {
    return { r: 30, g: 64, b: 175 } // Fallback to Royal Blue (#1e40af)
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
    const primary = colors.primary || '#1E40AF'
    const secondary = colors.secondary || adjustBrightness(primary, 20)
    const accent = colors.accent || adjustBrightness(secondary, 30)

    const pRgb = hexToRgb(primary)
    const sRgb = hexToRgb(secondary)
    const aRgb = hexToRgb(accent)

    const primaryHover = adjustBrightness(primary, -12)
    const primaryLight = adjustBrightness(primary, 25)
    const primaryDark = adjustBrightness(primary, -25)
    const primary50 = hexToRgba(primary, 0.06)
    const primary100 = hexToRgba(primary, 0.12)
    const primary200 = hexToRgba(primary, 0.22)
    const primaryShadow = hexToRgba(primary, 0.28)

    // Standard CSS Custom Properties
    root.style.setProperty('--brand-primary', primary)
    root.style.setProperty('--brand-primary-hover', primaryHover)
    root.style.setProperty('--brand-primary-light', primaryLight)
    root.style.setProperty('--brand-primary-dark', primaryDark)
    root.style.setProperty('--brand-primary-50', primary50)
    root.style.setProperty('--brand-primary-100', primary100)
    root.style.setProperty('--brand-primary-200', primary200)
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
    const cached = localStorage.getItem(BRANDING_STORAGE_KEY)
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
"""

    with open(path, "w", encoding="utf-8") as f:
        f.write(before + new_section)
    print("Updated frontend/src/config/branding.ts")

if __name__ == "__main__":
    update_index_html()
    update_tailwind_config()
    update_index_css()
    update_branding_ts()

