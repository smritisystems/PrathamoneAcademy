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
 * @updated     2026-11-24
 *
 * @description Generates and shares a customer-facing PrathamOne software license certificate.
 */

import 'regenerator-runtime/runtime'
import fontkit from '@pdf-lib/fontkit'
import latinFontUrl from '@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-latin-400-normal.woff?url'
import devanagariFontUrl from '@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-400-normal.woff?url'
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import QRCode from 'qrcode'

export interface LicenseCertificateEntitlement {
  key: string
  value: string
}

export interface LicenseCertificateData {
  institutionName: string
  institutionAddress: string | null
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
  { label: 'Licensed Users', matches: /user|seat/ },
  { label: 'Branches / locations', matches: /branch|location|site/ },
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
const NAVY = rgb(0.04, 0.13, 0.29)
const BLUE = rgb(0.05, 0.23, 0.48)
const ORANGE = rgb(0.95, 0.31, 0.02)
const GOLD = rgb(0.98, 0.65, 0.14)
const TEXT = rgb(0.10, 0.15, 0.23)
const MUTED = rgb(0.38, 0.43, 0.50)
const PALE = rgb(0.96, 0.97, 0.99)
const WHITE = rgb(1, 1, 1)
const LEFT = 40
const RIGHT = PAGE_WIDTH - LEFT
const CONTENT_WIDTH = RIGHT - LEFT
const DEVANAGARI = /[\u0900-\u097f\u20b9]/
const DOCUMENT_NOTE =
  'This branded summary is provided for customer reference and is not a replacement for the signed license artifact. License validity is determined by the verified signed snapshot and licensing authority.'

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

async function fetchProductLogo() {
  const response = await fetch('/logo/logoone256.png')
  if (!response.ok) throw new Error(`Unable to load the PrathamOne logo (${response.status}).`)
  return new Uint8Array(await response.arrayBuffer())
}

async function fetchIssuerSignature() {
  const response = await fetch('/logo/license-issuer-signature.png')
  if (!response.ok) throw new Error(`Unable to load the authorized issuer signature (${response.status}).`)
  return new Uint8Array(await response.arrayBuffer())
}

function drawHeader(
  page: PDFPage,
  model: string | null,
  edition: string | null,
  logo: Awaited<ReturnType<PDFDocument['embedPng']>>,
  latin: PDFFont,
  indic: PDFFont,
  continuation: boolean,
) {
  page.drawRectangle({ x: 0, y: 694, width: PAGE_WIDTH, height: 148, color: NAVY })
  page.drawRectangle({ x: 0, y: 689, width: PAGE_WIDTH, height: 5, color: ORANGE })
  page.drawRectangle({ x: 36, y: 774, width: 214, height: 43, color: WHITE })
  const logoSize = logo.scaleToFit(206, 35)
  page.drawImage(logo, {
    x: 40 + (206 - logoSize.width) / 2,
    y: 778 + (35 - logoSize.height) / 2,
    width: logoSize.width,
    height: logoSize.height,
  })
  page.drawLine({
    start: { x: 267, y: 772 },
    end: { x: 267, y: 816 },
    thickness: 0.7,
    color: rgb(0.78, 0.84, 0.92),
  })
  const editionLines = wrapText((edition || 'EDITION NOT RECORDED').toUpperCase(), 145, 7.2, latin, indic).slice(0, 2)
  editionLines.forEach((line, index) =>
    drawText(page, line, 282, 800 - index * 10, 7.2, rgb(0.88, 0.91, 0.96), latin, indic),
  )
  drawText(page, 'SOFTWARE LICENSE', 36, 754, 8.5, GOLD, latin, indic)
  drawText(page, continuation ? 'License Certificate · Continued' : 'License Certificate', 36, 726, 21, WHITE, latin, indic)
  drawText(page, 'Customer Copy · Issued by PrathamOne EduOS', 36, 705, 7.5, rgb(0.88, 0.91, 0.96), latin, indic)

  page.drawCircle({ x: 526, y: 774, size: 42, color: GOLD, borderColor: rgb(1, 0.82, 0.35), borderWidth: 2 })
  page.drawCircle({ x: 526, y: 774, size: 35, color: rgb(1, 0.79, 0.25), borderColor: rgb(0.61, 0.35, 0.02), borderWidth: 0.8 })
  const badgeLabel = model?.toLowerCase().includes('perpetual')
    ? 'PERPETUAL LICENSE'
    : formatModel(model).toUpperCase()
  const modelLines = wrapText(badgeLabel, 61, 6.4, latin, indic).slice(0, 3)
  modelLines.forEach((line, index) => {
    const x = 526 - textWidth(line, 6.4, latin, indic) / 2
    drawText(page, line, x, 781 - index * 8, 6.4, NAVY, latin, indic)
  })
}

function statusColors(status: string) {
  if (status.startsWith('ACTIVE')) return { foreground: rgb(0.08, 0.45, 0.31), background: rgb(0.91, 0.96, 0.94) }
  if (status.includes('GRACE') || status === 'PENDING RENEWAL') {
    return { foreground: rgb(0.59, 0.34, 0.02), background: rgb(1, 0.96, 0.88) }
  }
  if (['EXPIRED', 'SUSPENDED', 'CANCELLED', 'REVOKED'].includes(status)) {
    return { foreground: rgb(0.66, 0.12, 0.17), background: rgb(1, 0.93, 0.93) }
  }
  return { foreground: MUTED, background: PALE }
}

function drawStatusMark(page: PDFPage, x: number, y: number, isActive: boolean) {
  if (isActive) {
    page.drawLine({
      start: { x: x - 4, y },
      end: { x: x - 1, y: y - 3 },
      thickness: 1.2,
      color: WHITE,
    })
    page.drawLine({
      start: { x: x - 1, y: y - 3 },
      end: { x: x + 4, y: y + 3 },
      thickness: 1.2,
      color: WHITE,
    })
    return
  }
  page.drawLine({
    start: { x, y: y - 3 },
    end: { x, y: y + 2 },
    thickness: 1.1,
    color: WHITE,
  })
  page.drawCircle({ x, y: y - 5, size: 0.7, color: WHITE })
}

export async function createLicenseCertificatePdf(data: LicenseCertificateData): Promise<Blob> {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const [latinBytes, indicBytes, logoBytes, signatureBytes] = await Promise.all([
    fetchFont(latinFontUrl),
    fetchFont(devanagariFontUrl),
    fetchProductLogo(),
    fetchIssuerSignature(),
  ])
  const [latin, indic, logo, issuerSignature] = await Promise.all([
    pdf.embedFont(latinBytes, { subset: true }),
    pdf.embedFont(indicBytes, { subset: true }),
    pdf.embedPng(logoBytes),
    pdf.embedPng(signatureBytes),
  ])
  const qrDataUrl = data.verificationUrl
    ? await createLicenseVerificationQrDataUrl(data.verificationUrl)
    : null
  const qrImage = qrDataUrl ? await pdf.embedPng(qrDataUrlBytes(qrDataUrl)) : null
  const status = getLicenseCertificateStatus(data.licenseStatus, data.mode, data.expiresAt)
  const statusColor = statusColors(status)
  const generatedAt = data.generatedAt || new Date().toISOString()
  const entitlementSummary = groupLicenseCertificateEntitlements(data.entitlements)
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let cursor = 670
  drawHeader(page, data.licenseModel, data.edition, logo, latin, indic, false)

  const addPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    drawHeader(page, data.licenseModel, data.edition, logo, latin, indic, true)
    cursor = 670
  }
  const ensureSpace = (height: number, reserve = 45) => {
    if (cursor - height < 42 + reserve) addPage()
  }
  const drawParagraph = (
    text: string,
    x: number,
    width: number,
    size: number,
    color: PdfColor,
    lineHeight: number,
    reserve = 160,
  ) => {
    const lines = wrapText(text, width, size, latin, indic)
    lines.forEach((line) => {
      ensureSpace(lineHeight, reserve)
      drawText(page, line, x, cursor, size, color, latin, indic)
      cursor -= lineHeight
    })
  }

