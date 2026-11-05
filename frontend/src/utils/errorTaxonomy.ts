/**
 * @file        errorTaxonomy.ts
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
 * @description Centralized error classification, user-friendly messaging, reference ID generation, and diagnostic logging.
 */

import { BRANDING_CONFIG } from '../config/branding'

export type ErrorCategory =
  | 'MODULE_LOAD_FAILURE'
  | 'INTERNET_DISCONNECTED'
  | 'SERVER_UNAVAILABLE'
  | 'SESSION_EXPIRED'
  | 'DATA_LOAD_FAILURE'
  | 'APPLICATION_UPDATE_REQUIRED'
  | 'UNKNOWN_ERROR'

export type RecoveryAction =
  | 'try_again'
  | 'refresh_page'
  | 'reload_app'
  | 'login_again'
  | 'go_dashboard'
  | 'contact_support'

export interface UserFacingErrorSpec {
  category: ErrorCategory
  title: string
  message: string
  primaryAction: RecoveryAction
  secondaryActions: RecoveryAction[]
  iconType: 'network' | 'server' | 'session' | 'module' | 'data' | 'update' | 'general'
}

/**
 * Authoritative user-facing error messages and actions specification.
 * Strictly adheres to non-technical language and prevents raw stack trace leakage.
 */
export const USER_ERROR_SPECS: Record<ErrorCategory, UserFacingErrorSpec> = {
  MODULE_LOAD_FAILURE: {
    category: 'MODULE_LOAD_FAILURE',
    title: "Couldn't Open Section",
    message: "We couldn't open this section. Please try again.",
    primaryAction: 'reload_app',
    secondaryActions: ['try_again', 'go_dashboard', 'contact_support'],
    iconType: 'module',
  },
  INTERNET_DISCONNECTED: {
    category: 'INTERNET_DISCONNECTED',
    title: 'Internet Disconnected',
    message: 'Internet connection unavailable. Please check your connection.',
    primaryAction: 'try_again',
    secondaryActions: ['refresh_page', 'contact_support'],
    iconType: 'network',
  },
  SERVER_UNAVAILABLE: {
    category: 'SERVER_UNAVAILABLE',
    title: 'Server Unavailable',
    message: 'The server is temporarily unavailable. Please try again shortly.',
    primaryAction: 'try_again',
    secondaryActions: ['refresh_page', 'go_dashboard', 'contact_support'],
    iconType: 'server',
  },
  SESSION_EXPIRED: {
    category: 'SESSION_EXPIRED',
    title: 'Session Expired',
    message: 'Your session has expired. Please log in again.',
    primaryAction: 'login_again',
    secondaryActions: ['go_dashboard'],
    iconType: 'session',
  },
  DATA_LOAD_FAILURE: {
    category: 'DATA_LOAD_FAILURE',
    title: 'Unable to Load Data',
    message: "We couldn't load your data. Please try again.",
    primaryAction: 'try_again',
    secondaryActions: ['refresh_page', 'go_dashboard', 'contact_support'],
    iconType: 'data',
  },
  APPLICATION_UPDATE_REQUIRED: {
    category: 'APPLICATION_UPDATE_REQUIRED',
    title: 'Application Update Available',
    message: 'A new version is available. Please refresh the application.',
    primaryAction: 'reload_app',
    secondaryActions: ['try_again', 'contact_support'],
    iconType: 'update',
  },
  UNKNOWN_ERROR: {
    category: 'UNKNOWN_ERROR',
    title: 'Something Went Wrong',
    message: 'Something went wrong. Please try again or contact support.',
    primaryAction: 'try_again',
    secondaryActions: ['refresh_page', 'go_dashboard', 'contact_support'],
    iconType: 'general',
  },
}

/**
 * Generates an enterprise-standard, user-friendly error reference identifier.
 * Format: ERR-YYYYMMDD-XXXX (e.g. ERR-20261105-9B2F)
 */
export function generateErrorReferenceId(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `ERR-${yyyy}${mm}${dd}-${randomSuffix}`
}

/**
 * Pattern-based classification mapping arbitrary runtime or API errors to an ErrorCategory.
 */
