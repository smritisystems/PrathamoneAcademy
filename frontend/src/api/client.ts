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
 * @version     1.0.0
 * @created     2026-11-03
 * @updated     2026-11-05
 *
 * @description Axios HTTP client instance configured with base URL, authentication headers, and response interceptors.
 */

import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isRedirecting = false

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const hadToken = !!useAuthStore.getState().token
      if (hadToken) {
        useAuthStore.getState().logout()
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