  ensureSpace(68, 160)
  drawText(page, 'LICENSED TO', LEFT, cursor, 7.5, BLUE, latin, indic)
  const statusWidth = Math.min(155, Math.max(84, textWidth(status, 8, latin, indic) + 24))
  page.drawRectangle({
    x: RIGHT - statusWidth,
    y: cursor - 52,
    width: statusWidth,
    height: 44,
    color: statusColor.background,
    borderColor: rgb(0.76, 0.88, 0.82),
    borderWidth: 0.7,
  })
  const statusCenterX = RIGHT - statusWidth + 18
  const statusCenterY = cursor - 30
  const statusIsActive = status.startsWith('ACTIVE') || status.includes('GRACE')
  page.drawCircle({ x: statusCenterX, y: statusCenterY, size: 9, color: statusColor.foreground })
  drawStatusMark(page, statusCenterX, statusCenterY, statusIsActive)
  drawText(page, status, RIGHT - statusWidth + 32, cursor - 27, 8, statusColor.foreground, latin, indic)
  drawText(page, describeLicenseCertificateStatus(status), RIGHT - statusWidth + 32, cursor - 39, 5.7, TEXT, latin, indic)
  cursor -= 17
  drawParagraph(data.institutionName || 'Organization name not recorded', LEFT, CONTENT_WIDTH - statusWidth - 25, 16, NAVY, 19)
  if (data.institutionAddress?.trim()) {
    drawParagraph(data.institutionAddress, LEFT, CONTENT_WIDTH - statusWidth - 25, 8.5, MUTED, 11)
  }
  cursor -= 23

