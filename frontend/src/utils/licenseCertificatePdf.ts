/**
 * @file        licenseCertificatePdf.ts
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
 * @created     2026-11-24
 * @updated     2026-11-27
 *
 * @description Generates and shares a customer-facing PrathamOne software license certificate.
 */

import 'regenerator-runtime/runtime'
import fontkit from '@pdf-lib/fontkit'
import latinFontUrl from '@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-latin-400-normal.woff?url'
import latinBoldFontUrl from '@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-latin-700-normal.woff?url'
import devanagariFontUrl from '@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-400-normal.woff?url'
import devanagariBoldFontUrl from '@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-700-normal.woff?url'
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import QRCode from 'qrcode'

export interface LicenseCertificateEntitlement {
  key: string
  value: string
}

export interface LicenseCertificateData {
  institutionName: string
  institutionAddress: string | null
  registeredEmail?: string | null
  mode: string
  licenseStatus: string | null
  licenseId: string | null
  documentId: string
  serialNumber: string | null
  edition: string | null
  licenseModel: string | null
  expiresAt: string | null
  issuedAt: string | null
  generatedAt?: string | null
  entitlements: LicenseCertificateEntitlement[]
  verificationUrl: string | null
}

export interface LicenseCertificateEntitlementGroup {
  label: string
  value: string
}

const entitlementGroupDefinitions = [
  { label: 'Licensed Users', matches: /user|seat|student|staff/ },
  { label: 'Branches / locations', matches: /branch|location|site|campus|institute/ },
  { label: 'Licensed modules', matches: /module|feature/ },
  { label: 'Deployment type', matches: /deployment|hosting|environment/ },
]

export function groupLicenseCertificateEntitlements(entitlements: LicenseCertificateEntitlement[]) {
  const groupedIndexes = new Set<number>()
  const groups: LicenseCertificateEntitlementGroup[] = entitlementGroupDefinitions.map(({ label, matches }) => {
    const matchingEntitlements = entitlements.filter(({ key }, index) => {
      if (groupedIndexes.has(index)) return false
      const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '')
      const matchesGroup = matches.test(normalizedKey)
      if (matchesGroup) groupedIndexes.add(index)
      return matchesGroup
    })
    return {
      label,
      value: matchingEntitlements.length
        ? matchingEntitlements.map(({ value }) => value).join(', ')
        : 'Not recorded in signed snapshot',
    }
  })

  return {
    groups,
    other: entitlements.filter((_, index) => !groupedIndexes.has(index)),
  }
}

type PdfColor = ReturnType<typeof rgb>

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const NAVY = rgb(0, 0.1333, 0.3333) // #002255
const NAVY_TEXT = rgb(0, 0.1294, 0.3294) // #002154
const VALUE_INK = rgb(0.0667, 0.1294, 0.2471) // #11213F
const BLUE = rgb(0.05, 0.23, 0.48)
const ORANGE = rgb(0.8824, 0.4196, 0.1176) // #E16B1D
const GOLD = rgb(0.9608, 0.6510, 0.1373) // #F5A623
const TEXT = rgb(0.10, 0.15, 0.23)
const MUTED = rgb(0.3922, 0.4549, 0.5412) // #64748A
const SUBTLE_MUTED = rgb(0.5765, 0.6392, 0.7216) // #93A3B8
const HEADER_SUBTEXT = rgb(0.6196, 0.6863, 0.8275) // #9EAFD3
const FOOTER_TEXT = rgb(0.7922, 0.8314, 0.8824) // #CAD4E1
const PILL_BORDER = rgb(0.2902, 0.3882, 0.5882) // #4A6396
const BORDER = rgb(0.8588, 0.8902, 0.9373) // #DBE3EF
const CARD_BG = rgb(0.9529, 0.9647, 0.9843) // #F3F6FB
const PALE = rgb(0.96, 0.97, 0.99)
const WHITE = rgb(1, 1, 1)
const LEFT = 40
const RIGHT = PAGE_WIDTH - LEFT
const CONTENT_WIDTH = RIGHT - LEFT
const DEVANAGARI = /[\u0900-\u097f\u20b9]/
const DOCUMENT_NOTE =
  'This branded summary is for customer reference and does not replace the signed license artifact. License validity is determined by the verified signed snapshot and the licensing authority.'

const splitText = (text: string) =>
  (text.match(/[\u0900-\u097f\u20b9]+|[^\u0900-\u097f\u20b9]+/gu) || [])
    .map((value) => ({ value, indic: DEVANAGARI.test(value) }))

const textWidth = (text: string, size: number, latin: PDFFont, indic: PDFFont) =>
  splitText(text).reduce(
    (width, segment) =>
      width + (segment.indic ? indic : latin).widthOfTextAtSize(segment.value, size),
    0,
  )

const drawText = (
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  size: number,
  color: PdfColor,
  latin: PDFFont,
  indic: PDFFont,
) => {
  let cursor = x
  for (const segment of splitText(text)) {
    const font = segment.indic ? indic : latin
    page.drawText(segment.value, { x: cursor, y, size, font, color })
    cursor += font.widthOfTextAtSize(segment.value, size)
  }
}

