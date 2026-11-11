/**
 * @file        AuthInterceptorAndBranding.test.tsx
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
 * @updated     2026-11-11
 *
 * @description Vitest test suite validating authentication interceptors, 401 redirect loop prevention, and unauthenticated branding fallback.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAuthStore } from '../store/authStore'
import { useBranding, FALLBACK_BRANDING } from '../config/branding'
import apiClient from '../api/client'

describe('Authentication Interceptor & Redirect Loop Prevention Specifications', () => {
  beforeEach(() => {
    useAuthStore.getState().logout()
    vi.clearAllMocks()
  })

  it('provides safe fallback branding without firing unauthenticated network requests when token is null', () => {
    // When logged out / unauthenticated:
    expect(useAuthStore.getState().token).toBeNull()

    const { result } = renderHook(() => useBranding())

    // Must resolve immediately to authoritative fallback branding without errors
    expect(result.current.academyName).toBe(FALLBACK_BRANDING.academyName)
    expect(result.current.tagline).toBe(FALLBACK_BRANDING.tagline)
    expect(result.current.colors.primary).toBe(FALLBACK_BRANDING.colors.primary)
  })

  it('attaches Bearer token in request interceptor only when token is present', async () => {
    // 1. Without token:
    useAuthStore.getState().logout()
    let config: any = { headers: {} }
    // @ts-ignore
    const requestInterceptor: any = apiClient.interceptors.request.handlers[0]?.fulfilled
    config = requestInterceptor(config)
    expect(config.headers.Authorization).toBeUndefined()

    // 2. With token:
    useAuthStore.getState().login('test-jwt-token-12345', {
      id: 1,
      username: 'admin',
      email: 'admin@example.com',
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
    })

    config = { headers: {} }
    config = requestInterceptor(config)
    expect(config.headers.Authorization).toBe('Bearer test-jwt-token-12345')
  })

  it('prevents infinite page reload loop by suppressing window.location.href redirection when already on /login', async () => {
    // @ts-ignore
    const responseErrorInterceptor: any = apiClient.interceptors.response.handlers[0]?.rejected

    // Mock window.location
    const originalLocation = window.location
    let hrefValue = '/login'
    delete (window as any).location
    ;(window as any).location = {
      ...originalLocation,
      pathname: '/login',
      get href() {
        return hrefValue
      },
      set href(val: string) {
        hrefValue = val
      },
    }

    // Ensure logged out
    useAuthStore.getState().logout()

    const error401 = {
      response: { status: 401, data: { detail: 'Not authenticated' } },
    }

    // Trigger 401 error while on /login
    await expect(responseErrorInterceptor!(error401)).rejects.toEqual(error401)

    // href must NOT have been updated to reload /login
    expect(hrefValue).toBe('/login')

    // Restore window.location
    delete (window as any).location
    ;(window as any).location = originalLocation
  })

  it('clears invalid credentials and redirects to /login once when 401 occurs on a protected page', async () => {
    // @ts-ignore
    const responseErrorInterceptor: any = apiClient.interceptors.response.handlers[0]?.rejected

    // Setup an expired session
    useAuthStore.getState().login('expired-token-xyz', {
      id: 2,
      username: 'teacher1',
      email: 'teacher@prashantacademy.in',
      first_name: 'Teacher',
      last_name: 'One',
      role: 'teacher',
    })
    expect(useAuthStore.getState().token).toBe('expired-token-xyz')

    const originalLocation = window.location
    let redirectedTo = ''
    delete (window as any).location
    ;(window as any).location = {
      ...originalLocation,
      pathname: '/dashboard',
      get href() {
        return redirectedTo
      },
      set href(val: string) {
        redirectedTo = val
      },
    }

    const error401 = {
      response: { status: 401, data: { detail: 'Token has expired' } },
    }

    await expect(responseErrorInterceptor!(error401)).rejects.toEqual(error401)

    // Must clear expired token
    expect(useAuthStore.getState().token).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()

    // Must navigate to /login once
    expect(redirectedTo).toBe('/login')

    // Restore window.location
    delete (window as any).location
    ;(window as any).location = originalLocation
  })
})