export function classifyError(error: unknown): ErrorCategory {
  if (!error) return 'UNKNOWN_ERROR'

  // Explicit category attached
  if (typeof error === 'object' && error !== null && 'category' in error) {
    const cat = (error as any).category
    if (cat in USER_ERROR_SPECS) return cat as ErrorCategory
  }

  // 1. Check network connectivity status
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'INTERNET_DISCONNECTED'
  }

  const msg = error instanceof Error ? error.message : typeof error === 'string' ? error : String((error as any)?.message || '')
  const code = (error as any)?.code || ''
  const name = error instanceof Error ? error.name : ''
  const status = (error as any)?.response?.status

  // 2. Network disconnected patterns
  if (
    code === 'ERR_NETWORK' ||
    code === 'ERR_INTERNET_DISCONNECTED' ||
    /Network Error/i.test(msg) ||
    /Failed to fetch/i.test(msg) && (typeof navigator !== 'undefined' && !navigator.onLine)
  ) {
    return 'INTERNET_DISCONNECTED'
  }

  // 3. Dynamic import / chunk loading errors
  if (
    name === 'ChunkLoadError' ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /Loading chunk [\d\w]+ failed/i.test(msg) ||
    /dynamically imported module/i.test(msg)
  ) {
    return 'MODULE_LOAD_FAILURE'
  }

  // 4. HTTP Status classifications
  if (status) {
    if (status === 401) return 'SESSION_EXPIRED'
    if (status === 502 || status === 503 || status === 504) return 'SERVER_UNAVAILABLE'
    if (status >= 400 && status < 500) return 'DATA_LOAD_FAILURE'
    if (status >= 500) return 'SERVER_UNAVAILABLE'
  }

  // 5. Server down / connection refused
  if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || /ECONNREFUSED/i.test(msg)) {
    return 'SERVER_UNAVAILABLE'
  }

  // 6. Explicit version update trigger
  if (/version mismatch|update required|new version available/i.test(msg)) {
    return 'APPLICATION_UPDATE_REQUIRED'
  }

  return 'UNKNOWN_ERROR'
}

/**
 * Sanitized diagnostic container ensuring zero sensitive PII or credentials leakage.
 */
export interface SafeDiagnostics {
  errorId: string
  category: ErrorCategory
  timestamp: string
  formattedTime: string
  app: string
  version: string
  buildNumber: string
  route: string
  onlineStatus: boolean
  userAgent: string
  apiEndpoint?: string
  httpStatus?: number
}

const SENSITIVE_KEY_PATTERNS = [
  /token/i,
  /password/i,
  /secret/i,
  /auth/i,
  /cookie/i,
  /key/i,
  /credential/i,
  /aadhaar/i,
  /card/i,
  /cvv/i,
]

/**
 * Filters any object or string to remove sensitive security tokens and personal credentials.
 */
export function sanitizeDiagnosticValue(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeDiagnosticValue)
  }

  const clean: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(k))
    if (isSensitive) {
      clean[k] = '[REDACTED]'
    } else if (typeof v === 'object' && v !== null) {
      clean[k] = sanitizeDiagnosticValue(v)
    } else {
      clean[k] = v
    }
  }
  return clean
}

/**
 * Builds safe diagnostic payload for error reporting and user copy actions.
 */
export function createSafeDiagnostics(
  errorId: string,
  category: ErrorCategory,
  extra?: {
    route?: string
    apiEndpoint?: string
    httpStatus?: number
  }
): SafeDiagnostics {
  const now = new Date()
  const route = extra?.route || (typeof window !== 'undefined' ? window.location.pathname : '/')

  return {
    errorId,
    category,
    timestamp: now.toISOString(),
    formattedTime: now.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
    app: BRANDING_CONFIG.appName,
    version: BRANDING_CONFIG.versionDisplay,
    buildNumber: BRANDING_CONFIG.buildNumber,
    route,
    onlineStatus: typeof navigator !== 'undefined' ? navigator.onLine : true,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown Client',
    apiEndpoint: extra?.apiEndpoint ? String(sanitizeDiagnosticValue(extra.apiEndpoint)) : undefined,
    httpStatus: extra?.httpStatus,
  }
}

/**
 * Builds the official mailto: support URL with diagnostic information.
 */
export function buildSupportMailtoUrl(diagnostics: SafeDiagnostics): string {
  const primaryEmail = BRANDING_CONFIG.salesSupport.email || 'support@prathamone.com'
  const altEmail = BRANDING_CONFIG.salesSupport.alternateEmail || 'prathamone@outlook.com'
  const subject = encodeURIComponent(
    `[Support Request] ${diagnostics.app} Error - ${diagnostics.errorId}`
  )

  const bodyContent = [
    `Dear PrathamOne Support Team,`,
    ``,
    `I encountered an error while using ${diagnostics.app}.`,
    ``,
    `--- ERROR DIAGNOSTICS ---`,
    `Reference ID : ${diagnostics.errorId}`,
    `Application  : ${diagnostics.app}`,
    `Version      : ${diagnostics.version} (${diagnostics.buildNumber})`,
    `Category     : ${diagnostics.category}`,
    `Date & Time  : ${diagnostics.formattedTime}`,
    `Route / Page : ${diagnostics.route}`,
    `Online Status: ${diagnostics.onlineStatus ? 'Online' : 'Offline'}`,
    diagnostics.httpStatus ? `HTTP Status  : ${diagnostics.httpStatus}` : null,
    diagnostics.apiEndpoint ? `API Endpoint : ${diagnostics.apiEndpoint}` : null,
    `-------------------------`,
    ``,
    `What I was doing:`,
    `[Please describe what you were doing when the issue occurred]`,
    ``,
    `Support Contacts:`,
    `Primary Email  : ${primaryEmail}`,
    `Alternate Email: ${altEmail}`,
    `Support Hotline: ${BRANDING_CONFIG.salesSupport.displayPhones}`,
  ]
    .filter(Boolean)
    .join('\n')

  const body = encodeURIComponent(bodyContent)
  return `mailto:${primaryEmail}?subject=${subject}&body=${body}`
}