const drawSpacedText = (
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  size: number,
  color: PdfColor,
  latin: PDFFont,
  indic: PDFFont,
  letterSpacing = 1.1,
) => {
  let cursor = x
  for (const ch of Array.from(text)) {
    const font = DEVANAGARI.test(ch) ? indic : latin
    page.drawText(ch, { x: cursor, y, size, font, color })
    cursor += font.widthOfTextAtSize(ch, size) + letterSpacing
  }
  return cursor - x
}

const spacedTextWidth = (
  text: string,
  size: number,
  latin: PDFFont,
  indic: PDFFont,
  letterSpacing = 1.1,
) => {
  const chars = Array.from(text)
  if (!chars.length) return 0
  return (
    chars.reduce(
      (sum, ch) => sum + (DEVANAGARI.test(ch) ? indic : latin).widthOfTextAtSize(ch, size),
      0,
    ) +
    (chars.length - 1) * letterSpacing
  )
}

const drawRoundedRect = (
  page: PDFPage,
  options: {
    x: number
    y: number
    width: number
    height: number
    radius: number
    color?: PdfColor
    borderColor?: PdfColor
    borderWidth?: number
  },
) => {
  const { x, y, width: w, height: h, radius, color, borderColor, borderWidth } = options
  const r = Math.min(radius, w / 2, h / 2)
  // drawSvgPath interprets SVG coordinates relative to (x, y) top-left, downward +Y
  const path = [
    `M ${r} 0`,
    `L ${w - r} 0`,
    `Q ${w} 0 ${w} ${r}`,
    `L ${w} ${h - r}`,
    `Q ${w} ${h} ${w - r} ${h}`,
    `L ${r} ${h}`,
    `Q 0 ${h} 0 ${h - r}`,
    `L 0 ${r}`,
    `Q 0 0 ${r} 0`,
    'Z',
  ].join(' ')
  page.drawSvgPath(path, {
    x,
    y: y + h,
    color,
    borderColor,
    borderWidth,
  })
}

const wrapText = (text: string, maxWidth: number, size: number, latin: PDFFont, indic: PDFFont) => {
  const lines: string[] = []
  let line = ''
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    let remaining = word
    while (remaining) {
      const candidate = line ? `${line} ${remaining}` : remaining
      if (textWidth(candidate, size, latin, indic) <= maxWidth) {
        line = candidate
        remaining = ''
        continue
      }

      if (line) {
        lines.push(line)
        line = ''
        continue
      }

      let wordPart = ''
      let consumed = 0
      for (const character of Array.from(remaining)) {
        if (wordPart && textWidth(wordPart + character, size, latin, indic) > maxWidth) break
        wordPart += character
        consumed += character.length
      }
      if (!wordPart) {
        wordPart = Array.from(remaining)[0]
        consumed = wordPart.length
      }
      lines.push(wordPart)
      remaining = remaining.slice(consumed)
    }
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

const formatDate = (value: string | null, fallback = 'No expiry date recorded') => {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
}

const formatValidThrough = (expiresAt: string | null, licenseModel: string | null) => {
  if (!expiresAt && licenseModel?.toLowerCase().includes('perpetual')) {
    return 'Perpetual (No Expiry)'
  }
  return formatDate(expiresAt)
}

const formatModel = (value: string | null) =>
  value ? value.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Not recorded'

const sensitiveEntitlementKey = /(?:company\.binding|customer_id|organization_id|installation_id|activation_identifier|refresh|private|secret|token|password)/i

function safeEntitlementValue(value: unknown): unknown {
  if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') return value
  if (Array.isArray(value)) {
    return value
      .map(safeEntitlementValue)
      .filter((item) => item !== undefined && item !== null && item !== '')
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !sensitiveEntitlementKey.test(key))
        .map(([key, nestedValue]) => [key, safeEntitlementValue(nestedValue)])
        .filter(([, nestedValue]) => nestedValue !== undefined),
    )
  }
  return undefined
}

export function formatLicenseCertificateEntitlements(
  entitlements: Record<string, unknown> | null | undefined,
): LicenseCertificateEntitlement[] {
  if (!entitlements) return []
  return Object.entries(entitlements)
    .filter(([key]) => !sensitiveEntitlementKey.test(key) && key !== 'license.model')
    .map(([key, rawValue]) => {
      const value = safeEntitlementValue(rawValue)
      if (value === undefined || value === null || value === '') return null
      const displayValue = typeof value === 'boolean'
        ? value ? 'Yes' : 'No'
        : typeof value === 'number'
          ? new Intl.NumberFormat('en-IN').format(value)
          : typeof value === 'string'
            ? value
            : Array.isArray(value)
              ? value.map((item) => typeof item === 'string' ? item : JSON.stringify(item)).join(', ')
              : JSON.stringify(value)
      return {
        key: key.replace(/[._-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
        value: displayValue,
      }
    })
    .filter((item): item is LicenseCertificateEntitlement => item !== null)
}

export function getLicenseCertificateStatus(
  status: string | null,
  mode: string,
  expiresAt: string | null,
): string {
  const normalizedStatus = status?.trim().toUpperCase()
  if (normalizedStatus === 'ACTIVE' && expiresAt && expiresAt.slice(0, 10) < new Date().toISOString().slice(0, 10)) {
    return mode === 'grace' ? 'EXPIRED · GRACE PERIOD' : 'EXPIRED'
  }
  return normalizedStatus?.replace(/_/g, ' ') || 'NOT RECORDED'
}

export function describeLicenseCertificateStatus(status: string): string {
  if (status.startsWith('ACTIVE')) return 'License is valid and in use'
  if (status.includes('GRACE')) return 'License is within its grace period'
  if (status.includes('EXPIRED')) return 'License has expired'
  if (status.includes('SUSPENDED')) return 'License is suspended'
  if (status.includes('REVOKED')) return 'License has been revoked'
  if (status.includes('CANCELLED')) return 'License is cancelled'
  return 'Authority status not recorded'
}

export function formatLicenseCertificateDate(value: string | null, fallback = 'Not recorded'): string {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }).format(date)
}

