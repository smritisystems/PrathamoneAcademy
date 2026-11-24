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

export interface LicenseCertificateData {
  institutionName: string
  mode: string
  documentId: string
  serialNumber: string | null
  edition: string | null
  licenseModel: string | null
  expiresAt: string | null
  issuedAt: string | null
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
const DEVANAGARI = /[\u0900-\u097f\u20b9]/

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

const wrapText = (
  text: string,
  maxWidth: number,
  size: number,
  latin: PDFFont,
  indic: PDFFont,
  maxLines = 2,
) => {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  let truncated = false

  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (textWidth(next, size, latin, indic) <= maxWidth) {
      line = next
      continue
    }
    if (line) lines.push(line)
    line = ''
    if (lines.length >= maxLines) {
      truncated = true
      break
    }

    let wordPart = ''
    for (const character of Array.from(word)) {
      const candidate = wordPart + character
      if (wordPart && textWidth(candidate, size, latin, indic) > maxWidth) {
        lines.push(wordPart)
        wordPart = character
        if (lines.length >= maxLines) {
          truncated = true
          break
        }
      } else {
        wordPart = candidate
      }
    }
    if (truncated) break
    line = wordPart
  }
  if (line && lines.length < maxLines) lines.push(line)

  if (truncated) {
    const last = lines[maxLines - 1]
    let shortened = last
    while (shortened && textWidth(`${shortened}...`, size, latin, indic) > maxWidth) {
      shortened = shortened.slice(0, -1)
    }
    lines[maxLines - 1] = `${shortened}...`
  }
  return lines
}

const fetchFont = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Unable to load the license document font (${response.status}).`)
  return new Uint8Array(await response.arrayBuffer())
}

const formatDate = (value: string | null, fallback = 'No expiry date recorded') => {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
}

const drawField = (
  page: PDFPage,
  label: string,
  value: string,
  x: number,
  y: number,
  latin: PDFFont,
  indic: PDFFont,
) => {
  page.drawRectangle({
    x,
    y,
    width: 240,
    height: 74,
    color: PALE,
    borderColor: rgb(0.88, 0.90, 0.93),
    borderWidth: 0.8,
  })
  drawText(page, label.toUpperCase(), x + 14, y + 52, 8, MUTED, latin, indic)
  const lines = wrapText(value, 210, 12, latin, indic, 2)
  lines.forEach((line, index) => drawText(page, line, x + 14, y + 30 - index * 16, 12, TEXT, latin, indic))
}

export function formatLicenseCertificateDate(value: string | null, fallback = 'Not recorded'): string {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }).format(date)
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

export async function createLicenseCertificatePdf(data: LicenseCertificateData): Promise<Blob> {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const [latinBytes, indicBytes] = await Promise.all([
    fetchFont(latinFontUrl),
    fetchFont(devanagariFontUrl),
  ])
  const [latin, indic] = await Promise.all([
    pdf.embedFont(latinBytes, { subset: true }),
    pdf.embedFont(indicBytes, { subset: true }),
  ])

  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  page.drawRectangle({ x: 0, y: 674, width: PAGE_WIDTH, height: 168, color: NAVY })
  page.drawRectangle({ x: 0, y: 674, width: PAGE_WIDTH, height: 5, color: ORANGE })
  page.drawCircle({ x: 523, y: 786, size: 33, borderColor: GOLD, borderWidth: 1.6 })
  drawText(page, 'P1', 510, 780, 16, GOLD, latin, indic)
  drawText(page, 'PrathamOne EduOS', 48, 790, 18, WHITE, latin, indic)
  drawText(page, 'COACHING INSTITUTE EDITION', 48, 770, 8, rgb(0.78, 0.84, 0.92), latin, indic)
  drawText(page, 'SOFTWARE LICENSE', 48, 741, 9, GOLD, latin, indic)
  drawText(page, 'License Certificate', 48, 708, 27, WHITE, latin, indic)
  drawText(page, 'Customer copy · Issued by PrathamOne EduOS', 48, 688, 9, rgb(0.78, 0.84, 0.92), latin, indic)

  drawText(page, 'LICENSED TO', 48, 637, 8, MUTED, latin, indic)
  const institutionLines = wrapText(data.institutionName || 'Registered organization', 355, 19, latin, indic, 2)
  institutionLines.forEach((line, index) =>
    drawText(page, line, 48, 606 - index * 24, 19, NAVY, latin, indic),
  )
  const statusLabel = data.mode.replace(/_/g, ' ').toUpperCase()
  const statusColor = data.mode === 'active'
    ? rgb(0.08, 0.45, 0.31)
    : data.mode === 'grace'
      ? rgb(0.59, 0.34, 0.02)
      : rgb(0.66, 0.12, 0.17)
  const statusBackground = data.mode === 'active'
    ? rgb(0.91, 0.96, 0.94)
    : data.mode === 'grace'
      ? rgb(1, 0.96, 0.88)
      : rgb(1, 0.93, 0.93)
  page.drawRectangle({ x: 430, y: 591, width: 117, height: 30, color: statusBackground })
  drawText(page, statusLabel, 441, 602, 8, statusColor, latin, indic)
  page.drawLine({ start: { x: 48, y: 566 }, end: { x: 547, y: 566 }, thickness: 1, color: rgb(0.88, 0.90, 0.93) })

  drawField(page, 'License status', statusLabel, 48, 460, latin, indic)
  drawField(page, 'Product edition', data.edition || 'Not specified', 307, 460, latin, indic)
  drawField(page, 'License model', (data.licenseModel || 'Not specified').replace(/[_-]/g, ' '), 48, 370, latin, indic)
  drawField(page, 'Valid through', formatDate(data.expiresAt), 307, 370, latin, indic)

  drawText(page, 'LICENSE SERIAL', 48, 336, 8, MUTED, latin, indic)
  wrapText(data.serialNumber || 'Not recorded', 490, 11, latin, indic, 2)
    .forEach((line, index) => drawText(page, line, 48, 316 - index * 15, 11, TEXT, latin, indic))
  drawText(page, 'SIGNED DOCUMENT REFERENCE', 48, 276, 8, MUTED, latin, indic)
  wrapText(data.documentId, 490, 11, latin, indic, 2)
    .forEach((line, index) => drawText(page, line, 48, 256 - index * 15, 11, TEXT, latin, indic))
  drawText(page, 'SNAPSHOT ISSUED', 48, 216, 8, MUTED, latin, indic)
  drawText(page, formatDate(data.issuedAt, 'Not recorded'), 48, 196, 11, TEXT, latin, indic)

  page.drawRectangle({ x: 48, y: 91, width: 499, height: 72, color: rgb(0.97, 0.97, 0.96) })
  drawText(page, 'DOCUMENT NOTE', 62, 143, 8, BLUE, latin, indic)
  const noteLines = wrapText(
    'This branded summary is provided for customer reference and is not a replacement for the signed license artifact. License validity is determined by the verified signed snapshot and licensing authority.',
    470,
    8.5,
    latin,
    indic,
    3,
  )
  noteLines.forEach((line, index) => drawText(page, line, 62, 125 - index * 12, 8.5, MUTED, latin, indic))
  page.drawLine({ start: { x: 48, y: 65 }, end: { x: 547, y: 65 }, thickness: 1, color: rgb(0.88, 0.90, 0.93) })
  drawText(page, 'PrathamOne EduOS  |  prathamone.com', 48, 45, 8, MUTED, latin, indic)
  drawText(page, 'Powered by SmritiSys', 419, 45, 8, MUTED, latin, indic)

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