/**
 * Reload Loop Prevention Manager
 * Limits reloads to max 2 in a 30-second rolling window.
 */
const RELOAD_GUARD_STORAGE_KEY = 'pratham_reload_guard'
const RELOAD_WINDOW_MS = 30_000
const MAX_RELOADS_PER_WINDOW = 2

interface ReloadGuardState {
  count: number
  firstReloadAt: number
}

export function canSafelyReload(): boolean {
  if (typeof window === 'undefined' || !window.sessionStorage) return true

  try {
    const raw = sessionStorage.getItem(RELOAD_GUARD_STORAGE_KEY)
    if (!raw) return true

    const state: ReloadGuardState = JSON.parse(raw)
    const now = Date.now()

    if (now - state.firstReloadAt > RELOAD_WINDOW_MS) {
      sessionStorage.removeItem(RELOAD_GUARD_STORAGE_KEY)
      return true
    }

    return state.count < MAX_RELOADS_PER_WINDOW
  } catch {
    return true
  }
}

export function recordReloadAttempt(): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return

  try {
    const now = Date.now()
    const raw = sessionStorage.getItem(RELOAD_GUARD_STORAGE_KEY)
    let state: ReloadGuardState = raw ? JSON.parse(raw) : { count: 0, firstReloadAt: now }

    if (now - state.firstReloadAt > RELOAD_WINDOW_MS) {
      state = { count: 1, firstReloadAt: now }
    } else {
      state.count += 1
    }

    sessionStorage.setItem(RELOAD_GUARD_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage quota errors
  }
}

export function resetReloadGuard(): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return
  try {
    sessionStorage.removeItem(RELOAD_GUARD_STORAGE_KEY)
  } catch {
    // Ignore storage quota errors
  }
}

export function performSafeReload(forceCacheBust = false): boolean {
  if (!canSafelyReload()) {
    console.warn('[PrathamOne Error] Reload loop prevention engaged. Suppressing automatic reload.')
    return false
  }

  recordReloadAttempt()

  if (typeof window !== 'undefined') {
    if (forceCacheBust) {
      const url = new URL(window.location.href)
      url.searchParams.set('_v', Date.now().toString())
      window.location.href = url.toString()
    } else {
      window.location.reload()
    }
  }

  return true
}

/**
 * Structured developer console logger connecting error reference IDs with stack traces.
 */
export function logTechnicalError(details: {
  errorId: string
  error: unknown
  category: ErrorCategory
  route?: string
  componentStack?: string
  apiEndpoint?: string
  status?: number
}): void {
  const { errorId, error, category, route, componentStack, apiEndpoint, status } = details
  const timestamp = new Date().toISOString()
  const version = `${BRANDING_CONFIG.appName} ${BRANDING_CONFIG.versionDisplay} (${BRANDING_CONFIG.buildNumber})`

  try {
    console.groupCollapsed(
      `%c[PrathamOne Error] ${errorId} • ${category}`,
      'color: #dc2626; font-weight: bold; font-size: 11px;'
    )
    console.info(`Error Reference ID : ${errorId}`)
    console.info(`Timestamp          : ${timestamp}`)
    console.info(`Application        : ${version}`)
    console.info(`Category           : ${category}`)
    if (route) console.info(`Route              : ${route}`)
    if (apiEndpoint) console.info(`Endpoint           : ${apiEndpoint}`)
    if (status) console.info(`HTTP Status        : ${status}`)
    console.error(`Original Exception :`, error)
    if (error instanceof Error && error.stack) {
      console.error(`Stack Trace        :\n${error.stack}`)
    }
    if (componentStack) {
      console.error(`Component Stack    :\n${componentStack}`)
    }
    console.groupEnd()
  } catch {
    // Fallback simple log if console grouping fails
    console.error(`[PrathamOne Error] ${errorId}:`, error)
  }
}

