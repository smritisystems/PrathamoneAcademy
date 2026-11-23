/**
 * @file        formatters.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.utils
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-12
 * @updated     2026-11-23
 *
 * @description Canonical INR currency, Indian locale date/time, Aadhaar mask, and phone formatting helpers (Rule 008 SSOT).
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
 * Formats an ISO date or Date instance using `en-IN` locale formatting (DD MMM YYYY).
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

/**
 * Masks a 12-digit Aadhaar number for DPDP Act 2023 compliance: `XXXX-XXXX-1234`.
 */
export function formatMaskedAadhaar(value: string | null | undefined): string {
  if (!value) return '—'
  const clean = String(value).replace(/\D/g, '')
  if (clean.length !== 12) return value
  return `XXXX-XXXX-${clean.slice(8)}`
}

/**
 * Formats standard 10-digit Indian phone numbers with optional +91 prefix.
 */
export function formatPhoneNumber(value: string | null | undefined, withPrefix = false): string {
  if (!value) return '—'
  const clean = String(value).replace(/\D/g, '')
  if (clean.length === 10) {
    const formatted = `${clean.slice(0, 5)} ${clean.slice(5)}`
    return withPrefix ? `+91 ${formatted}` : formatted
  }
  return value
}

/**
 * Minimalist Rule 014 empty state fallback helper.
 */
export function fallbackEmpty(value: any, fallback = '—'): string {
  if (value === null || value === undefined || value === '') return fallback
  return String(value)
}


