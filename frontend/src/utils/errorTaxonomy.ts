/**
 * @file        errorTaxonomy.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.utils
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-05
 * @updated     2026-11-26
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
  /aadhar/i,
  /card/i,
  /cvv/i,
]

/**
 * Scrubs JWTs, Bearer headers, query credentials, and 12-digit Aadhaar numbers from free-form text (DPDP compliance).
 */
export function redactSensitiveText(text: string): string {
  if (!text) return ''
  return text
    .replace(/\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]')
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]+)?/g, '[REDACTED_JWT]')
    .replace(/([?&](?:token|access_token|refresh_token|password|secret|api_key|key|aadhaar|aadhar)=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(/\b(password|passwd|pwd|secret|token|aadhaar|aadhar)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[REDACTED_UID]')
}

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
    apiEndpoint: extra?.apiEndpoint
      ? redactSensitiveText(String(sanitizeDiagnosticValue(extra.apiEndpoint)))
      : undefined,
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

export type FrontendErrorSource =
  | 'api'
  | 'error_boundary'
  | 'window_error'
  | 'unhandledrejection'

export interface TechnicalErrorDetails {
  errorId: string
  error: unknown
  category: ErrorCategory
  route?: string
  componentStack?: string
  apiEndpoint?: string
  status?: number
  source?: FrontendErrorSource
}

function shouldForwardToDesktopHost(details: TechnicalErrorDetails): boolean {
  if (details.source === 'window_error' || details.source === 'unhandledrejection' || details.source === 'error_boundary') {
    return true
  }
  if (details.componentStack) {
    return true
  }
  if (details.status !== undefined && (details.status >= 500 || details.status === 423)) {
    return true
  }
  return details.category === 'SERVER_UNAVAILABLE'
}

const _recentForwarded = new Map<string, number>()

/**
 * Forwards sanitized diagnostics via WebView2 postMessage so desktop EXE collects frontend errors
 * cleanly in <dataRoot>\logs\frontend_errors.log without exposing PII or tokens.
 */
export function forwardDiagnosticsToDesktopHost(details: TechnicalErrorDetails): boolean {
  if (typeof window === 'undefined') return false
  const webview = (window as any)?.chrome?.webview
  if (!webview || typeof webview.postMessage !== 'function') {
    return false
  }
  if (!shouldForwardToDesktopHost(details)) {
    return false
  }

  try {
    const diagnostics = createSafeDiagnostics(details.errorId, details.category, {
      route: details.route,
      apiEndpoint: details.apiEndpoint,
      httpStatus: details.status,
    })
    const errObj = details.error as any
    const rawMsg =
      errObj instanceof Error
        ? errObj.message
        : typeof errObj === 'string'
          ? errObj
          : String(errObj?.response?.data?.detail || errObj?.message || 'Unexpected frontend error')
    const source: FrontendErrorSource =
      details.source || (details.componentStack ? 'error_boundary' : 'api')

    const summary = redactSensitiveText(formatApiErrorDetail(rawMsg, 'Error recorded')).slice(0, 500)
    const dedupKey = `${source}|${diagnostics.httpStatus ?? ''}|${summary}`
    const now = Date.now()
    const prevAt = _recentForwarded.get(dedupKey)
    if (prevAt !== undefined && now - prevAt < 500) {
      return false
    }
    _recentForwarded.set(dedupKey, now)
    if (_recentForwarded.size > 50) {
      const oldestKey = _recentForwarded.keys().next().value
      if (oldestKey !== undefined) _recentForwarded.delete(oldestKey)
    }

    const cleanPayload = sanitizeDiagnosticValue({
      kind: 'PRATHAMONE_FRONTEND_ERROR',
      source,
      errorId: diagnostics.errorId,
      category: diagnostics.category,
      timestamp: diagnostics.timestamp,
      app: diagnostics.app,
      version: diagnostics.version,
      route: redactSensitiveText(diagnostics.route),
      httpStatus: diagnostics.httpStatus,
      apiEndpoint: diagnostics.apiEndpoint,
      errorName: errObj instanceof Error ? errObj.name : undefined,
      summary,
      componentStack: details.componentStack
        ? redactSensitiveText(details.componentStack).slice(0, 800)
        : undefined,
    })
    webview.postMessage(cleanPayload)
    return true
  } catch {
    return false
  }
}

let _globalBridgeCleanup: (() => void) | null = null

/**
 * Idempotently binds global window.onerror and unhandledrejection handlers so unhandled JS/React
 * errors are sanitized via createSafeDiagnostics and forwarded to the desktop WebView2 host.
 */
export function installGlobalErrorBridge(): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }
  if (_globalBridgeCleanup) {
    return _globalBridgeCleanup
  }

  const handleWindowError = (event: ErrorEvent) => {
    const err = event.error instanceof Error ? event.error : new Error(event.message || 'Uncaught runtime error')
    logTechnicalError({
      errorId: generateErrorReferenceId(),
      error: err,
      category: classifyError(err),
      route: window.location.pathname,
      source: 'window_error',
    })
  }

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason
    logTechnicalError({
      errorId: generateErrorReferenceId(),
      error: reason ?? new Error('Unhandled promise rejection'),
      category: classifyError(reason),
      route: window.location.pathname,
      source: 'unhandledrejection',
    })
  }

  window.addEventListener('error', handleWindowError)
  window.addEventListener('unhandledrejection', handleUnhandledRejection)

  _globalBridgeCleanup = () => {
    window.removeEventListener('error', handleWindowError)
    window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    _globalBridgeCleanup = null
  }
  return _globalBridgeCleanup
}

