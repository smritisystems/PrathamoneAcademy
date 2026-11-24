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
  entitlements: LicenseCertificateEntitlement[]
  verificationUrl: string | null
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

export function formatLicenseCertificateDate(value: string | null, fallback = 'Not recorded'): string {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }).format(date)
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

function drawHeader(
  page: PDFPage,
  model: string | null,
  edition: string | null,
  logo: Awaited<ReturnType<PDFDocument['embedPng']>>,
  latin: PDFFont,
  indic: PDFFont,
  continuation: boolean,
) {
  page.drawRectangle({ x: 0, y: 711, width: PAGE_WIDTH, height: 131, color: NAVY })
  page.drawRectangle({ x: 0, y: 707, width: PAGE_WIDTH, height: 4, color: ORANGE })
  page.drawRectangle({ x: 39, y: 746, width: 70, height: 61, color: WHITE })
  const logoSize = logo.scaleToFit(64, 55)
  page.drawImage(logo, {
    x: 42 + (64 - logoSize.width) / 2,
    y: 749 + (55 - logoSize.height) / 2,
    width: logoSize.width,
    height: logoSize.height,
  })
  drawText(page, 'PrathamOne EduOS', 124, 808, 17, WHITE, latin, indic)
  drawText(page, (edition || 'EDITION NOT RECORDED').toUpperCase(), 124, 788, 8, rgb(0.78, 0.84, 0.92), latin, indic)
  drawText(page, 'SOFTWARE LICENSE', 124, 764, 8, GOLD, latin, indic)
  drawText(page, continuation ? 'License Certificate · Continued' : 'License Certificate', 124, 737, 20, WHITE, latin, indic)
  drawText(page, 'CUSTOMER COPY', 124, 721, 7, rgb(0.78, 0.84, 0.92), latin, indic)

  page.drawCircle({ x: 513, y: 779, size: 37, color: NAVY, borderColor: GOLD, borderWidth: 1.7 })
  page.drawCircle({ x: 513, y: 779, size: 31, borderColor: rgb(0.55, 0.62, 0.72), borderWidth: 0.6 })
  drawText(page, 'LICENSE MODEL', 491, 795, 5.3, GOLD, latin, indic)
  const modelLines = wrapText(formatModel(model).toUpperCase(), 56, 5.8, latin, indic).slice(0, 3)
  modelLines.forEach((line, index) => {
    const x = 513 - textWidth(line, 5.8, latin, indic) / 2
    drawText(page, line, x, 784 - index * 8, 5.8, WHITE, latin, indic)
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

function dataUrlHost(value: string): string {
  try {
    return new URL(value).host
  } catch {
    return 'Licensing authority'
  }
}

export async function createLicenseCertificatePdf(data: LicenseCertificateData): Promise<Blob> {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const [latinBytes, indicBytes, logoBytes] = await Promise.all([
    fetchFont(latinFontUrl),
    fetchFont(devanagariFontUrl),
    fetchProductLogo(),
  ])
  const [latin, indic, logo] = await Promise.all([
    pdf.embedFont(latinBytes, { subset: true }),
    pdf.embedFont(indicBytes, { subset: true }),
    pdf.embedPng(logoBytes),
  ])
  const qrDataUrl = data.verificationUrl
    ? await createLicenseVerificationQrDataUrl(data.verificationUrl)
    : null
  const qrImage = qrDataUrl ? await pdf.embedPng(qrDataUrlBytes(qrDataUrl)) : null
  const status = getLicenseCertificateStatus(data.licenseStatus, data.mode, data.expiresAt)
  const statusColor = statusColors(status)
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let cursor = 690
  drawHeader(page, data.licenseModel, data.edition, logo, latin, indic, false)

  const addPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    drawHeader(page, data.licenseModel, data.edition, logo, latin, indic, true)
    cursor = 690
  }
  const ensureSpace = (height: number, reserve = 45) => {
    if (cursor - height < 42 + reserve) addPage()
  }
  const drawTextBlock = (
    text: string,
    x: number,
    width: number,
    size: number,
    color: PdfColor,
    lineHeight: number,
    reserve = 190,
  ) => {
    for (const line of wrapText(text, width, size, latin, indic)) {
      ensureSpace(lineHeight, reserve)
      drawText(page, line, x, cursor, size, color, latin, indic)
      cursor -= lineHeight
    }
  }
  const drawSectionTitle = (title: string) => {
    ensureSpace(24, 180)
    drawText(page, title.toUpperCase(), LEFT, cursor, 8, BLUE, latin, indic)
    page.drawLine({
      start: { x: LEFT, y: cursor - 5 },
      end: { x: RIGHT, y: cursor - 5 },
      thickness: 0.65,
      color: rgb(0.86, 0.89, 0.93),
    })
    cursor -= 20
  }

  drawText(page, 'LICENSED ORGANIZATION', LEFT, cursor, 8, MUTED, latin, indic)
  const statusWidth = Math.min(175, Math.max(70, textWidth(status, 7.3, latin, indic) + 18))
  page.drawRectangle({
    x: RIGHT - statusWidth,
    y: cursor - 7,
    width: statusWidth,
    height: 20,
    color: statusColor.background,
  })
  drawText(page, status, RIGHT - statusWidth + 9, cursor, 7.3, statusColor.foreground, latin, indic)
  cursor -= 20
  drawTextBlock(data.institutionName || 'Organization name not recorded', LEFT, CONTENT_WIDTH, 16, NAVY, 20)
  if (data.institutionAddress?.trim()) {
    drawTextBlock(data.institutionAddress, LEFT, CONTENT_WIDTH, 9, MUTED, 13)
  }
  cursor -= 8

  drawSectionTitle('License summary')
  const summary = [
    ['License status', status],
    ['Product edition', data.edition || 'Not recorded'],
    ['License model', formatModel(data.licenseModel)],
    ['Valid through', formatDate(data.expiresAt)],
  ]
  for (let index = 0; index < summary.length; index += 2) {
    const pair = summary.slice(index, index + 2)
    const cardWidth = (CONTENT_WIDTH - 10) / 2
    const cardLines = pair.map(([, value]) => wrapText(value, cardWidth - 22, 9, latin, indic))
    const cardHeight = Math.max(48, 28 + Math.max(...cardLines.map((lines) => lines.length)) * 11)
    ensureSpace(cardHeight + 8, 180)
    pair.forEach(([label], cardIndex) => {
      const x = LEFT + cardIndex * (cardWidth + 10)
      const lines = cardLines[cardIndex]
      page.drawRectangle({
        x,
        y: cursor - cardHeight,
        width: cardWidth,
        height: cardHeight,
        color: PALE,
        borderColor: rgb(0.88, 0.90, 0.93),
        borderWidth: 0.7,
      })
      drawText(page, label.toUpperCase(), x + 11, cursor - 13, 6.8, MUTED, latin, indic)
      lines.forEach((line, lineIndex) =>
        drawText(page, line, x + 11, cursor - 28 - lineIndex * 11, 9, TEXT, latin, indic),
      )
    })
    cursor -= cardHeight + 8
  }

  drawSectionTitle('License entitlements')
  if (!data.entitlements.length) {
    drawTextBlock('No additional signed entitlements are recorded in this snapshot.', LEFT, CONTENT_WIDTH, 9, MUTED, 14)
  } else {
    for (const entitlement of data.entitlements) {
      ensureSpace(15, 180)
      drawText(page, entitlement.key, LEFT, cursor, 8, BLUE, latin, indic)
      cursor -= 12
      for (const line of wrapText(entitlement.value, CONTENT_WIDTH, 8.5, latin, indic)) {
        ensureSpace(12, 180)
        drawText(page, line, LEFT, cursor, 8.5, TEXT, latin, indic)
        cursor -= 11
      }
      cursor -= 6
    }
  }

  drawSectionTitle('License identification')
  const identification = [
    ['LICENSE SERIAL', data.serialNumber || 'Not recorded'],
    ['UNIQUE LICENSE ID', data.licenseId || 'Not recorded'],
    ['SIGNED DOCUMENT REFERENCE', data.documentId],
    ['CERTIFICATE ISSUED', formatDate(data.issuedAt, 'Not recorded')],
  ]
  const idCardWidth = (CONTENT_WIDTH - 10) / 2
  for (let index = 0; index < identification.length; index += 2) {
    const pair = identification.slice(index, index + 2)
    const valueLines = pair.map(([, value]) => wrapText(value, idCardWidth - 20, 8, latin, indic))
    const rowHeight = Math.max(45, 25 + Math.max(...valueLines.map((lines) => lines.length)) * 10)
    ensureSpace(rowHeight + 7, 180)
    pair.forEach(([label], cardIndex) => {
      const x = LEFT + cardIndex * (idCardWidth + 10)
      page.drawRectangle({
        x,
        y: cursor - rowHeight,
        width: idCardWidth,
        height: rowHeight,
        color: WHITE,
        borderColor: rgb(0.88, 0.90, 0.93),
        borderWidth: 0.7,
      })
      drawText(page, label, x + 10, cursor - 12, 6.4, MUTED, latin, indic)
      valueLines[cardIndex].forEach((line, lineIndex) =>
        drawText(page, line, x + 10, cursor - 26 - lineIndex * 10, 8, TEXT, latin, indic),
      )
    })
    cursor -= rowHeight + 7
  }

  ensureSpace(175, 0)
  const finalTop = cursor
  const qrX = LEFT
  const qrY = finalTop - 102
  page.drawRectangle({
    x: qrX,
    y: finalTop - 137,
    width: 120,
    height: 140,
    color: PALE,
    borderColor: rgb(0.88, 0.90, 0.93),
    borderWidth: 0.7,
  })
  drawText(page, 'VERIFY LICENSE', qrX + 10, finalTop - 12, 7, BLUE, latin, indic)
  if (qrImage) {
    page.drawImage(qrImage, { x: qrX + 25, y: qrY - 5, width: 70, height: 70 })
    drawText(page, 'Scan for live status', qrX + 21, finalTop - 116, 6.6, MUTED, latin, indic)
    drawText(page, dataUrlHost(data.verificationUrl || ''), qrX + 10, finalTop - 128, 5.7, MUTED, latin, indic)
  } else {
    drawText(page, 'Online verification', qrX + 10, finalTop - 52, 7.2, TEXT, latin, indic)
    drawText(page, 'is not configured.', qrX + 10, finalTop - 65, 7.2, TEXT, latin, indic)
  }

  const rightX = LEFT + 135
  const rightWidth = CONTENT_WIDTH - 135
  drawText(page, 'DOCUMENT NOTE', rightX, finalTop - 11, 7, BLUE, latin, indic)
  const noteLines = wrapText(DOCUMENT_NOTE, rightWidth, 7.2, latin, indic)
  noteLines.forEach((line, index) =>
    drawText(page, line, rightX, finalTop - 25 - index * 10, 7.2, MUTED, latin, indic),
  )
  const issuerTop = finalTop - 25 - noteLines.length * 10 - 12
  page.drawLine({
    start: { x: rightX, y: issuerTop + 6 },
    end: { x: RIGHT, y: issuerTop + 6 },
    thickness: 0.6,
    color: rgb(0.86, 0.89, 0.93),
  })
  drawText(page, 'Jawahar R. Mallah', rightX, issuerTop - 7, 9, NAVY, latin, indic)
  drawText(page, 'Authorized License Issuer · For PrathamOne EduOS', rightX, issuerTop - 20, 7, TEXT, latin, indic)
  drawText(page, 'Powered by SmritiSys', rightX, issuerTop - 33, 7, MUTED, latin, indic)

  const pages = pdf.getPages()
  pages.forEach((currentPage, index) => {
    currentPage.drawLine({
      start: { x: LEFT, y: 34 },
      end: { x: RIGHT, y: 34 },
      thickness: 0.7,
      color: rgb(0.86, 0.89, 0.93),
    })
    drawText(currentPage, 'PrathamOne EduOS · prathamone.com', LEFT, 20, 7, MUTED, latin, indic)
    drawText(currentPage, 'Powered by SmritiSys', RIGHT - 108, 20, 7, MUTED, latin, indic)
    if (pages.length > 1) {
      const pageLabel = `${index + 1} / ${pages.length}`
      drawText(currentPage, pageLabel, PAGE_WIDTH / 2 - textWidth(pageLabel, 6, latin, indic) / 2, 20, 6, MUTED, latin, indic)
    }
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
