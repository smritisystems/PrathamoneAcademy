/**
 * @file        DemoBadge.tsx
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
 * @updated     2026-11-07
 *
 * @description Standard visual indicator pill displayed on records and UI cards operating in or derived from Training & Demo mode.
 */

import React from 'react'

export interface DemoBadgeProps {
  className?: string
  size?: 'sm' | 'md'
}

export function DemoBadge({ className = '', size = 'sm' }: DemoBadgeProps) {
  const sizeClasses =
    size === 'sm'
      ? 'px-1.5 py-0.5 text-[9px] font-black'
      : 'px-2 py-0.5 text-[11px] font-black'

  return (
    <span
      title="Training & Demo Sample Record — Not for live production use"
      className={`inline-flex items-center tracking-wider uppercase rounded-md bg-amber-100 text-amber-800 shadow-2xs border border-amber-300 ${sizeClasses} ${className}`}
    >
      DEMO
    </span>
  )
}

export default DemoBadge