  const summary = [
    ['LICENSE STATUS', status],
    ['PRODUCT EDITION', data.edition || 'Not recorded'],
    ['LICENSE MODEL', formatModel(data.licenseModel)],
    ['VALID THROUGH', formatDate(data.expiresAt)],
  ]
  const summaryGap = 9
  const cardWidth = (CONTENT_WIDTH - summaryGap) / 2
  for (let index = 0; index < summary.length; index += 2) {
    const pair = summary.slice(index, index + 2)
    const valueLines = pair.map(([, value]) => wrapText(value, cardWidth - 42, 9.5, latin, indic))
    const cardHeight = Math.max(50, 25 + Math.max(...valueLines.map((lines) => lines.length)) * 11)
    ensureSpace(cardHeight + 7, 160)
    pair.forEach(([label], cardIndex) => {
      const x = LEFT + cardIndex * (cardWidth + summaryGap)
      const lines = valueLines[cardIndex]
      page.drawRectangle({
        x,
        y: cursor - cardHeight,
        width: cardWidth,
        height: cardHeight,
        color: rgb(0.94, 0.96, 1),
        borderColor: rgb(0.79, 0.85, 0.96),
        borderWidth: 0.8,
      })
      const iconCenterX = x + 18
      const iconCenterY = cursor - cardHeight / 2
      const summaryIndex = index + cardIndex
      page.drawCircle({ x: iconCenterX, y: iconCenterY, size: 11, color: BLUE })
      if (summaryIndex === 0) {
        drawStatusMark(page, iconCenterX, iconCenterY, statusIsActive)
      } else if (summaryIndex === 1) {
        for (const row of [0, 1]) {
          for (const column of [0, 1]) {
            page.drawRectangle({
              x: iconCenterX - 4 + column * 5,
              y: iconCenterY - 4 + row * 5,
              width: 3,
              height: 3,
              color: WHITE,
            })
          }
        }
      } else if (summaryIndex === 2) {
        page.drawCircle({ x: iconCenterX, y: iconCenterY, size: 6, borderColor: WHITE, borderWidth: 1.6 })
        page.drawCircle({ x: iconCenterX, y: iconCenterY, size: 2, color: WHITE })
      } else {
        page.drawRectangle({
          x: iconCenterX - 5,
          y: iconCenterY - 5,
          width: 10,
          height: 10,
          color: WHITE,
        })
        page.drawRectangle({
          x: iconCenterX - 3.5,
          y: iconCenterY - 3.5,
          width: 7,
          height: 7,
          color: BLUE,
        })
        page.drawLine({
          start: { x: iconCenterX - 4, y: iconCenterY + 2 },
          end: { x: iconCenterX + 4, y: iconCenterY + 2 },
          thickness: 1,
          color: WHITE,
        })
      }
      drawText(page, label, x + 36, cursor - 14, 6.7, BLUE, latin, indic)
      lines.forEach((line, lineIndex) =>
        drawText(page, line, x + 36, cursor - 27 - lineIndex * 10, 9, TEXT, latin, indic),
      )
    })
    cursor -= cardHeight + 10
  }

