/**
 * @file        ErrorHandling.test.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.test
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
  formatApiErrorDetail,
  extractApiErrorMessage,
  installGlobalErrorBridge,
  logTechnicalError,
  redactSensitiveText,
} from '../utils/errorTaxonomy'
import SafeToaster from '../components/common/SafeToaster'
import toast from 'react-hot-toast'
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

  describe('7. Safe API Error Formatting & Crash-Proof SafeToaster', () => {
    it('formats FastAPI 422 validation error arrays into safe human-readable strings', () => {
      const detailArray = [
        { type: 'missing', loc: ['body', 'admission_date'], msg: 'Field required', input: {} },
        { type: 'string_too_short', loc: ['body', 'first_name'], msg: 'String should have at least 1 character' },
      ]
      expect(formatApiErrorDetail(detailArray)).toBe(
        'admission date: Field required; first name: String should have at least 1 character'
      )

      const err422 = { response: { status: 422, data: { detail: detailArray } } }
      expect(extractApiErrorMessage(err422, 'Save failed')).toBe(
        'admission date: Field required; first name: String should have at least 1 character'
      )
    })

    it('translates HTTP 423 Evaluation Mode errors without leaking raw Axios status text', () => {
      const err423WithDetail = {
        response: {
          status: 423,
          data: { detail: 'PrathamOne EduOS is in Evaluation Mode. Activate or renew the license to make changes.' },
        },
        message: 'Request failed with status code 423',
      }
      expect(extractApiErrorMessage(err423WithDetail)).toBe(
        'PrathamOne EduOS is in Evaluation Mode. Activate or renew the license to make changes.'
      )

      const err423Generic = {
        response: { status: 423 },
        message: 'Request failed with status code 423',
      }
      expect(extractApiErrorMessage(err423Generic)).toContain('Evaluation Mode is active')
    })

    it('renders SafeToaster safely without React #31 crash even when given a 422 validation object array', async () => {
      const { unmount } = render(<SafeToaster />)
      await act(async () => {
        toast.error([
          { type: 'missing', loc: ['body', 'admission_date'], msg: 'Field required', input: {} },
        ] as any)
      })
      expect(screen.getByText(/admission date: Field required/i)).toBeDefined()
      toast.dismiss()
      unmount()
    })
  })

  describe('8. Desktop WebView2 Frontend Error Bridge & DPDP Scrubbing', () => {
    it('forwards window errors, unhandled rejections, ErrorBoundary crashes, and HTTP 500/423 summaries sanitized to WebView2', () => {
      const postMessage = vi.fn()
      ;(window as any).chrome = { webview: { postMessage } }

      const cleanup = installGlobalErrorBridge()
      try {
        // 1. Trigger window error event with sensitive token/aadhaar text
        window.dispatchEvent(
          new ErrorEvent('error', {
            error: new Error('Crash with Bearer secretToken123 and aadhaar=1234-5678-9012'),
            message: 'Crash with Bearer secretToken123',
          })
        )
        // 2. Trigger unhandled promise rejection
        const rejEvent = new Event('unhandledrejection') as any
        rejEvent.reason = new Error('Unhandled rejection password=TopSecret!')
        window.dispatchEvent(rejEvent)

        // 3. Trigger HTTP 500 & 423 API summaries (and ensure 404 is not forwarded)
        logTechnicalError({
          errorId: 'ERR-20261126-500X',
          error: new Error('Server 500'),
          category: 'SERVER_UNAVAILABLE',
          apiEndpoint: '/api/v1/staff/assignments/list?token=abc123',
          status: 500,
        })
        logTechnicalError({
          errorId: 'ERR-20261126-423X',
          error: new Error('Locked 423'),
          category: 'DATA_LOAD_FAILURE',
          apiEndpoint: '/api/v1/settings/profile',
          status: 423,
        })
        logTechnicalError({
          errorId: 'ERR-20261126-404X',
          error: new Error('Not found'),
          category: 'DATA_LOAD_FAILURE',
          apiEndpoint: '/api/v1/students/999',
          status: 404,
        })

        // 4. Trigger ErrorBoundary componentDidCatch
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        const Boom = () => {
          throw new Error('Boundary explosion token=xyz999')
        }
        render(
          <ErrorBoundary>
            <Boom />
          </ErrorBoundary>
        )
        errSpy.mockRestore()

        const payloads = postMessage.mock.calls.map((c) => c[0])
        const sources = payloads.map((p) => p.source)
        expect(sources).toContain('window_error')
        expect(sources).toContain('unhandledrejection')
        expect(sources).toContain('api')
        expect(sources).toContain('error_boundary')
        expect(payloads.some((p) => p.httpStatus === 404)).toBe(false)

        const errEvt = payloads.find((p) => p.errorName === 'Error' && p.summary.includes('Bearer'))
        const rejEvtPayload = payloads.find((p) => p.source === 'unhandledrejection')
        const api500 = payloads.find((p) => p.httpStatus === 500)
        const api423 = payloads.find((p) => p.httpStatus === 423)
        const boundaryEvt = payloads.find((p) => p.source === 'error_boundary')

        expect(errEvt?.summary).not.toContain('secretToken123')
        expect(errEvt?.summary).not.toContain('1234-5678-9012')
        expect(rejEvtPayload?.summary).not.toContain('TopSecret!')
        expect(api500?.apiEndpoint).toBe('/api/v1/staff/assignments/list?token=[REDACTED]')
        expect(api423?.httpStatus).toBe(423)
        expect(boundaryEvt?.summary).not.toContain('xyz999')
        expect(redactSensitiveText('Bearer abc.def.ghi')).toBe('Bearer [REDACTED]')
      } finally {
        cleanup()
        delete (window as any).chrome
      }
    })
  })
})
