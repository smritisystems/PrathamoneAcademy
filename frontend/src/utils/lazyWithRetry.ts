/**
 * @file        lazyWithRetry.ts
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
 * @description Dynamic module loader with chunk reload failure detection, cache recovery, and loop prevention.
 */

import React from 'react'
import {
  canSafelyReload,
  recordReloadAttempt,
  generateErrorReferenceId,
  ErrorCategory,
} from './errorTaxonomy'

export interface DynamicModuleError extends Error {
  category: ErrorCategory
  errorId: string
  isDynamicImportError: boolean
}

/**
 * Creates a lazy React component that gracefully detects chunk loading errors
 * (e.g. after a production release where asset hashes changed) and recovers via a controlled reload.
 *
 * @param componentImport Function importing the target component, e.g. () => import('./pages/Dashboard')
 * @param componentName Descriptive identifier for logging and storage tracking
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  componentName: string
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    const storageKey = `pratham_chunk_retry_${componentName}`

    try {
      const module = await componentImport()
      // Successful module load: clean up retry flag
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem(storageKey)
      }
      return module
    } catch (error: any) {
      const errorMsg = error?.message || String(error)
      const isChunkError =
        error?.name === 'ChunkLoadError' ||
        /Failed to fetch dynamically imported module/i.test(errorMsg) ||
        /Importing a module script failed/i.test(errorMsg) ||
        /Loading chunk/i.test(errorMsg)

      // If it is a chunk load failure and we haven't already retried this component in this session
      if (isChunkError && typeof window !== 'undefined' && window.sessionStorage) {
        const hasRetried = sessionStorage.getItem(storageKey) === 'true'

        if (!hasRetried && canSafelyReload()) {
          sessionStorage.setItem(storageKey, 'true')
          recordReloadAttempt()
          // Controlled reload to fetch the newly published bundle manifest
          window.location.reload()
          // Return a hanging promise while the page reloads
          return new Promise(() => {})
        }
      }

      // Construct classified error preserving diagnostic context
      const errorId = generateErrorReferenceId()
      const enhancedError = new Error(
        `Failed to load component "${componentName}".`
      ) as DynamicModuleError

      enhancedError.name = 'DynamicImportError'
      enhancedError.category = 'MODULE_LOAD_FAILURE'
      enhancedError.errorId = errorId
      enhancedError.isDynamicImportError = true

      throw enhancedError
    }
  })
}

