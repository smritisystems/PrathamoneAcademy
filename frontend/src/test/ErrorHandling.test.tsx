/**
 * @file        ErrorHandling.test.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.test
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
 * @description Comprehensive test suite validating centralized error taxonomy, non-technical messaging, recovery actions, and reload loop prevention.
 */

import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import {
  classifyError,
  generateErrorReferenceId,
  USER_ERROR_SPECS,
  createSafeDiagnostics,
  buildSupportMailtoUrl,
  canSafelyReload,
  recordReloadAttempt,
  resetReloadGuard,
  performSafeReload,
  sanitizeDiagnosticValue,
} from '../utils/errorTaxonomy'
import { ErrorScreen } from '../components/ErrorScreen'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { OfflineBanner } from '../components/OfflineBanner'
import { BRANDING_CONFIG } from '../config/branding'

describe('Centralized Error Handling & Recovery Architecture', () => {
  beforeEach(() => {
    resetReloadGuard()
    vi.clearAllMocks()
  })

  afterEach(() => {
    resetReloadGuard()
  })

  describe('1. Non-Technical Friendly Error Taxonomy & Messages', () => {
    it('maps Module loading failure to non-technical guidance', () => {
      const err = new Error('Failed to fetch dynamically imported module: /assets/Dashboard-xyz.js')
      const category = classifyError(err)
      expect(category).toBe('MODULE_LOAD_FAILURE')
      expect(USER_ERROR_SPECS[category].message).toBe(
        "We couldn't open this section. Please try again."
      )
      expect(USER_ERROR_SPECS[category].primaryAction).toBe('reload_app')
    })

    it('maps Internet disconnection when navigator is offline or network error', () => {
      const err = new Error('Network Error')
      ;(err as any).code = 'ERR_NETWORK'
      const category = classifyError(err)
      expect(category).toBe('INTERNET_DISCONNECTED')
      expect(USER_ERROR_SPECS[category].message).toBe(
        'Internet connection unavailable. Please check your connection.'
      )
      expect(USER_ERROR_SPECS[category].primaryAction).toBe('try_again')
    })

    it('maps Server unavailable for 502, 503, 504 and connection refused errors', () => {
      const err503 = { response: { status: 503 } }
      expect(classifyError(err503)).toBe('SERVER_UNAVAILABLE')
      expect(USER_ERROR_SPECS.SERVER_UNAVAILABLE.message).toBe(
        'The server is temporarily unavailable. Please try again shortly.'
      )

      const errRefused = { code: 'ECONNREFUSED', message: 'connect ECONNREFUSED 127.0.0.1:8000' }
      expect(classifyError(errRefused)).toBe('SERVER_UNAVAILABLE')
    })

    it('maps Session expired for HTTP 401 unauthorized errors', () => {
      const err401 = { response: { status: 401, data: { detail: 'Token expired' } } }
      const category = classifyError(err401)
      expect(category).toBe('SESSION_EXPIRED')
      expect(USER_ERROR_SPECS[category].message).toBe(
        'Your session has expired. Please log in again.'
      )
      expect(USER_ERROR_SPECS[category].primaryAction).toBe('login_again')
    })

    it('maps Data loading failure for 400, 404, 422 API errors', () => {
      const err404 = { response: { status: 404 } }
      expect(classifyError(err404)).toBe('DATA_LOAD_FAILURE')
      expect(USER_ERROR_SPECS.DATA_LOAD_FAILURE.message).toBe(
        "We couldn't load your data. Please try again."
      )

      const err422 = { response: { status: 422 } }
      expect(classifyError(err422)).toBe('DATA_LOAD_FAILURE')
    })

    it('maps Application update required when version mismatch occurs', () => {
      const errVersion = new Error('Client application update required. Hash mismatch.')
      const category = classifyError(errVersion)
      expect(category).toBe('APPLICATION_UPDATE_REQUIRED')
      expect(USER_ERROR_SPECS[category].message).toBe(
        'A new version is available. Please refresh the application.'
      )
      expect(USER_ERROR_SPECS[category].primaryAction).toBe('reload_app')
    })

    it('maps Unknown / generic runtime errors to reassuring support message', () => {
      const genericErr = new TypeError('Cannot read properties of undefined (reading of map)')
      const category = classifyError(genericErr)
      expect(category).toBe('UNKNOWN_ERROR')
      expect(USER_ERROR_SPECS[category].message).toBe(
        'Something went wrong. Please try again or contact support.'
      )
      expect(USER_ERROR_SPECS[category].primaryAction).toBe('try_again')
    })
  })

  describe('2. Error Reference ID & Safe Diagnostics Sanitization', () => {
    it('generates unique error reference IDs conforming to enterprise format', () => {
      const id1 = generateErrorReferenceId()
      const id2 = generateErrorReferenceId()

      expect(id1).toMatch(/^ERR-\d{8}-[A-Z0-9]{4}$/)
      expect(id2).toMatch(/^ERR-\d{8}-[A-Z0-9]{4}$/)
      expect(id1).not.toBe(id2)
    })

    it('scrubs sensitive credentials, tokens, and passwords from diagnostics', () => {
      const sensitiveData = {
        username: 'staff_1',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sensitive_token_payload',
        password: 'SuperSecretPassword123!',
        auth_header: 'Bearer 12345',
        aadhaar_number: '1234 5678 9012',
        credit_card: '4111222233334444',
        nested: {
          sessionToken: 'xyz-secret',
          safeField: 'dashboard-analytics',
        },
      }

      const sanitized: any = sanitizeDiagnosticValue(sensitiveData)

      expect(sanitized.token).toBe('[REDACTED]')
      expect(sanitized.password).toBe('[REDACTED]')
      expect(sanitized.auth_header).toBe('[REDACTED]')
      expect(sanitized.aadhaar_number).toBe('[REDACTED]')
      expect(sanitized.credit_card).toBe('[REDACTED]')
      expect(sanitized.nested.sessionToken).toBe('[REDACTED]')
      expect(sanitized.nested.safeField).toBe('dashboard-analytics')
      expect(sanitized.username).toBe('staff_1')
    })

    it('builds pre-filled mailto support link with error reference and diagnostic details', () => {
      const errorId = 'ERR-20261105-TEST'
      const diagnostics = createSafeDiagnostics(errorId, 'MODULE_LOAD_FAILURE', {
        route: '/fees',
      })

      const mailto = buildSupportMailtoUrl(diagnostics)

      expect(mailto).toContain(`mailto:${BRANDING_CONFIG.salesSupport.email}`)
      expect(mailto).toContain(encodeURIComponent(`Error - ${errorId}`))
      expect(mailto).toContain(encodeURIComponent('MODULE_LOAD_FAILURE'))
      expect(mailto).toContain(encodeURIComponent(BRANDING_CONFIG.salesSupport.alternateEmail))
      expect(mailto).toContain(encodeURIComponent(BRANDING_CONFIG.appName))
    })
  })

  describe('3. Reload Loop Prevention', () => {
    it('permits initial reloads and blocks runaway reload loops when threshold is exceeded', () => {
      expect(canSafelyReload()).toBe(true)

      // First reload attempt
      recordReloadAttempt()
      expect(canSafelyReload()).toBe(true)

      // Second reload attempt
      recordReloadAttempt()
      // Now threshold (2 reloads in 30s) is reached: further reload attempts must be blocked
      expect(canSafelyReload()).toBe(false)

      // performSafeReload must decline and return false
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const allowed = performSafeReload()
      expect(allowed).toBe(false)
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Reload loop prevention engaged'))
      warnSpy.mockRestore()

      // Resetting the guard restores reload capability
      resetReloadGuard()
      expect(canSafelyReload()).toBe(true)
    })
  })

  describe('4. User-Facing ErrorScreen UI & Zero Raw Trace Leakage', () => {
    it('renders user-friendly message and suppresses internal technical stack traces', () => {
      const errorId = 'ERR-20261105-88AA'
      const diagnostics = createSafeDiagnostics(errorId, 'SERVER_UNAVAILABLE')

      render(
        <ErrorScreen
          category="SERVER_UNAVAILABLE"
          diagnostics={diagnostics}
        />
      )

      // Shows friendly title and guidance
      expect(screen.getByText('Server Unavailable')).toBeDefined()
      expect(
        screen.getByText('The server is temporarily unavailable. Please try again shortly.')
      ).toBeDefined()

      // Primary recovery button for server error must be "Try Again"
      expect(screen.getByRole('button', { name: /try again/i })).toBeDefined()

      // Reference ID and support contact info must be visible
      expect(screen.getByText(errorId)).toBeDefined()
      expect(screen.getByText(BRANDING_CONFIG.salesSupport.displayPhones)).toBeDefined()

      // Raw technical stack traces or database keywords must NOT appear in the DOM
      expect(screen.queryByText(/SQLAlchemy/i)).toBeNull()
      expect(screen.queryByText(/Traceback/i)).toBeNull()
      expect(screen.queryByText(/pg_hba/i)).toBeNull()
    })

    it('copies safe diagnostic JSON to clipboard when user clicks Copy Error Details', async () => {
      const errorId = 'ERR-20261105-COPY'
      const diagnostics = createSafeDiagnostics(errorId, 'DATA_LOAD_FAILURE', {
        route: '/students',
      })

      const writeTextMock = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, {
        clipboard: { writeText: writeTextMock },
      })

      render(
        <ErrorScreen
          category="DATA_LOAD_FAILURE"
          diagnostics={diagnostics}
        />
      )

      const copyBtn = screen.getByRole('button', { name: /copy error details/i })
      await act(async () => {
        fireEvent.click(copyBtn)
      })

      expect(writeTextMock).toHaveBeenCalledTimes(1)
      const copiedPayload = JSON.parse(writeTextMock.mock.calls[0][0])
      expect(copiedPayload.errorId).toBe(errorId)
      expect(copiedPayload.category).toBe('DATA_LOAD_FAILURE')
      expect(copiedPayload.app).toBe(BRANDING_CONFIG.appName)
      expect(copiedPayload.route).toBe('/students')
    })
  })

  describe('5. React ErrorBoundary Catch & Recovery', () => {
    const ProblematicComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) {
        throw new Error('Uncaught component rendering crash')
      }
      return <div>Normal Content Loaded Successfully</div>
    }

    it('catches runtime exception and displays friendly ErrorScreen without crashing app', () => {
      // Suppress jsdom's console.error noise during intentional error boundary throw
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <ErrorBoundary fallbackTitle="Section Error">
          <ProblematicComponent shouldThrow={true} />
        </ErrorBoundary>
      )

      // Friendly fallback rendered
      expect(screen.getByText('Section Error')).toBeDefined()
      expect(
        screen.getByText('Something went wrong. Please try again or contact support.')
      ).toBeDefined()
      expect(screen.getByRole('button', { name: /try again/i })).toBeDefined()

      errorSpy.mockRestore()
    })

    it('renders children smoothly when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ProblematicComponent shouldThrow={false} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Normal Content Loaded Successfully')).toBeDefined()
    })
  })

  describe('6. Offline Network Banner', () => {
    it('renders sticky alert when offline with check connection button', () => {
      // Mock offline status
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
      })

      render(<OfflineBanner />)

      expect(
        screen.getByText('Internet connection unavailable. Please check your connection.')
      ).toBeDefined()
      expect(screen.getByRole('button', { name: /check connection/i })).toBeDefined()

      // Restore
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
      })
    })
  })
})