export function formatLicenseCertificateValidThrough(
  expiresAt: string | null,
  licenseModel: string | null,
): string {
  if (!expiresAt && licenseModel?.toLowerCase().includes('perpetual')) {
    return 'Perpetual (No Expiry)'
  }
  return formatLicenseCertificateDate(expiresAt, 'No expiry date recorded')
}

export function formatLicenseCertificateDateTime(value: string | null): string {
  if (!value) return 'Not recorded'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
        timeZone: 'Asia/Kolkata',
        timeZoneName: 'short',
      }).format(date)
}

export async function createLicenseVerificationQrDataUrl(verificationUrl: string): Promise<string> {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(verificationUrl)
  } catch {
    throw new Error('The license verification URL is invalid.')
  }
  const isLocalHttp = parsedUrl.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsedUrl.hostname)
  if (parsedUrl.protocol !== 'https:' && !isLocalHttp) {
    throw new Error('License verification must use a secure HTTPS endpoint.')
  }
  return await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: 'Q',
    margin: 2,
    width: 256,
    color: { dark: '#0A214A', light: '#FFFFFF' },
  })
}

export function createLicenseCertificateFilename(data: Pick<LicenseCertificateData, 'institutionName' | 'serialNumber'>) {
  const source = data.serialNumber || data.institutionName || 'license'
  const safePart = source
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
  return `prathamone-license-${safePart || 'summary'}.pdf`
}

function qrDataUrlBytes(dataUrl: string): Uint8Array {
  const encoded = dataUrl.split(',')[1]
  if (!encoded) throw new Error('The license verification QR code could not be encoded.')
  return Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0))
}

async function fetchFont(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Unable to load the license document font (${response.status}).`)
  return new Uint8Array(await response.arrayBuffer())
}

function prepareSvgBounds(svgText: string, viewBox: string, width: number, height: number) {
  return svgText
    .replace(/\s+width="[^"]*"/, ` width="${width}"`)
    .replace(/\s+height="[^"]*"/, ` height="${height}"`)
    .replace(/\s+viewBox="[^"]*"/, ` viewBox="${viewBox}"`)
}

async function rasterizeSvgContent(svgContent: ArrayBuffer | string, label: string) {
  const imageUrl = URL.createObjectURL(new Blob([svgContent], { type: 'image/svg+xml' }))
  try {
    const image = new Image()
    image.src = imageUrl
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(image.naturalWidth, 1)
    canvas.height = Math.max(image.naturalHeight, 1)
    const context = canvas.getContext('2d')
    if (!context) throw new Error(`Unable to prepare ${label} for PDF output.`)
    context.drawImage(image, 0, 0)
    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error(`Unable to convert ${label} to PNG.`))),
        'image/png',
      )
    })
    return new Uint8Array(await png.arrayBuffer())
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
}

async function fetchSvgAsPng(
  url: string,
  label: string,
  transformSvg?: (svgText: string) => string,
) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Unable to load ${label} (${response.status}).`)
  const rawBuffer = await response.arrayBuffer()
  const svgContent = transformSvg
    ? transformSvg(new TextDecoder().decode(rawBuffer))
    : rawBuffer
  return rasterizeSvgContent(svgContent, label)
}

async function fetchProductLogo() {
  return fetchSvgAsPng('/artwork/25112026/widelogofinal/batch_g55.svg', 'the PrathamOne logo', (svgText) =>
    prepareSvgBounds(svgText, '-0.5 -0.5 83.59 19.09', 836, 191),
  )
}

async function fetchCertificateWatermark() {
  const response = await fetch('/artwork/25112026/widelogofinal/batch_g52-2-2-2_icon.svg')
  if (!response.ok) throw new Error(`Unable to load the certificate watermark (${response.status}).`)
  const rawSvg = new TextDecoder().decode(await response.arrayBuffer())
  const colorSvg = prepareSvgBounds(
    rawSvg,
    '-0.5 -0.5 27.22 18.41',
    544,
    368,
  )
  // Flat solid black 2D monochrome variant with zero transparency
  const monoSvg = colorSvg.replace(/fill:#[0-9a-fA-F]{3,8}/gi, 'fill:#000000')
  const [colorBytes, monoBytes] = await Promise.all([
    rasterizeSvgContent(colorSvg, 'the center watermark'),
    rasterizeSvgContent(monoSvg, 'the mono seal watermark'),
  ])
  return { colorBytes, monoBytes }
}

function drawCenterWatermark(
  page: PDFPage,
  watermark: Awaited<ReturnType<PDFDocument['embedPng']>>,
) {
  const size = watermark.scaleToFit(330, 219.45)
  page.drawImage(watermark, {
    x: (PAGE_WIDTH - size.width) / 2,
    y: 281.22,
    width: size.width,
    height: size.height,
    opacity: 0.055,
  })
}

function drawBottomMonoSeal(
  page: PDFPage,
  monoWatermark: Awaited<ReturnType<PDFDocument['embedPng']>>,
  centerY: number,
) {
  const size = monoWatermark.scaleToFit(44, 29)
  page.drawImage(monoWatermark, {
    x: 266 - size.width / 2,
    y: Math.max(50, centerY - size.height / 2),
    width: size.width,
    height: size.height,
    opacity: 1,
  })
}

async function fetchIssuerSignature() {
  const response = await fetch('/logo/license-issuer-signature.png')
  if (!response.ok) throw new Error(`Unable to load the authorized issuer signature (${response.status}).`)
  return new Uint8Array(await response.arrayBuffer())
}

function formatStatusTimestamp(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Asia/Kolkata',
    timeZoneName: 'short',
  }).format(date)
}