  const entitlementHeaderHeight = 19
  const entitlementColumnWidth = CONTENT_WIDTH / entitlementSummary.groups.length
  const entitlementValueLines = entitlementSummary.groups.map(({ value }) =>
    wrapText(value, entitlementColumnWidth - 15, 7.4, latin, indic),
  )
  const entitlementHeight = Math.max(62, 22 + Math.max(...entitlementValueLines.map((lines) => lines.length)) * 9)
  ensureSpace(entitlementHeaderHeight + entitlementHeight, 155)
  page.drawRectangle({
    x: LEFT,
    y: cursor - entitlementHeaderHeight,
    width: CONTENT_WIDTH,
    height: entitlementHeaderHeight,
    color: NAVY,
  })
  drawText(page, 'LICENSE ENTITLEMENT DETAILS', LEFT + 10, cursor - 13, 7.2, WHITE, latin, indic)
  cursor -= entitlementHeaderHeight
  page.drawRectangle({
    x: LEFT,
    y: cursor - entitlementHeight,
    width: CONTENT_WIDTH,
    height: entitlementHeight,
    color: WHITE,
    borderColor: rgb(0.82, 0.87, 0.94),
    borderWidth: 0.7,
  })
  entitlementSummary.groups.forEach(({ label }, index) => {
    const x = LEFT + index * entitlementColumnWidth
    if (index > 0) {
      page.drawLine({
        start: { x, y: cursor },
        end: { x, y: cursor - entitlementHeight },
        thickness: 0.6,
        color: rgb(0.75, 0.81, 0.9),
      })
    }
    drawText(page, label.toUpperCase(), x + 7, cursor - 13, 5.7, BLUE, latin, indic)
    entitlementValueLines[index].forEach((line, lineIndex) =>
      drawText(page, line, x + 7, cursor - 27 - lineIndex * 9, 7.2, TEXT, latin, indic),
    )
  })
  cursor -= entitlementHeight + 12
  if (entitlementSummary.other.length) {
    const otherText = entitlementSummary.other.map(({ key, value }) => `${key}: ${value}`).join(' · ')
    drawText(page, 'OTHER SIGNED ENTITLEMENTS', LEFT, cursor, 6.4, BLUE, latin, indic)
    cursor -= 11
    drawParagraph(otherText, LEFT, CONTENT_WIDTH, 7.1, TEXT, 9, 155)
    cursor -= 5
  }

  const identification = [
    ['LICENSE SERIAL', data.serialNumber || 'Not recorded'],
    ['LICENSE ID', data.licenseId || 'Not recorded'],
    ['SIGNED DOCUMENT REFERENCE', data.documentId],
    ['CERTIFICATE GENERATED ON', formatLicenseCertificateDateTime(generatedAt)],
    ...(data.issuedAt ? [['LICENSE ISSUED ON', formatDate(data.issuedAt, 'Not recorded')]] : []),
  ]
  const qrCardHeight = 116
  ensureSpace(qrCardHeight, 145)
  const idSectionTop = cursor
  const qrX = RIGHT - 106
  page.drawLine({
    start: { x: qrX - 10, y: idSectionTop + 3 },
    end: { x: qrX - 10, y: idSectionTop - qrCardHeight },
    thickness: 0.8,
    color: rgb(0.42, 0.61, 0.9),
  })
  page.drawRectangle({
    x: qrX,
    y: idSectionTop - qrCardHeight,
    width: 106,
    height: qrCardHeight,
    color: WHITE,
    borderColor: rgb(0.82, 0.87, 0.94),
    borderWidth: 0.7,
  })
  drawText(page, 'VERIFY LICENSE', qrX + 12, idSectionTop - 12, 6.8, BLUE, latin, indic)
  if (qrImage) {
    page.drawImage(qrImage, { x: qrX + 19, y: idSectionTop - 93, width: 68, height: 68 })
    drawText(page, 'Scan to verify', qrX + 24, idSectionTop - 103, 6, BLUE, latin, indic)
  } else {
    drawText(page, 'Secure authority', qrX + 12, idSectionTop - 47, 6.4, MUTED, latin, indic)
    drawText(page, 'verification QR', qrX + 12, idSectionTop - 58, 6.4, MUTED, latin, indic)
    drawText(page, 'not configured', qrX + 12, idSectionTop - 69, 6.4, MUTED, latin, indic)
  }
  const idLabelWidth = 153
  for (const [label, value] of identification) {
    const lines = wrapText(value, qrX - LEFT - idLabelWidth - 16, 7.4, latin, indic)
    const rowHeight = Math.max(13, lines.length * 9)
    ensureSpace(rowHeight, 145)
    page.drawCircle({ x: LEFT + 4, y: cursor - 2, size: 3.2, color: BLUE })
    drawText(page, label, LEFT + 13, cursor, 6.2, BLUE, latin, indic)
    drawText(page, ':', LEFT + idLabelWidth, cursor, 7, MUTED, latin, indic)
    lines.forEach((line, lineIndex) =>
      drawText(page, line, LEFT + idLabelWidth + 9, cursor - lineIndex * 9, 7.4, TEXT, latin, indic),
    )
    cursor -= rowHeight + 2
  }
  cursor = Math.min(cursor, idSectionTop - qrCardHeight - 4)

