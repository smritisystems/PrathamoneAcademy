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
 * @version     1.0.0
 * @created     2026-11-04
 * @updated     2026-11-04
 *
 * @description React error boundary catching runtime component errors and displaying fallback diagnostics.
 */

import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  children: React.ReactNode
  fallbackTitle?: string
  fallbackMessage?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {this.props.fallbackTitle ?? 'Something went wrong'}
          </h2>
          <p className="text-gray-500 mb-6 max-w-md">
            {this.props.fallbackMessage ??
              'An unexpected error occurred while loading this section. Please try refreshing.'}
          </p>
          {this.state.error && (
            <pre className="text-xs text-left bg-gray-100 rounded p-3 mb-6 max-w-xl overflow-auto text-red-700">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

/** Lightweight functional wrapper for simple query error display */
export function QueryError({
  error,
  title = 'Failed to load data',
}: {
  error: unknown
  title?: string
}) {
  const msg = error instanceof Error ? error.message : String(error)
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
      <p className="font-medium text-gray-700">{title}</p>
      <p className="text-sm text-gray-500 mt-1">{msg}</p>
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
      {Icon && <Icon className="w-12 h-12 text-gray-300 mb-4" />}
      <p className="text-lg font-medium text-gray-500">{title}</p>
      {message && <p className="text-sm text-gray-400 mt-1">{message}</p>}
    </div>
  )
}

