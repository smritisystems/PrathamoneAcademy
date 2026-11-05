/**
 * @file        ErrorBoundary.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     2.0.0
 * @created     2026-11-04
 * @updated     2026-11-05
 *
 * @description Centralized React Error Boundary catching component exceptions, logging technical diagnostics, and presenting friendly recovery UI.
 */

import React from 'react'
import { AlertCircle } from 'lucide-react'
import {
  ErrorCategory,
  classifyError,
  generateErrorReferenceId,
  createSafeDiagnostics,
  logTechnicalError,
  SafeDiagnostics,
} from '../utils/errorTaxonomy'
import { ErrorScreen } from './ErrorScreen'

export interface ErrorBoundaryProps {
  children: React.ReactNode
  fallbackTitle?: string
  fallbackMessage?: string
  categoryOverride?: ErrorCategory
  onReset?: () => void
  isInline?: boolean
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorId: string
  category: ErrorCategory
  diagnostics: SafeDiagnostics | null
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorId: '',
      category: 'UNKNOWN_ERROR',
      diagnostics: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = (error as any)?.errorId || generateErrorReferenceId()
    const category = (error as any)?.category || classifyError(error)
    const diagnostics = createSafeDiagnostics(errorId, category)

    return {
      hasError: true,
      error,
      errorId,
      category,
      diagnostics,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { errorId, category } = this.state
    const effectiveCategory = this.props.categoryOverride || category

    // Log full developer diagnostics matching the user-facing error reference ID
    logTechnicalError({
      errorId: errorId || generateErrorReferenceId(),
      error,
      category: effectiveCategory,
      componentStack: errorInfo.componentStack || undefined,
    })
  }

  handleReset = () => {
    if (this.props.onReset) {
      this.props.onReset()
    }
    this.setState({
      hasError: false,
      error: null,
      errorId: '',
      category: 'UNKNOWN_ERROR',
      diagnostics: null,
    })
  }

  render() {
    if (this.state.hasError && this.state.diagnostics) {
      const effectiveCategory = this.props.categoryOverride || this.state.category

      return (
        <ErrorScreen
          category={effectiveCategory}
          diagnostics={this.state.diagnostics}
          fallbackTitle={this.props.fallbackTitle}
          fallbackMessage={this.props.fallbackMessage}
          onReset={this.handleReset}
          isInline={this.props.isInline}
        />
      )
    }

    return this.props.children
  }
}

/** Lightweight functional wrapper for simple query error display */
export function QueryError({
  error,
  title = 'Failed to load data',
  onRetry,
}: {
  error: unknown
  title?: string
  onRetry?: () => void
}) {
  const category = classifyError(error)
  const errorId = (error as any)?.errorId || generateErrorReferenceId()
  const diagnostics = createSafeDiagnostics(errorId, category)

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <ErrorScreen
        category={category}
        diagnostics={diagnostics}
        fallbackTitle={title}
        onReset={onRetry}
        isInline
      />
    </div>
  )
}

/** Empty state placeholder */
export function EmptyState({
  icon: Icon,
  title,
  message,
}: {
  icon?: React.ElementType
  title: string
  message?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon ? (
        <Icon className="w-12 h-12 text-gray-300 mb-4" />
      ) : (
        <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
      )}
      <p className="text-lg font-medium text-gray-500">{title}</p>
      {message && <p className="text-sm text-gray-400 mt-1">{message}</p>}
    </div>
  )
}
