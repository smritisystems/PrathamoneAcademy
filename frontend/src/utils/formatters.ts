/**
 * @file        formatters.ts
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
 * @created     2026-11-12
 * @updated     2026-11-12
 *
 * @description Canonical INR currency and Indian locale date/time formatting helpers (Rule 008 SSOT).
 */

/**
 * Formats numeric amount in Indian Rupee grouping (`en-IN`).
 */
export function formatINR(
  value: number | string | null | undefined,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number; withSymbol?: boolean }
): string {
  const num = Number(value ?? 0)
  const safe = Number.isFinite(num) ? num : 0
  const formatted = safe.toLocaleString('en-IN', {
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  })
  return options?.withSymbol === false ? formatted : `₹${formatted}`
}

/**
 * Formats an ISO date or Date instance using `en-IN` locale formatting.
 */
export function formatDateIN(
  value: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!value) return '—'
  const dt = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(dt.getTime())) return String(value)
  return dt.toLocaleDateString('en-IN', options ?? { day: '2-digit', month: 'short', year: 'numeric' })
}

