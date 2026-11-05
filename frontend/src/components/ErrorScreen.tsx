/**
 * @file        ErrorScreen.tsx
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
 * @created     2026-11-05
 * @updated     2026-11-05
 *
 * @description Centralized, user-friendly error recovery interface with diagnostic drawer and safe support actions.
 */

import React, { useState } from 'react'
import {
  AlertTriangle,
  WifiOff,
  ServerOff,
  LogIn,
  RefreshCw,
  Sparkles,
  LayoutDashboard,
  LifeBuoy,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react'
import {
  ErrorCategory,
  RecoveryAction,
  USER_ERROR_SPECS,
  SafeDiagnostics,
  buildSupportMailtoUrl,
  performSafeReload,
} from '../utils/errorTaxonomy'
import { BRANDING_CONFIG } from '../config/branding'

export interface ErrorScreenProps {
  category: ErrorCategory
  diagnostics: SafeDiagnostics
  fallbackTitle?: string
  fallbackMessage?: string
  onReset?: () => void
  isInline?: boolean
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({
  category,
  diagnostics,
  fallbackTitle,
  fallbackMessage,
  onReset,
  isInline = false,
}) => {
  const [copied, setCopied] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const spec = USER_ERROR_SPECS[category] || USER_ERROR_SPECS.UNKNOWN_ERROR
  const title = fallbackTitle || spec.title
  const message = fallbackMessage || spec.message

  // Primary and secondary recovery action handlers
  const handleAction = (action: RecoveryAction) => {
    switch (action) {
      case 'try_again':
        if (onReset) {
          onReset()
        } else {
          window.location.reload()
        }
        break
      case 'refresh_page':
        window.location.reload()
        break
      case 'reload_app':
        performSafeReload(true)
        break
      case 'login_again':
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        break
      case 'go_dashboard':
        if (typeof window !== 'undefined') {
          window.location.href = '/dashboard'
        }
        break
      case 'contact_support':
        if (typeof window !== 'undefined') {
          window.location.href = buildSupportMailtoUrl(diagnostics)
        }
        break
    }
  }

  const handleCopyDiagnostics = async () => {
    const text = JSON.stringify(diagnostics, null, 2)
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      }
    } catch {
      // Fallback
    }
  }

  // Visual icon selection matching error category
  const renderIcon = () => {
    switch (spec.iconType) {
      case 'network':
        return <WifiOff className="w-12 h-12 text-amber-500" />
      case 'server':
        return <ServerOff className="w-12 h-12 text-red-500" />
      case 'session':
        return <LogIn className="w-12 h-12 text-blue-500" />
      case 'update':
        return <Sparkles className="w-12 h-12 text-indigo-500" />
      case 'module':
        return <RefreshCw className="w-12 h-12 text-blue-600" />
      case 'data':
      case 'general':
      default:
        return <AlertTriangle className="w-12 h-12 text-amber-500" />
    }
  }

  // Label and icon for given recovery action
  const getActionMetadata = (action: RecoveryAction) => {
    switch (action) {
      case 'try_again':
        return { label: 'Try Again', icon: RotateCcw }
      case 'refresh_page':
        return { label: 'Refresh Page', icon: RefreshCw }
      case 'reload_app':
        return { label: 'Reload Application', icon: RefreshCw }
      case 'login_again':
        return { label: 'Login Again', icon: LogIn }
      case 'go_dashboard':
        return { label: 'Go to Dashboard', icon: LayoutDashboard }
      case 'contact_support':
        return { label: 'Contact Support', icon: LifeBuoy }
    }
  }

  const PrimaryIcon = getActionMetadata(spec.primaryAction).icon

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex flex-col items-center justify-center text-center p-6 sm:p-10 ${
        isInline ? 'min-h-[380px] w-full' : 'min-h-screen bg-slate-50'
      }`}
    >
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 sm:p-8 max-w-xl w-full text-center">
        {/* Visual Icon Badge */}
        <div className="mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 shadow-2xs">
          {renderIcon()}
        </div>

        {/* Friendly Title & Non-Technical Message */}
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-2">
          {title}
        </h2>
        <p className="text-sm sm:text-base text-slate-600 mb-6 leading-relaxed">
          {message}
        </p>

        {/* Primary Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => handleAction(spec.primaryAction)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          >
            <PrimaryIcon className="w-4 h-4" />
            <span>{getActionMetadata(spec.primaryAction).label}</span>
          </button>

          {/* Secondary Actions */}
          {spec.secondaryActions.map((sec) => {
            const { label, icon: SecIcon } = getActionMetadata(sec)
            return (
              <button
                key={sec}
                type="button"
                onClick={() => handleAction(sec)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <SecIcon className="w-4 h-4 text-slate-500" />
                <span>{label}</span>
              </button>
            )
          })}
        </div>

        {/* Safe Diagnostic Reference Drawer */}
        <div className="pt-4 border-t border-slate-100 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Ref ID:</span>
              <code className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-mono font-medium">
                {diagnostics.errorId}
              </code>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyDiagnostics}
                title="Copy safe diagnostic details"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-medium">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Error Details</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-slate-400 hover:text-slate-600 p-1"
                aria-label="Toggle technical diagnostic details"
              >
                {showDetails ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Collapsible Safe Details */}
          {showDetails && (
            <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5 font-sans animate-in fade-in duration-150">
              <div className="flex justify-between">
                <span className="text-slate-400">Application:</span>
                <span className="font-medium text-slate-700">{diagnostics.app}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Version:</span>
                <span className="font-mono text-slate-700">{diagnostics.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date & Time:</span>
                <span className="text-slate-700">{diagnostics.formattedTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Section:</span>
                <span className="font-mono text-slate-700">{diagnostics.route}</span>
              </div>
            </div>
          )}

          {/* Official Support Contact Channels */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
            <div>
              <span>Helpline: </span>
              <span className="font-medium text-slate-700">
                {BRANDING_CONFIG.salesSupport.displayPhones}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={buildSupportMailtoUrl(diagnostics)}
                className="text-blue-600 hover:text-blue-800 font-medium underline"
              >
                {BRANDING_CONFIG.salesSupport.email}
              </a>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500">
                {BRANDING_CONFIG.salesSupport.alternateEmail}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

