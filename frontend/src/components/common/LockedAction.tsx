/**
 * @file        LockedAction.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.common
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-07
 * @updated     2026-11-08
 *
 * @description Standardized Rule 010 View-First locked mutation controls. Renders visible locked visual treatments with Lock icons and informative tooltips in View Mode, and unlocks interactive mutation behaviors when authorized Edit Mode is active.
 */

import React from 'react'
import { Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'

export interface BaseLockedProps {
  /** Whether Edit Mode is active for this control's scope */
  isEditMode: boolean
  /** Whether the user has role/permission authorization for this specific action (default: true) */
  isAuthorized?: boolean
  /** Informative tooltip message when in View Mode */
  viewModeTooltip?: string
  /** Informative tooltip message when user lacks permission */
  unauthorizedTooltip?: string
  /** Whether the action itself is disabled due to business rules (e.g. form loading or invalid state) */
  disabled?: boolean
  /** Custom extra class name */
  className?: string
  /** ARIA label for accessibility */
  ariaLabel?: string
}

export interface LockedButtonProps extends BaseLockedProps {
  /** Callback executed when action is clicked in active Edit Mode */
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  /** Action label text */
  children: React.ReactNode
  /** Icon component to render when unlocked (e.g. Plus, Edit, Trash2) */
  icon?: React.ComponentType<{ className?: string }>
  /** Visual variant of the button */
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'outline' | 'ghost'
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Button HTML type */
  type?: 'button' | 'submit' | 'reset'
}

/**
 * Standard button that displays locked treatment in View Mode.
 */
export function LockedButton({
  isEditMode,
  isAuthorized = true,
  onClick,
  children,
  icon: Icon,
  variant = 'primary',
  size = 'sm',
  type = 'button',
  disabled = false,
  className = '',
  viewModeTooltip = 'Locked in View Mode: Activate Edit Mode above to perform this action.',
  unauthorizedTooltip = 'Your account does not have permission to perform this action.',
  ariaLabel,
}: LockedButtonProps) {
  const { user } = useAuthStore()

  const isLocked = !isEditMode || !isAuthorized
  const tooltip = !isAuthorized
    ? unauthorizedTooltip
    : !isEditMode
    ? viewModeTooltip
    : undefined

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isAuthorized) {
      e.preventDefault()
      e.stopPropagation()
      toast.error(unauthorizedTooltip)
      return
    }

    if (!isEditMode) {
      e.preventDefault()
      e.stopPropagation()
      toast.error(viewModeTooltip)
      return
    }

    if (disabled) return

    onClick(e)
  }

  // Size classes
  const sizeClasses = {
    xs: 'px-2.5 py-1 text-xs gap-1 rounded-lg',
    sm: 'px-3 py-1.5 text-xs font-semibold gap-1.5 rounded-lg',
    md: 'px-4 py-2 text-sm font-semibold gap-2 rounded-xl',
    lg: 'px-5 py-2.5 text-base font-bold gap-2.5 rounded-xl',
  }[size]

  // Active variant classes
  const activeVariantClasses = {
    primary: 'bg-primary-600 hover:bg-primary-700 active:bg-indigo-800 text-white shadow-2xs',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-2xs',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white shadow-2xs',
    outline: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600',
  }[variant]

  // Locked variant styling
  const lockedClasses =
    'bg-slate-100 text-slate-400 border border-slate-200/90 cursor-not-allowed select-none shadow-none hover:bg-slate-100 hover:text-slate-400'

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      aria-disabled={isLocked}
      title={tooltip}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      className={`inline-flex items-center justify-center transition-all ${sizeClasses} ${
        isLocked ? lockedClasses : activeVariantClasses
      } ${className}`}
    >
      {isLocked ? (
        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      ) : Icon ? (
        <Icon className="w-3.5 h-3.5 shrink-0" />
      ) : null}
      <span>{children}</span>
      {isLocked && <span className="text-[10px] uppercase font-bold text-slate-400 ml-0.5">(Locked)</span>}
    </button>
  )
}

