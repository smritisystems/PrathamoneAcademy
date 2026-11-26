/**
 * @file        SafeToaster.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.common
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-26
 * @updated     2026-11-26
 *
 * @description Crash-proof react-hot-toast Toaster wrapper that coerces non-Renderable API objects/arrays (e.g. FastAPI 422 validation arrays) into safe strings and isolates render failures to prevent blank white screen crashes.
 */

import React from 'react'
import { Toaster, ToastBar, resolveValue, type Toast, type ToasterProps, type Renderable } from 'react-hot-toast'
import { formatApiErrorDetail } from '../../utils/errorTaxonomy'

function isSafeReactNode(value: unknown): value is Renderable {
  if (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return true
  }
  if (React.isValidElement(value)) {
    return true
  }
  if (Array.isArray(value)) {
    return value.every((item) => isSafeReactNode(item))
  }
  return false
}

export function sanitizeToastMessage(rawMessage: Toast['message'], toastItem: Toast): Renderable {
  const resolved = typeof rawMessage === 'function' ? resolveValue(rawMessage, toastItem) : rawMessage
  if (isSafeReactNode(resolved)) {
    return resolved as Renderable
  }
  return formatApiErrorDetail(resolved, 'An unexpected error occurred.')
}

class ToastBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    if ((import.meta as any).env?.DEV) {
      console.error('[SafeToaster] Suppressed toast render failure:', error)
    }
  }

  render() {
    if (this.state.hasError) {
      return null
    }
    return this.props.children
  }
}

export default function SafeToaster(props: ToasterProps) {
  return (
    <ToastBoundary>
      <Toaster {...props}>
        {(t) => {
          const safeMessage = sanitizeToastMessage(t.message, t)
          return <ToastBar toast={{ ...t, message: safeMessage }} />
        }}
      </Toaster>
    </ToastBoundary>
  )
}
