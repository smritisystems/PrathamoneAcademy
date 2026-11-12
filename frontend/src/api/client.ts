/**
 * @file        client.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.api
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     2.0.0
 * @created     2026-11-03
 * @updated     2026-11-12
 *
 * @description Axios HTTP client instance configured with base URL, authentication headers, error classification, and response interceptors.
 */

import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { useEnvironmentStore } from '../store/environmentStore'
import {
  classifyError,
  generateErrorReferenceId,
  USER_ERROR_SPECS,
  logTechnicalError,
} from '../utils/errorTaxonomy'

const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = typeof useAuthStore?.getState === 'function' ? useAuthStore.getState()?.token : null
  if (token && token !== 'cookie-session') {
    config.headers.Authorization = `Bearer ${token}`
  }
  const dataEnv = typeof useEnvironmentStore?.getState === 'function'
    ? useEnvironmentStore.getState()?.dataEnvironment
    : 'PRODUCTION'
  config.headers['X-Data-Environment'] = dataEnv || 'PRODUCTION'
  return config
})

let isRedirecting = false

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorId = error?.errorId || generateErrorReferenceId()
    const category = classifyError(error)
    const spec = USER_ERROR_SPECS[category]

    // Attach classified non-technical properties to error object
    if (error && typeof error === 'object') {
      error.errorId = errorId
      error.category = category
      error.userFriendlyMessage = spec.message
      error.userFriendlyTitle = spec.title
    }

    // Log complete developer details in console group
    logTechnicalError({
      errorId,
      error,
      category,
      apiEndpoint: error?.config?.url,
      status: error?.response?.status,
    })

    if (error.response?.status === 401) {
      const hadToken = typeof useAuthStore?.getState === 'function' ? !!useAuthStore.getState()?.token : false
      if (hadToken && typeof useAuthStore?.getState === 'function') {
        useAuthStore.getState()?.logout?.()
      }

      if (typeof window !== 'undefined') {
        const isLoginPage = window.location.pathname === '/login'
        if (hadToken && !isLoginPage && !isRedirecting) {
          isRedirecting = true
          setTimeout(() => {
            isRedirecting = false
          }, 3000)
          window.location.href = '/login'
        }
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
