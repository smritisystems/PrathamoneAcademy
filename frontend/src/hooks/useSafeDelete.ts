/**
 * @file        useSafeDelete.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.hooks.useSafeDelete
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-10
 * @updated     2026-11-10
 *
 * @description Hook providing pre-flight dependency audits, eligibility status, and safe execution (delete, deactivate, archive).
 */

import { useState, useCallback } from 'react'
import { governanceApi, DeletionEligibilityReport } from '../api/endpoints'

export interface UseSafeDeleteOptions {
  onSuccess?: (action: 'delete' | 'deactivate' | 'archive', result: any) => void
  onError?: (error: any) => void
}

export function useSafeDelete(options: UseSafeDeleteOptions = {}) {
  const [isChecking, setIsChecking] = useState(false)
  const [report, setReport] = useState<DeletionEligibilityReport | null>(null)
  const [checkError, setCheckError] = useState<string | null>(null)
  const [isMutating, setIsMutating] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)

  const checkEligibility = useCallback(async (entityType: string, entityId: number | string) => {
    setIsChecking(true)
    setCheckError(null)
    setReport(null)
    try {
      const res = await governanceApi.checkSafeDelete(entityType, entityId)
      setReport(res.data)
      return res.data
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to check deletion eligibility'
      setCheckError(msg)
      return null
    } finally {
      setIsChecking(false)
    }
  }, [])

  const executeDelete = useCallback(async (entityType: string, entityId: number | string, reason?: string) => {
    setIsMutating(true)
    setMutationError(null)
    try {
      const res = await governanceApi.executeSafeDelete(entityType, entityId, reason)
      options.onSuccess?.('delete', res.data)
      return res.data
    } catch (err: any) {
      const detail = err.response?.data?.detail
      const msg = typeof detail === 'string' ? detail : (detail?.block_reason || err.message || 'Deletion failed')
      setMutationError(msg)
      options.onError?.(err)
      throw err
    } finally {
      setIsMutating(false)
    }
  }, [options])

  const executeDeactivate = useCallback(async (entityType: string, entityId: number | string, reason?: string) => {
    setIsMutating(true)
    setMutationError(null)
    try {
      const res = await governanceApi.executeSafeDeactivate(entityType, entityId, reason)
      options.onSuccess?.('deactivate', res.data)
      return res.data
    } catch (err: any) {
      const detail = err.response?.data?.detail
      const msg = typeof detail === 'string' ? detail : (err.message || 'Deactivation failed')
      setMutationError(msg)
      options.onError?.(err)
      throw err
    } finally {
      setIsMutating(false)
    }
  }, [options])

  const executeArchive = useCallback(async (entityType: string, entityId: number | string, reason?: string) => {
    setIsMutating(true)
    setMutationError(null)
    try {
      const res = await governanceApi.executeSafeArchive(entityType, entityId, reason)
      options.onSuccess?.('archive', res.data)
      return res.data
    } catch (err: any) {
      const detail = err.response?.data?.detail
      const msg = typeof detail === 'string' ? detail : (err.message || 'Archiving failed')
      setMutationError(msg)
      options.onError?.(err)
      throw err
    } finally {
      setIsMutating(false)
    }
  }, [options])

  const reset = useCallback(() => {
    setReport(null)
    setCheckError(null)
    setMutationError(null)
  }, [])

  return {
    isChecking,
    report,
    checkError,
    isMutating,
    mutationError,
    checkEligibility,
    executeDelete,
    executeDeactivate,
    executeArchive,
    reset,
  }
}