  const noteLines = wrapText(DOCUMENT_NOTE, CONTENT_WIDTH - 44, 7.2, latin, indic)
  const noteHeight = Math.max(54, 27 + noteLines.length * 11)
  ensureSpace(noteHeight + 8, 77)
  page.drawRectangle({
    x: LEFT,
    y: cursor - noteHeight,
    width: CONTENT_WIDTH,
    height: noteHeight,
    color: rgb(0.94, 0.96, 1),
    borderColor: rgb(0.85, 0.89, 0.96),
    borderWidth: 0.6,
  })
  page.drawCircle({ x: LEFT + 15, y: cursor - 15, size: 7, color: BLUE })
  drawText(page, 'i', LEFT + 13.2, cursor - 18, 8, WHITE, latin, indic)
  drawText(page, 'DOCUMENT NOTE', LEFT + 28, cursor - 13, 6.8, BLUE, latin, indic)
  noteLines.forEach((line, index) =>
    drawText(page, line, LEFT + 28, cursor - 25 - index * 9, 7.2, TEXT, latin, indic),
  )
  cursor -= noteHeight + 9
  ensureSpace(72, 0)
  page.drawLine({
    start: { x: LEFT, y: cursor },
    end: { x: RIGHT, y: cursor },
    thickness: 0.7,
    color: rgb(0.72, 0.8, 0.92),
  })
  const signerTop = cursor - 9
  drawText(page, 'AUTHORIZED SIGNATORY', LEFT, signerTop, 6.8, BLUE, latin, indic)
  drawText(page, 'Jawahar R. Mallah', LEFT, signerTop - 18, 12, NAVY, latin, indic)
  drawText(page, 'Authorized issuer attribution', LEFT, signerTop - 30, 6.5, MUTED, latin, indic)

  const issuerBadgeX = LEFT + 190
  page.drawRectangle({
    x: issuerBadgeX,
    y: signerTop - 28,
    width: 151,
    height: 20,
    color: rgb(0.91, 0.97, 0.93),
    borderColor: rgb(0.62, 0.82, 0.7),
    borderWidth: 0.7,
  })
  page.drawCircle({ x: issuerBadgeX + 11, y: signerTop - 18, size: 6, color: rgb(0.08, 0.47, 0.31) })
  drawText(page, '✓', issuerBadgeX + 9.3, signerTop - 20.2, 5.5, WHITE, latin, indic)
  drawText(page, 'Authorized License Issuer', issuerBadgeX + 22, signerTop - 20.5, 6.4, rgb(0.08, 0.38, 0.27), latin, indic)
  drawText(page, 'For PrathamOne EduOS · Powered by SmritiSys', issuerBadgeX, signerTop - 39, 6.2, MUTED, latin, indic)

  page.drawLine({
    start: { x: RIGHT - 142, y: signerTop + 5 },
    end: { x: RIGHT - 142, y: signerTop - 43 },
    thickness: 0.7,
    color: rgb(0.72, 0.8, 0.92),
  })
  const signatureSize = issuerSignature.scaleToFit(105, 56)
  page.drawImage(issuerSignature, {
    x: RIGHT - 129,
    y: signerTop - 48,
    width: signatureSize.width,
    height: signatureSize.height,
  })
  cursor -= 62

  const pages = pdf.getPages()
  pages.forEach((currentPage, index) => {
    currentPage.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: 51, color: NAVY })
    currentPage.drawRectangle({ x: 0, y: 51, width: PAGE_WIDTH, height: 4, color: ORANGE })
    drawText(currentPage, 'www.prathamone.com', LEFT, 16, 7, WHITE, latin, indic)
    const footerLabel = pages.length > 1
      ? `PrathamOne EduOS · SmritiSys · ${index + 1} / ${pages.length}`
      : 'PrathamOne EduOS · SmritiSys'
    drawText(currentPage, footerLabel, PAGE_WIDTH / 2 - textWidth(footerLabel, 7, latin, indic) / 2, 16, 7, WHITE, latin, indic)
    drawText(currentPage, 'Powered by SmritiSys', RIGHT - 106, 16, 7, WHITE, latin, indic)
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