/**
 * Structured developer console logger connecting error reference IDs with stack traces.
 */
export function logTechnicalError(details: TechnicalErrorDetails): void {
  forwardDiagnosticsToDesktopHost(details)

  if (!(import.meta as any).env?.DEV) {
    return
  }
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

/**
 * Formats an arbitrary FastAPI/API `detail` payload (string, Pydantic 422 validation
 * error array, or structured object) into a safe human-readable string so React UI
 * banners and toast notifications never receive raw objects or arrays (#31 crash).
 */
export function formatApiErrorDetail(
  detail: unknown,
  fallback = 'An unexpected error occurred.'
): string {
  if (detail == null) return fallback
  if (typeof detail === 'string') {
    const trimmed = detail.trim()
    return trimmed || fallback
  }
  if (typeof detail === 'number' || typeof detail === 'boolean') {
    return String(detail)
  }
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (typeof item === 'string') return item.trim()
        if (item && typeof item === 'object') {
          const rec = item as Record<string, unknown>
          const rawMsg =
            typeof rec.msg === 'string'
              ? rec.msg
              : typeof rec.message === 'string'
                ? rec.message
                : typeof rec.detail === 'string'
                  ? rec.detail
                  : ''
          const loc = Array.isArray(rec.loc)
            ? rec.loc
                .filter((seg) => !['body', 'query', 'path'].includes(String(seg)))
                .map((seg) => String(seg).replace(/_/g, ' '))
            : []
          const field = loc.length > 0 ? loc[loc.length - 1] : ''
          if (field && rawMsg) return `${field}: ${rawMsg}`
          if (rawMsg) return rawMsg
        }
        return ''
      })
      .filter(Boolean)
    return parts.length > 0 ? parts.join('; ') : fallback
  }
  if (typeof detail === 'object') {
    const rec = detail as Record<string, unknown>
    for (const key of ['detail', 'message', 'msg', 'error']) {
      if (rec[key] !== undefined && rec[key] !== detail) {
        const nested = formatApiErrorDetail(rec[key], '')
        if (nested) return nested
      }
    }
  }
  return fallback
}

/**
 * Extracts a safe, user-friendly error message from any Axios/API/runtime error,
 * translating HTTP 423 (Evaluation Mode / License Locked) and FastAPI 422 arrays cleanly.
 */
export function extractApiErrorMessage(
  error: unknown,
  fallback = 'Request failed. Please try again.'
): string {
  if (!error) return fallback
  if (typeof error === 'string') return error.trim() || fallback

  const errObj = error as {
    response?: { status?: number; data?: { detail?: unknown; message?: unknown; error?: unknown } }
    userFriendlyMessage?: unknown
    message?: unknown
  }
  const status = errObj?.response?.status
  const rawDetail =
    errObj?.response?.data?.detail ??
    errObj?.response?.data?.message ??
    errObj?.response?.data?.error

  if (rawDetail !== undefined && rawDetail !== null) {
    const formatted = formatApiErrorDetail(rawDetail, '')
    if (formatted) return formatted
  }

  if (status === 423) {
    return 'Evaluation Mode is active. Activate your commercial license or switch to Training Mode to make changes.'
  }

  if (typeof errObj?.userFriendlyMessage === 'string' && errObj.userFriendlyMessage.trim()) {
    return errObj.userFriendlyMessage.trim()
  }

  if (typeof errObj?.message === 'string' && errObj.message.trim()) {
    if (status === 423 && /^Request failed with status code 423/i.test(errObj.message)) {
      return 'Evaluation Mode is active. Activate your commercial license or switch to Training Mode to make changes.'
    }
    if (!/^Request failed with status code \d+$/i.test(errObj.message)) {
      return errObj.message.trim()
    }
  }

  return fallback
}


