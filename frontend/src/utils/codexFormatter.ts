/**
 * @file        codexFormatter.ts
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
 * @created     2026-11-07
 * @updated     2026-11-07
 *
 * @description Bijective mapping and numeric obfuscation formatter utility for CodeX presentation layer.
 */

export const DEFAULT_DIGIT_MAP: Record<string, string> = {
  '0': 'Q',
  '1': 'A',
  '2': 'Z',
  '3': 'M',
  '4': 'K',
  '5': 'P',
  '6': 'X',
  '7': 'B',
  '8': 'T',
  '9': 'R',
}

/**
 * Encodes a numeric value using bijective character replacement.
 * e.g., 2889000 -> 'CX-ZTTRQQQ'
 */
export function encodeCodexNumber(
  value: number | string | null | undefined,
  prefix = 'CX-',
  suffix = '',
  digitMap: Record<string, string> = DEFAULT_DIGIT_MAP
): string {
  if (value === null || value === undefined || value === '') return ''
  const valStr = String(value).replace(/,/g, '').trim()
  let out = ''
  for (const ch of valStr) {
    if (ch >= '0' && ch <= '9') {
      out += digitMap[ch] || ch
    } else {
      out += ch
    }
  }
  return `${prefix}${out}${suffix}`
}