export interface LockedIconButtonProps extends BaseLockedProps {
  /** Callback executed in Edit Mode */
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  /** Icon to render when unlocked (Component or ReactNode) */
  icon: React.ComponentType<{ className?: string }> | React.ReactNode
  /** Title / tooltip description */
  title?: string
  /** Tooltip description alias */
  tooltip?: string
  /** Tone variant */
  tone?: 'danger' | 'primary' | 'default' | 'success' | 'warning'
}

/**
 * Standard icon button (e.g. Trash2, Edit, Check) displaying lock treatment in View Mode.
 */
export function LockedIconButton({
  isEditMode,
  isAuthorized = true,
  onClick,
  icon,
  title,
  tooltip,
  tone = 'default',
  disabled = false,
  className = '',
  viewModeTooltip,
  unauthorizedTooltip = 'Your account does not have permission to perform this action.',
}: LockedIconButtonProps) {
  const isLocked = !isEditMode || !isAuthorized
  const actionTitle = title || tooltip || 'action'
  const defaultViewTooltip = `Locked in View Mode: Activate Edit Mode above to ${actionTitle.toLowerCase()}.`
  const activeTooltip = !isAuthorized
    ? unauthorizedTooltip
    : !isEditMode
    ? viewModeTooltip || defaultViewTooltip
    : actionTitle

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isAuthorized) {
      e.preventDefault()
      e.stopPropagation()
      toast.error(unauthorizedTooltip)
      return
    }

    if (!isEditMode) {
      e.preventDefault()
      e.stopPropagation()
      toast.error(viewModeTooltip || defaultViewTooltip)
      return
    }

    if (disabled) return

    onClick(e)
  }

  const toneHoverClasses = {
    danger: 'text-slate-400 hover:text-rose-600 hover:bg-rose-50',
    primary: 'text-slate-400 hover:text-primary-600 hover:bg-primary-50',
    success: 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50',
    warning: 'text-slate-400 hover:text-amber-600 hover:bg-amber-50',
    default: 'text-slate-400 hover:text-slate-700 hover:bg-slate-100',
  }[tone]

  const IconComp = typeof icon === 'function' ? (icon as React.ComponentType<{ className?: string }>) : null

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-disabled={isLocked}
      title={activeTooltip}
      className={`p-1.5 rounded-lg transition-colors ${
        isLocked
          ? 'text-slate-300 hover:text-slate-400 cursor-not-allowed bg-slate-50/50'
          : toneHoverClasses
      } ${className}`}
    >
      {isLocked ? (
        <Lock className="w-3.5 h-3.5 text-slate-300" />
      ) : React.isValidElement(icon) ? (
        icon
      ) : IconComp ? (
        <IconComp className="w-3.5 h-3.5" />
      ) : null}
    </button>
  )
}

export interface LockedLinkButtonProps extends BaseLockedProps {
  /** Callback executed in Edit Mode */
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  /** Label text (e.g. 'Set as Primary') */
  label: string
}

/**
 * Standard link-style button (e.g. Set as Primary / Set as Default) with View-First locking.
 */
export function LockedLinkButton({
  isEditMode,
  isAuthorized = true,
  onClick,
  label,
  className = '',
  viewModeTooltip = `Locked in View Mode: Activate Edit Mode above to perform '${label}'.`,
  unauthorizedTooltip = 'Your account does not have permission to perform this action.',
}: LockedLinkButtonProps) {
  const isLocked = !isEditMode || !isAuthorized
  const tooltip = !isAuthorized
    ? unauthorizedTooltip
    : !isEditMode
    ? viewModeTooltip
    : undefined

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isAuthorized) {
      e.preventDefault()
      e.stopPropagation()
      toast.error(unauthorizedTooltip)
      return
    }

    if (!isEditMode) {
      e.preventDefault()
      e.stopPropagation()
      toast.error(viewModeTooltip)
      return
    }

    onClick(e)
  }

  if (isLocked) {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={tooltip}
        aria-disabled="true"
        className={`inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-500 cursor-not-allowed select-none ${className}`}
      >
        <Lock className="w-3 h-3 text-slate-400" />
        <span>{label} (Locked)</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`text-[11px] font-bold text-primary-600 hover:text-primary-800 hover:underline transition-colors ${className}`}
    >
      {label}
    </button>
  )
}