function drawHeader(
  page: PDFPage,
  edition: string | null,
  logo: Awaited<ReturnType<PDFDocument['embedPng']>>,
  latin: PDFFont,
  latinBold: PDFFont,
  indic: PDFFont,
  indicBold: PDFFont,
  continuation: boolean,
) {
  page.drawRectangle({ x: 0, y: 745.89, width: PAGE_WIDTH, height: 96, color: NAVY })
  page.drawRectangle({ x: 0, y: 742.89, width: PAGE_WIDTH, height: 3, color: ORANGE })

  const logoSize = logo.scaleToFit(202, 43)
  page.drawImage(logo, {
    x: 41.5,
    y: 745.89 + (96 - logoSize.height) / 2,
    width: logoSize.width,
    height: logoSize.height,
  })

  const editionText = (edition || 'EDITION NOT RECORDED').toUpperCase()
  const editionTextWidth = textWidth(editionText, 8, latinBold, indicBold)
  const pillWidth = Math.min(220, Math.max(166.58, editionTextWidth + 24))
  const pillX = RIGHT - pillWidth
  const pillY = 791.89
  const pillH = 22
  drawRoundedRect(page, {
    x: pillX,
    y: pillY,
    width: pillWidth,
    height: pillH,
    radius: 11,
    borderColor: PILL_BORDER,
    borderWidth: 0.8,
  })
  const clampedEdition = wrapText(editionText, pillWidth - 16, 8, latinBold, indicBold)[0] || editionText
  const clampedWidth = textWidth(clampedEdition, 8, latinBold, indicBold)
  drawText(
    page,
    clampedEdition,
    pillX + (pillWidth - clampedWidth) / 2,
    pillY + 8,
    8,
    WHITE,
    latinBold,
    indicBold,
  )

  const customerCopy = continuation
    ? 'Customer copy · Issued by PrathamOne EduOS (Continued)'
    : 'Customer copy · Issued by PrathamOne EduOS'
  drawText(
    page,
    customerCopy,
    RIGHT - textWidth(customerCopy, 7.5, latin, indic),
    774.3,
    7.5,
    HEADER_SUBTEXT,
    latin,
    indic,
  )
}

function statusColors(status: string) {
  if (status.startsWith('ACTIVE')) {
    return {
      foreground: rgb(0.102, 0.4941, 0.2941), // #1A7E4B
      circle: rgb(0.1059, 0.4980, 0.2941), // #1B7F4B
      background: rgb(0.9059, 0.9608, 0.9255), // #E7F5EC
      border: rgb(0.7255, 0.8784, 0.7843), // #B9E0C8
    }
  }
  if (status.includes('GRACE') || status === 'PENDING RENEWAL') {
    return {
      foreground: rgb(0.59, 0.34, 0.02),
      circle: rgb(0.68, 0.40, 0.04),
      background: rgb(1, 0.96, 0.88),
      border: rgb(0.93, 0.80, 0.56),
    }
  }
  if (['EXPIRED', 'SUSPENDED', 'CANCELLED', 'REVOKED'].includes(status)) {
    return {
      foreground: rgb(0.66, 0.12, 0.17),
      circle: rgb(0.72, 0.16, 0.21),
      background: rgb(1, 0.93, 0.93),
      border: rgb(0.93, 0.72, 0.74),
    }
  }
  return {
    foreground: MUTED,
    circle: MUTED,
    background: PALE,
    border: BORDER,
  }
}

function drawStatusMark(page: PDFPage, x: number, y: number, isActive: boolean, thickness = 1.6) {
  if (isActive) {
    const scale = thickness / 1.8
    page.drawLine({
      start: { x: x - 4.7 * scale, y },
      end: { x: x - 1.2 * scale, y: y - 3.4 * scale },
      thickness,
      color: WHITE,
    })
    page.drawLine({
      start: { x: x - 1.2 * scale, y: y - 3.4 * scale },
      end: { x: x + 4.8 * scale, y: y + 3.4 * scale },
      thickness,
      color: WHITE,
    })
    return
  }
  page.drawLine({
    start: { x, y: y - 3 },
    end: { x, y: y + 2.5 },
    thickness: 1.3,
    color: WHITE,
  })
  page.drawCircle({ x, y: y - 5.2, size: 0.8, color: WHITE })
}

