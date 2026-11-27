/**
 * @file        institutionValidation.ts
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
 * @created     2026-11-27
 * @updated     2026-11-27
 *
 * @description Shared validation helpers, Indian state catalog, and neutral UI placeholders
 */

export const INSTITUTE_PLACEHOLDERS = {
  name: 'Your Coaching Institute',
  short_name: 'e.g., VCA',
  branch_name: 'Main Branch',
  branch_code: 'MAIN',
  address_line_1: 'Enter your institute address',
  address_line_2: 'Building, Floor, Landmark (optional)',
  area_locality: 'Area / Locality',
  city: 'City',
  district: 'District (if applicable)',
  state: 'Select State / UT',
  pincode: '6-digit PIN Code',
  country: 'India',
  phone: '+91 XXXXX XXXXX',
  alternate_phone: '+91 XXXXX XXXXX',
  email: 'Enter your email address',
  website: 'https://yourinstitute.example',
  gstin: '15-character GSTIN (optional)',
  pan: '10-character PAN (optional)',
} as const

export const INDIAN_STATES_AND_UTS = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const

const PLACEHOLDER_NAMES = new Set([
  'your academy name',
  'your coaching institute',
  'coaching institute',
  'prathamone academy',
])

const DUMMY_PHONES = new Set([
  '+91 8779 123 007',
  '+918779123007',
  '8779123007',
  '+91 xxxxx xxxxx',
])

const PIN_INDIA_RE = /^[1-9][0-9]{5}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/

export interface ProfileValidationInput {
  name?: string | null
  branch_name?: string | null
  country?: string | null
  state?: string | null
  pincode?: string | null
  phone?: string | null
  alternate_phone?: string | null
  email?: string | null
  website?: string | null
  gstin?: string | null
  pan?: string | null
}

export function isPlaceholderInstituteName(name?: string | null): boolean {
  const cleaned = (name || '').trim().toLowerCase()
  return !cleaned || PLACEHOLDER_NAMES.has(cleaned)
}

export function validatePhoneField(value: string | null | undefined, label: string): string | null {
  const raw = (value || '').trim()
  if (!raw) return null
  if (DUMMY_PHONES.has(raw.toLowerCase())) {
    return `${label} cannot use a sample default phone number.`
  }
  const compact = raw.replace(/[\s\-()]/g, '')
  if (compact.startsWith('+91') || (!compact.startsWith('+') && /^\d+$/.test(compact))) {
    const digits = compact.startsWith('+91') ? compact.slice(3) : compact
    if (!/^[6-9]\d{9}$/.test(digits)) {
      return `${label} must be a valid 10-digit Indian mobile number starting with 6–9 (or include +CountryCode).`
    }
    return null
  }
  if (!/^\+[1-9]\d{7,14}$/.test(compact)) {
    return `${label} format is invalid.`
  }
  return null
}

export function validateProfileFields(
  input: ProfileValidationInput,
  options: { requireNonPlaceholderName?: boolean } = {}
): string | null {
  const name = (input.name || '').trim()
  if (!name || name.length < 2) {
    return 'Coaching Institute Name is required (minimum 2 characters).'
  }
  if (options.requireNonPlaceholderName && PLACEHOLDER_NAMES.has(name.toLowerCase())) {
    return 'Please enter your actual Coaching Institute Name instead of a placeholder label.'
  }

  const country = (input.country || 'India').trim()
  const state = (input.state || '').trim()
  if (state && country.toLowerCase() === 'india') {
    const known = INDIAN_STATES_AND_UTS.some((s) => s.toLowerCase() === state.toLowerCase())
    if (!known) {
      return `State "${state}" is not a recognized Indian State or Union Territory.`
    }
  }

  const pin = (input.pincode || '').trim()
  if (pin) {
    if (!country || country.toLowerCase() === 'india') {
      if (!PIN_INDIA_RE.test(pin)) {
        return 'Indian PIN Code must be 6 digits and cannot start with 0.'
      }
    } else if (!/^[A-Za-z0-9][A-Za-z0-9\-\s]{2,11}$/.test(pin)) {
      return 'Postal code must be 3–12 alphanumeric characters.'
    }
  }

  const phoneErr = validatePhoneField(input.phone, 'Mobile Number')
  if (phoneErr) return phoneErr

  const altPhoneErr = validatePhoneField(input.alternate_phone, 'Alternate Mobile Number')
  if (altPhoneErr) return altPhoneErr

  const email = (input.email || '').trim()
  if (email && !EMAIL_RE.test(email)) {
    return 'Please enter a valid Email Address.'
  }

  const website = (input.website || '').trim()
  if (website) {
    const normalized = /^https?:\/\//i.test(website) ? website : `https://${website}`
    if (!/^https?:\/\/[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:\/[^\s]*)?$/.test(normalized)) {
      return 'Website must be a valid web address (e.g., https://yourinstitute.in).'
    }
  }

  const gstin = (input.gstin || '').trim().toUpperCase()
  if (gstin && !GSTIN_RE.test(gstin)) {
    return 'GSTIN must follow the 15-character Indian format (e.g., 27ABCDE1234F1Z5).'
  }

  const pan = (input.pan || '').trim().toUpperCase()
  if (pan && !PAN_RE.test(pan)) {
    return 'PAN must follow the 10-character format (e.g., ABCDE1234F).'
  }

  return null
}

export function readAndValidateLogoFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
    if (!validTypes.includes(file.type)) {
      reject(new Error('Unsupported logo file type. Please upload PNG, JPEG, WEBP, or SVG.'))
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      reject(new Error('Logo file exceeds the 2 MB limit.'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Unable to read logo image file.'))
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      if (file.type === 'image/svg+xml') {
        try {
          const b64 = dataUrl.split(',')[1] || ''
          const svg = atob(b64)
          if (/(?:<script|<foreignobject|\bon[a-z]+\s*=|javascript:)/i.test(svg)) {
            reject(new Error('SVG logo contains unsafe scripts and cannot be uploaded.'))
            return
          }
        } catch {
          reject(new Error('Invalid SVG file encoding.'))
          return
        }
      }
      resolve(dataUrl)
    }
    reader.readAsDataURL(file)
  })
}