function verificationHost(verificationUrl: string | null): string {
  if (!verificationUrl) return 'Licensing authority'
  try {
    return new URL(verificationUrl).host
  } catch {
    return 'Licensing authority'
  }
}

export async function createLicenseCertificatePdf(data: LicenseCertificateData): Promise<Blob> {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const [latinBytes, latinBoldBytes, indicBytes, indicBoldBytes, logoBytes, signatureBytes, watermarkAssets] =
    await Promise.all([
      fetchFont(latinFontUrl),
      fetchFont(latinBoldFontUrl),
      fetchFont(devanagariFontUrl),
      fetchFont(devanagariBoldFontUrl),
      fetchProductLogo(),
      fetchIssuerSignature(),
      fetchCertificateWatermark(),
    ])
  const [latin, latinBold, indic, indicBold, logo, issuerSignature, centerWatermark, monoSealWatermark] =
    await Promise.all([
      pdf.embedFont(latinBytes, { subset: true }),
      pdf.embedFont(latinBoldBytes, { subset: true }),
      pdf.embedFont(indicBytes, { subset: true }),
      pdf.embedFont(indicBoldBytes, { subset: true }),
      pdf.embedPng(logoBytes),
      pdf.embedPng(signatureBytes),
      pdf.embedPng(watermarkAssets.colorBytes),
      pdf.embedPng(watermarkAssets.monoBytes),
    ])
  const qrDataUrl = data.verificationUrl
    ? await createLicenseVerificationQrDataUrl(data.verificationUrl)
    : null
  const qrImage = qrDataUrl ? await pdf.embedPng(qrDataUrlBytes(qrDataUrl)) : null
  const status = getLicenseCertificateStatus(data.licenseStatus, data.mode, data.expiresAt)
  const statusColor = statusColors(status)
  const statusIsActive = status.startsWith('ACTIVE') || status.includes('GRACE')
  const generatedAt = data.generatedAt || new Date().toISOString()
  const entitlementSummary = groupLicenseCertificateEntitlements(data.entitlements)

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let cursor = 711.9
  drawHeader(page, data.edition, logo, latin, latinBold, indic, indicBold, false)

  const addPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    drawHeader(page, data.edition, logo, latin, latinBold, indic, indicBold, true)
    cursor = 711.9
  }
  const ensureSpace = (height: number, reserve = 44) => {
    if (cursor - height < 44 + reserve) addPage()
  }
  const drawParagraph = (
    text: string,
    x: number,
    width: number,
    size: number,
    color: PdfColor,
    lineHeight: number,
    useBold = false,
    reserve = 140,
  ) => {
    const fLatin = useBold ? latinBold : latin
    const fIndic = useBold ? indicBold : indic
    const lines = wrapText(text, width, size, fLatin, fIndic)
    lines.forEach((line) => {
      ensureSpace(lineHeight, reserve)
      drawText(page, line, x, cursor, size, color, fLatin, fIndic)
      cursor -= lineHeight
    })
  }

  // Hero label: orange rule + SOFTWARE LICENSE CERTIFICATE
  ensureSpace(95, 120)
  page.drawRectangle({ x: LEFT, y: cursor, width: 22, height: 2, color: ORANGE })
  drawSpacedText(
    page,
    'SOFTWARE LICENSE CERTIFICATE',
    LEFT + 30,
    cursor - 2.3,
    8,
    ORANGE,
    latinBold,
    indicBold,
    0.85,
  )
  cursor -= 26.5

  // Status badge on top-right beside Licensee block
  const statusSubtext = status.startsWith('ACTIVE')
    ? `Status as of ${formatStatusTimestamp(generatedAt)}`
    : describeLicenseCertificateStatus(status)
  const statusBoxWidth = Math.min(
    205,
    Math.max(
      170,
      textWidth(status, 13, latinBold, indicBold) + 52,
      textWidth(statusSubtext, 6.8, latin, indic) + 50,
    ),
  )
  const statusBoxHeight = 58
  const statusBoxTop = cursor + 2
  const statusBoxX = RIGHT - statusBoxWidth
  drawRoundedRect(page, {
    x: statusBoxX,
    y: statusBoxTop - statusBoxHeight,
    width: statusBoxWidth,
    height: statusBoxHeight,
    radius: 6,
    color: statusColor.background,
    borderColor: statusColor.border,
    borderWidth: 0.8,
  })
  const badgeCircleX = statusBoxX + 22
  const badgeCircleY = statusBoxTop - 29
  page.drawCircle({ x: badgeCircleX, y: badgeCircleY, size: 10, color: statusColor.circle })
  drawStatusMark(page, badgeCircleX, badgeCircleY, statusIsActive, 1.8)
  drawText(
    page,
    status,
    statusBoxX + 40,
    statusBoxTop - 25.5,
    13,
    statusColor.foreground,
    latinBold,
    indicBold,
  )
  drawText(
    page,
    statusSubtext,
    statusBoxX + 40,
    statusBoxTop - 39,
    6.8,
    MUTED,
    latin,
    indic,
  )

  // Left: LICENSED TO + Institution Name + Address
  const heroTextWidth = CONTENT_WIDTH - statusBoxWidth - 20
  drawText(page, 'LICENSED TO', LEFT, cursor, 7.5, MUTED, latin, indic)
  const orgName = data.institutionName || 'Organization name not recorded'
  const orgFontSize = textWidth(orgName, 27, latinBold, indicBold) <= heroTextWidth ? 27 : 20
  const orgLineHeight = orgFontSize === 27 ? 31 : 24
  cursor -= orgFontSize === 27 ? 27 : 22
  drawParagraph(orgName, LEFT, heroTextWidth, orgFontSize, NAVY_TEXT, orgLineHeight, true, 120)
  cursor += orgLineHeight - 17
  if (data.institutionAddress?.trim()) {
    drawParagraph(data.institutionAddress, LEFT, heroTextWidth, 9.5, MUTED, 12.5, false, 120)
  }
  cursor = Math.min(cursor, statusBoxTop - statusBoxHeight) - 24

  // Three Summary Cards: PRODUCT EDITION | LICENSE MODEL | VALID THROUGH
  const summaryCards = [
    { label: 'PRODUCT EDITION', value: data.edition || 'Not recorded', width: 180, accent: NAVY },
    { label: 'LICENSE MODEL', value: formatModel(data.licenseModel), width: 175, accent: NAVY },
    { label: 'VALID THROUGH', value: formatValidThrough(data.expiresAt, data.licenseModel), width: 140.28, accent: ORANGE },
  ]
  const cardGap = 10
  const cardValueLines = summaryCards.map((card) =>
    wrapText(card.value, card.width - 20, 11.5, latinBold, indicBold),
  )
  const maxCardLines = Math.max(...cardValueLines.map((lines) => lines.length))
  const summaryCardHeight = Math.max(50, 32 + maxCardLines * 14)
  ensureSpace(summaryCardHeight + 16, 120)

  let cardX = LEFT
  summaryCards.forEach((card, cardIndex) => {
    const cardBottom = cursor - summaryCardHeight
    page.drawRectangle({
      x: cardX,
      y: cardBottom,
      width: card.width,
      height: summaryCardHeight,
      color: CARD_BG,
      borderColor: BORDER,
      borderWidth: 0.6,
    })
    page.drawRectangle({
      x: cardX,
      y: cardBottom,
      width: 3,
      height: summaryCardHeight,
      color: card.accent,
    })
    drawText(page, card.label, cardX + 14, cursor - 16, 7, MUTED, latin, indic)
    cardValueLines[cardIndex].forEach((line, lineIndex) => {
      drawText(
        page,
        line,
        cardX + 14,
        cursor - 36 - lineIndex * 14,
        11.5,
        NAVY_TEXT,
        latinBold,
        indicBold,
      )
    })
    cardX += card.width + cardGap
  })
  cursor -= summaryCardHeight + 24

  // ENTITLEMENTS Section
  const entitlementCols = entitlementSummary.groups.map((group) => ({
    label: group.label.toUpperCase(),
    value: group.value === 'Not recorded in signed snapshot' ? 'Not recorded' : group.value,
    isFallback: group.value === 'Not recorded in signed snapshot',
  }))
  const entitlementColWidth = CONTENT_WIDTH / entitlementCols.length
  const entitlementValueLines = entitlementCols.map(({ value }) =>
    wrapText(value, entitlementColWidth - 22, 10, latin, indic),
  )
  const entitlementBoxHeight = Math.max(
    50,
    30 + Math.max(...entitlementValueLines.map((lines) => lines.length)) * 12,
  )
  ensureSpace(22 + entitlementBoxHeight + 18, 120)

  const entTitleWidth = drawSpacedText(
    page,
    'ENTITLEMENTS',
    LEFT,
    cursor,
    8,
    NAVY_TEXT,
    latinBold,
    indicBold,
    1.1,
  )
  page.drawLine({
    start: { x: LEFT + entTitleWidth + 6, y: cursor + 2.5 },
    end: { x: RIGHT, y: cursor + 2.5 },
    thickness: 0.6,
    color: BORDER,
  })
  cursor -= 15

  const entBoxBottom = cursor - entitlementBoxHeight
  page.drawRectangle({
    x: LEFT,
    y: entBoxBottom,
    width: CONTENT_WIDTH,
    height: entitlementBoxHeight,
    color: WHITE,
    borderColor: BORDER,
    borderWidth: 0.6,
  })
  entitlementCols.forEach((col, index) => {
    const colX = LEFT + index * entitlementColWidth
    if (index > 0) {
      page.drawLine({
        start: { x: colX, y: cursor },
        end: { x: colX, y: entBoxBottom },
        thickness: 0.6,
        color: BORDER,
      })
    }
    drawText(page, col.label, colX + 12, cursor - 17, 7, MUTED, latin, indic)
    const valColor = col.isFallback ? SUBTLE_MUTED : NAVY_TEXT
    entitlementValueLines[index].forEach((line, lineIndex) => {
      drawText(page, line, colX + 12, cursor - 35 - lineIndex * 12, 10, valColor, latin, indic)
    })
  })
  cursor = entBoxBottom - 13

  if (entitlementCols.some((col) => col.isFallback)) {
    drawText(
      page,
      'Entitlement scope is not stated in the signed snapshot. Refer to the signed license artifact for the authoritative terms.',
      LEFT,
      cursor,
      7.5,
      MUTED,
      latin,
      indic,
    )
    cursor -= 12
  }
  if (entitlementSummary.other.length) {
    const otherText = entitlementSummary.other.map(({ key, value }) => `${key}: ${value}`).join(' · ')
    drawText(page, 'OTHER SIGNED ENTITLEMENTS', LEFT, cursor, 6.5, NAVY_TEXT, latinBold, indicBold)
    cursor -= 11
    drawParagraph(otherText, LEFT, CONTENT_WIDTH, 7.5, MUTED, 10, false, 120)
  }
  cursor -= 16

  // LICENSE RECORD & VERIFICATION Section
  const identification = [
    ['LICENSE SERIAL', data.serialNumber || 'Not recorded'],
    ['LICENSE ID', data.licenseId || 'Not recorded'],
    ['REGISTERED EMAIL ID', data.registeredEmail?.trim() || 'Not recorded'],
    ['SIGNED DOCUMENT REF.', data.documentId],
    ['CERTIFICATE GENERATED', formatLicenseCertificateDateTime(generatedAt)],
    ...(data.issuedAt ? [['LICENSE ISSUED', formatDate(data.issuedAt, 'Not recorded')]] : []),
  ]
  const qrCardWidth = 152
  const qrCardHeight = 136
  const qrX = RIGHT - qrCardWidth
  const recordRight = qrX - 16 // 387.28
  const recordValueX = 178
  const recordValueWidth = recordRight - recordValueX - 4

  ensureSpace(22 + qrCardHeight, 110)
  const recTitleWidth = drawSpacedText(
    page,
    'LICENSE RECORD & VERIFICATION',
    LEFT,
    cursor,
    8,
    NAVY_TEXT,
    latinBold,
    indicBold,
    1.05,
  )
  page.drawLine({
    start: { x: LEFT + recTitleWidth + 6, y: cursor + 2.5 },
    end: { x: RIGHT, y: cursor + 2.5 },
    thickness: 0.6,
    color: BORDER,
  })
  cursor -= 15

  const idSectionTop = cursor
  let qrCardPage = page

  // Record Table Rows: one consistent font style across all values
  for (const [label, value] of identification) {
    const valueLines = wrapText(value, recordValueWidth, 9, latin, indic)
    const rowHeight = Math.max(26, 15 + valueLines.length * 11)
    ensureSpace(rowHeight, 110)
    const rowBottom = cursor - rowHeight
    page.drawCircle({ x: LEFT + 3, y: cursor - 14, size: 2.2, color: ORANGE })
    drawText(page, label, LEFT + 12, cursor - 17, 7, MUTED, latin, indic)
    valueLines.forEach((line, lineIndex) => {
      drawText(
        page,
        line,
        recordValueX,
        cursor - 17.5 - lineIndex * 11,
        9,
        VALUE_INK,
        latin,
        indic,
      )
    })
    page.drawLine({
      start: { x: LEFT, y: rowBottom },
      end: { x: recordRight, y: rowBottom },
      thickness: 0.5,
      color: BORDER,
    })
    cursor = rowBottom
  }
  cursor = Math.min(cursor, idSectionTop - qrCardHeight) - 10

  // DOCUMENT NOTE Box
  const noteLines = wrapText(DOCUMENT_NOTE, CONTENT_WIDTH - 28, 7.8, latin, indic)
  const noteHeight = Math.max(44, 24 + noteLines.length * 10)
  ensureSpace(noteHeight + 16, 70)
  const noteBottom = cursor - noteHeight
  page.drawRectangle({
    x: LEFT,
    y: noteBottom,
    width: CONTENT_WIDTH,
    height: noteHeight,
    color: CARD_BG,
    borderColor: BORDER,
    borderWidth: 0.5,
  })
  page.drawRectangle({
    x: LEFT,
    y: noteBottom,
    width: 3,
    height: noteHeight,
    color: GOLD,
  })
  drawText(page, 'DOCUMENT NOTE', LEFT + 14, cursor - 15, 7, NAVY_TEXT, latinBold, indicBold)
  noteLines.forEach((line, index) => {
    drawText(page, line, LEFT + 14, cursor - 26.5 - index * 10, 7.8, MUTED, latin, indic)
  })
  cursor = noteBottom - 30

  // Signatory Section (and place subtle watermark safely in the open seal gap)
  ensureSpace(70, 0)
  page.drawLine({
    start: { x: LEFT, y: cursor },
    end: { x: RIGHT, y: cursor },
    thickness: 0.5,
    color: BORDER,
  })
  const signerTop = cursor - 16
  const badgeColor = statusColors('ACTIVE')
  drawRoundedRect(page, {
    x: LEFT,
    y: signerTop - 26,
    width: 176,
    height: 26,
    radius: 4,
    color: badgeColor.background,
    borderColor: badgeColor.border,
    borderWidth: 0.5,
  })
  const issuerCircleY = signerTop - 13
  page.drawCircle({ x: LEFT + 15, y: issuerCircleY, size: 6.5, color: badgeColor.circle })
  drawStatusMark(page, LEFT + 15, issuerCircleY, true, 1.4)
  drawText(
    page,
    'Authorized License Issuer',
    LEFT + 28,
    signerTop - 16,
    8.5,
    badgeColor.foreground,
    latin,
    indic,
  )
  drawText(
    page,
    'For PrathamOne EduOS · Powered by SmritiSys',
    LEFT,
    signerTop - 40,
    7,
    MUTED,
    latin,
    indic,
  )

  const signatureSize = issuerSignature.scaleToFit(112, 52.5)
  const sigImgX = RIGHT - signatureSize.width
  const sigTextRight = sigImgX - 8
  const authLabel = 'AUTHORIZED SIGNATORY'
  const authLabelW = spacedTextWidth(authLabel, 7, latin, indic, 0.8)
  drawSpacedText(
    page,
    authLabel,
    sigTextRight - authLabelW,
    signerTop + 2,
    7,
    MUTED,
    latin,
    indic,
    0.8,
  )
  const signerName = 'Jawahar R. Mallah'
  const signerNameW = textWidth(signerName, 13, latinBold, indicBold)
  drawText(
    page,
    signerName,
    sigTextRight - signerNameW,
    signerTop - 19,
    13,
    NAVY_TEXT,
    latinBold,
    indicBold,
  )
  const attrib = 'Product Architect · SmritiSys & AITDL Networks'
  const attribW = textWidth(attrib, 7.5, latin, indic)
  drawText(page, attrib, sigTextRight - attribW, signerTop - 32, 7.5, MUTED, latin, indic)
  page.drawImage(issuerSignature, {
    x: sigImgX,
    y: signerTop - 45,
    width: signatureSize.width,
    height: signatureSize.height,
  })

  // Bottom center seal in opaque 2D monochrome (zero transparency)
  drawBottomMonoSeal(page, monoSealWatermark, signerTop - 18)

  // Center watermark on each page matching the uploaded reference format, with QR card drawn cleanly once on top
  const pages = pdf.getPages()
  pages.forEach((currentPage) => drawCenterWatermark(currentPage, centerWatermark))

  drawRoundedRect(qrCardPage, {
    x: qrX,
    y: idSectionTop - qrCardHeight,
    width: qrCardWidth,
    height: qrCardHeight,
    radius: 5,
    color: WHITE,
    borderColor: BORDER,
    borderWidth: 0.6,
  })
  if (qrImage) {
    qrCardPage.drawImage(qrImage, {
      x: qrX + (qrCardWidth - 84) / 2,
      y: idSectionTop - 14 - 84,
      width: 84,
      height: 84,
    })
    const caption = 'Scan to verify this license'
    const captionW = textWidth(caption, 8, latinBold, indicBold)
    drawText(
      qrCardPage,
      caption,
      qrX + (qrCardWidth - captionW) / 2,
      idSectionTop - 112,
      8,
      NAVY_TEXT,
      latinBold,
      indicBold,
    )
    const hostLabel = verificationHost(data.verificationUrl)
    const hostW = textWidth(hostLabel, 7.5, latin, indic)
    drawText(
      qrCardPage,
      hostLabel,
      qrX + (qrCardWidth - hostW) / 2,
      idSectionTop - 123,
      7.5,
      MUTED,
      latin,
      indic,
    )
  } else {
    const lines = ['Secure authority', 'verification QR', 'not configured']
    lines.forEach((line, idx) => {
      const lw = textWidth(line, 7.5, latin, indic)
      drawText(qrCardPage, line, qrX + (qrCardWidth - lw) / 2, idSectionTop - 54 - idx * 12, 7.5, MUTED, latin, indic)
    })
  }

  const footerLogoSize = logo.scaleToFit(92, 20)
  pages.forEach((currentPage, index) => {
    currentPage.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: 34, color: NAVY })
    currentPage.drawRectangle({ x: 0, y: 34, width: PAGE_WIDTH, height: 2, color: ORANGE })
    drawText(currentPage, 'www.prathamone.com', LEFT, 13, 7.5, FOOTER_TEXT, latin, indic)
    currentPage.drawImage(logo, {
      x: (PAGE_WIDTH - footerLogoSize.width) / 2,
      y: (34 - footerLogoSize.height) / 2,
      width: footerLogoSize.width,
      height: footerLogoSize.height,
    })
    const footerLabel =
      pages.length > 1
        ? `PrathamOne EduOS · Powered by SmritiSys · ${index + 1} / ${pages.length}`
        : 'PrathamOne EduOS · Powered by SmritiSys'
    drawText(
      currentPage,
      footerLabel,
      RIGHT - textWidth(footerLabel, 7.5, latin, indic),
      13,
      7.5,
      FOOTER_TEXT,
      latin,
      indic,
    )
  })

  pdf.setTitle('PrathamOne EduOS Software License Certificate')
  pdf.setAuthor('PrathamOne EduOS')
  pdf.setSubject('Customer-facing software license summary')
  pdf.setCreator('PrathamOne EduOS')

  const bytes = await pdf.save()
  return new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/pdf' })
}

export function downloadLicenseCertificatePdf(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => window.URL.revokeObjectURL(url), 0)
}

export async function shareLicenseCertificatePdf(
  blob: Blob,
  filename: string,
  institutionName: string,
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  if (typeof navigator !== 'undefined' && typeof File !== 'undefined' && navigator.share && navigator.canShare) {
    const file = new File([blob], filename, { type: 'application/pdf' })
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'PrathamOne EduOS License Certificate',
          text: `Software license summary for ${institutionName}.`,
        })
        return 'shared'
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return 'cancelled'
        throw error
      }
    }
  }

  downloadLicenseCertificatePdf(blob, filename)
  return 'downloaded'
}
