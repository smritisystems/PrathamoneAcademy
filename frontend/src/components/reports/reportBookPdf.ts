/**
 * @file        reportBookPdf.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.reports
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-14
 * @updated     2026-11-14
 *
 * @description Lays out multi-section report books with mixed orientations, pagination, contents, and PDF outlines.
 */

import fontkit from '@pdf-lib/fontkit'
import latinFontUrl from '@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-latin-400-normal.woff?url'
import devanagariFontUrl from '@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-400-normal.woff?url'
import {
  PDFDocument,
  PDFHexString,
  PDFName,
  rgb,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib'
import type {
  ReportBookChapter,
  ReportBookConfiguration,
  ReportBookData,
  ReportBookGenerationSnapshot,
} from './reportBookTypes'

export interface ReportBookBranding {
  institutionName: string
  logoUrl?: string
  primaryColor?: string
}

interface OutlineEntry {
  title: string
  page: PDFPage
}

const PT_PER_MM = 72 / 25.4
const INDIC_FONT = /[\u0900-\u097f\u20b9]/
const BLUE = rgb(0.04, 0.18, 0.42)
const PALE_BLUE = rgb(0.92, 0.95, 0.98)
const GRAY = rgb(0.38, 0.42, 0.48)
const DARK = rgb(0.12, 0.16, 0.22)
const WHITE = rgb(1, 1, 1)

const hexColor = (value?: string) => {
  const match = value?.match(/^#?([0-9a-f]{6})$/i)
  if (!match) return BLUE
  const int = Number.parseInt(match[1], 16)
  return rgb(((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255)
}

export const getReportBookPageDimensions = (config: ReportBookConfiguration, orientation: 'portrait' | 'landscape'): [number, number] => {
  const dimensions: [number, number] = config.pageSize === 'A5' ? [419.53, 595.28]
    : config.pageSize === 'Letter' ? [612, 792]
      : config.pageSize === 'Custom'
        ? [(config.customWidthMm || 210) * PT_PER_MM, (config.customHeightMm || 297) * PT_PER_MM]
        : [595.28, 841.89]
  return orientation === 'landscape' ? [dimensions[1], dimensions[0]] : dimensions
}

const textSegments = (text: string) => {
  const segments: Array<{ text: string; indic: boolean }> = []
  for (const piece of text.match(/[\u0900-\u097f\u20b9]+|[^\u0900-\u097f\u20b9]+/gu) || []) {
    segments.push({ text: piece, indic: INDIC_FONT.test(piece) })
  }
  return segments
}

const textWidth = (text: string, size: number, latin: PDFFont, indic: PDFFont) =>
  textSegments(text).reduce((total, segment) =>
    total + (segment.indic ? indic : latin).widthOfTextAtSize(segment.text, size), 0)

export const wrapReportBookText = (
  text: string,
  maxWidth: number,
  size: number,
  latin: PDFFont,
  indic: PDFFont,
  maxLines = 4,
) => {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  if (words.length === 0) return ['']
  const lines: string[] = []
  let line = ''
  let truncated = false
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (textWidth(candidate, size, latin, indic) <= maxWidth) {
      line = candidate
      continue
    }
    if (line) {
      lines.push(line)
      line = ''
      if (lines.length >= maxLines) {
        truncated = true
        break
      }
    }

    let wordSegment = ''
    for (const character of Array.from(word)) {
      const next = wordSegment + character
      if (wordSegment && textWidth(next, size, latin, indic) > maxWidth) {
        lines.push(wordSegment)
        wordSegment = character
        if (lines.length >= maxLines) {
          truncated = true
          break
        }
      } else {
        wordSegment = next
      }
    }
    if (truncated) break
    line = wordSegment
  }
  if (line && lines.length < maxLines) {
    lines.push(line)
  } else if (line) {
    truncated = true
  }
  if (truncated && lines.length > 0) {
    const last = lines.length - 1
    let shortened = lines[last].replace(/[\s…]+$/g, '')
    while (shortened && textWidth(`${shortened}…`, size, latin, indic) > maxWidth) {
      shortened = shortened.slice(0, -1)
    }
    lines[last] = `${shortened}…`
  }
  return lines
}

export const getReportBookContentsPageCapacity = (config: ReportBookConfiguration) => {
  const pageHeight = getReportBookPageDimensions(config, 'portrait')[1]
  const margin = config.marginMm * PT_PER_MM
  const firstRowY = pageHeight - margin - 52
  const lastRowY = margin + 24
  return Math.max(1, Math.floor((firstRowY - lastRowY) / 19) + 1)
}

export const getReportBookContentsPageCount = (entryCount: number, config: ReportBookConfiguration) =>
  Math.max(1, Math.ceil(entryCount / getReportBookContentsPageCapacity(config)))

const drawText = (
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  size: number,
  color: ReturnType<typeof rgb>,
  latin: PDFFont,
  indic: PDFFont,
) => {
  let cursor = x
  for (const segment of textSegments(text)) {
    const font = segment.indic ? indic : latin
    page.drawText(segment.text, { x: cursor, y, size, font, color, maxWidth: 2000 })
    cursor += font.widthOfTextAtSize(segment.text, size)
  }
}

const loadFont = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Unable to load the PDF font (${response.status}).`)
  return new Uint8Array(await response.arrayBuffer())
}

const embedLogo = async (pdf: PDFDocument, logoUrl?: string) => {
  if (!logoUrl) return undefined
  const response = await fetch(logoUrl)
  if (!response.ok) throw new Error(`Unable to load institution logo (${response.status}).`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  const contentType = response.headers.get('content-type')?.toLowerCase() || ''
  if (contentType.includes('png') || logoUrl.toLowerCase().endsWith('.png')) return pdf.embedPng(bytes)
  if (contentType.includes('jpeg') || contentType.includes('jpg') || /\.(jpe?g)(?:$|\?)/i.test(logoUrl)) return pdf.embedJpg(bytes)
  if (!contentType.includes('svg') && !logoUrl.toLowerCase().includes('.svg')) {
    throw new Error('The institution logo must be SVG, PNG, or JPEG to embed in a report book.')
  }
  const image = await createImageBitmap(new Blob([bytes], { type: 'image/svg+xml' }))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(image.width, 1)
  canvas.height = Math.max(image.height, 1)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Unable to prepare the institution logo for PDF output.')
  context.drawImage(image, 0, 0)
  image.close()
  const png = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Unable to convert the institution logo to PNG.')), 'image/png')
  })
  return pdf.embedPng(new Uint8Array(await png.arrayBuffer()))
}

const chunks = <T,>(items: T[], max: number) => {
  const output: T[][] = []
  for (let index = 0; index < items.length; index += max) output.push(items.slice(index, index + max))
  return output
}

const effectiveOrientation = (chapter: ReportBookChapter, report: ReportBookData): 'portrait' | 'landscape' => {
  if (chapter.orientation !== 'auto') return chapter.orientation
  return report.orientation
}

const makeOutline = (pdf: PDFDocument, entries: OutlineEntry[]) => {
  if (entries.length === 0) return
  const outlineRef = pdf.context.nextRef()
  const itemRefs = entries.map(() => pdf.context.nextRef())
  pdf.context.assign(outlineRef, pdf.context.obj({
    Type: 'Outlines',
    First: itemRefs[0],
    Last: itemRefs[itemRefs.length - 1],
    Count: entries.length,
  }))
  entries.forEach((entry, index) => {
    const item = pdf.context.obj({})
    const destination = pdf.context.obj([])
    destination.push(entry.page.ref)
    destination.push(PDFName.of('Fit'))
    item.set(PDFName.of('Title'), PDFHexString.fromText(entry.title))
    item.set(PDFName.of('Parent'), outlineRef)
    item.set(PDFName.of('Dest'), destination)
    if (index > 0) item.set(PDFName.of('Prev'), itemRefs[index - 1])
    if (index < itemRefs.length - 1) item.set(PDFName.of('Next'), itemRefs[index + 1])
    pdf.context.assign(itemRefs[index], item)
  })
  pdf.catalog.set(PDFName.of('Outlines'), outlineRef)
  pdf.catalog.set(PDFName.of('PageMode'), PDFName.of('UseOutlines'))
}

const pageCountLabel = (index: number, total: number) => `${index + 1} / ${total}`

export async function createReportBookPdf(
  config: ReportBookConfiguration,
  chapters: ReportBookChapter[],
  reports: ReportBookData[],
  branding: ReportBookBranding,
  snapshot: ReportBookGenerationSnapshot,
): Promise<Uint8Array> {
  if (reports.length === 0 && chapters.every((chapter) => chapter.kind === 'reports')) {
    throw new Error('The book contains no report data to publish.')
  }
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const [latinBytes, indicBytes] = await Promise.all([loadFont(latinFontUrl), loadFont(devanagariFontUrl)])
  const [latin, indic] = await Promise.all([
    pdf.embedFont(latinBytes, { subset: true }),
    pdf.embedFont(indicBytes, { subset: true }),
  ])
  const logo = await embedLogo(pdf, branding.logoUrl)
  const brandColor = hexColor(branding.primaryColor)
  const mm = (value: number) => value * PT_PER_MM
  const margin = mm(config.marginMm)
  const sections = chapters.filter((chapter) => chapter.included)
  const topChapters = sections.filter((chapter) => !chapter.parentId)
  const chapterNumber = (chapter: ReportBookChapter) => {
    const top = chapter.parentId
      ? topChapters.findIndex((item) => item.id === chapter.parentId) + 1
      : topChapters.findIndex((item) => item.id === chapter.id) + 1
    if (!chapter.parentId) return `${top}`
    const siblings = sections.filter((item) => item.parentId === chapter.parentId)
    return `${top}.${siblings.findIndex((item) => item.id === chapter.id) + 1}`
  }
  const reportIndex = new Map(reports.map((report) => [report.reportId, report]))
  const contentsEntries = sections.flatMap((chapter) => [
    { id: chapter.id, title: `${chapterNumber(chapter)}. ${chapter.title}`, reportId: undefined as string | undefined },
    ...chapter.reportIds.map((id, index) => ({
      id,
      title: `${chapterNumber(chapter)}.${index + 1} ${reportIndex.get(id)?.title || id}`,
      reportId: id,
    })),
  ])
  const tocPageCapacity = getReportBookContentsPageCapacity(config)
  const tocPageCount = getReportBookContentsPageCount(contentsEntries.length, config)
  const cover = pdf.addPage(getReportBookPageDimensions(config, 'portrait') as [number, number])
  const tocPages = Array.from({ length: tocPageCount }, () => pdf.addPage(getReportBookPageDimensions(config, 'portrait') as [number, number]))
  const outlineEntries: OutlineEntry[] = []
  const sectionStartPages = new Map<string, number>()

  const addPage = (orientation: 'portrait' | 'landscape') =>
    pdf.addPage(getReportBookPageDimensions(config, orientation) as [number, number])

  for (const chapter of sections) {
    if (chapter.kind === 'title' || chapter.kind === 'divider' || chapter.kind === 'note' || chapter.kind === 'appendix') {
      const height = getReportBookPageDimensions(config, 'portrait')[1]
      const lineHeight = 18
      const noteLines = chapter.notes
        ? wrapReportBookText(chapter.notes, getReportBookPageDimensions(config, 'portrait')[0] - margin * 2, 12, latin, indic, 10000)
        : []
      const noteStartY = chapter.kind === 'title' ? height / 2 - 45 : height - margin - 126
      const noteCapacity = Math.max(1, Math.floor((noteStartY - margin - mm(15)) / lineHeight) + 1)
      const pageCount = Math.max(1, Math.ceil(noteLines.length / noteCapacity))
      for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
        const page = addPage('portrait')
        if (pageIndex === 0) sectionStartPages.set(chapter.id, pdf.getPages().indexOf(page))
        const { width, height: pageHeight } = page.getSize()
        const continuation = pageIndex > 0
        let textStartY: number
        if (chapter.kind === 'title' && !continuation) {
          const titleLines = wrapReportBookText(chapter.title, width - margin * 2, 26, latin, indic, 2)
          titleLines.forEach((line, index) => drawText(page, line, margin, pageHeight / 2 + 20 - index * 30, 26, brandColor, latin, indic))
          const institutionLines = wrapReportBookText(branding.institutionName, width - margin * 2, 14, latin, indic, 2)
          institutionLines.forEach((line, index) => drawText(page, line, margin, pageHeight / 2 - 10 - index * 17, 14, DARK, latin, indic))
          textStartY = pageHeight / 2 - 45
        } else {
          const heading = `${chapter.title}${continuation ? ' (continued)' : ''}`
          const headingLines = wrapReportBookText(heading, width - margin * 2, 24, latin, indic, 2)
          const headingStartY = pageHeight - margin - 42
          headingLines.forEach((line, index) => drawText(page, line, margin, headingStartY - index * 28, 24, brandColor, latin, indic))
          const ruleY = headingStartY - headingLines.length * 28 - 4
          page.drawLine({ start: { x: margin, y: ruleY }, end: { x: width - margin, y: ruleY }, thickness: 2, color: brandColor })
          textStartY = ruleY - 24
        }
        noteLines.slice(pageIndex * noteCapacity, (pageIndex + 1) * noteCapacity)
          .forEach((line, index) => drawText(page, line, margin, textStartY - index * lineHeight, 12, DARK, latin, indic))
      }
      continue
    }

    for (const reportId of chapter.reportIds) {
      const report = reportIndex.get(reportId)
      if (!report) throw new Error(`Report data was not loaded for "${reportId}".`)
      const orientation = effectiveOrientation(chapter, report)
      const groups = chunks(report.columns, 7)
      const columnGroups = groups.length > 0 ? groups : [[]]
      let firstPage: PDFPage | undefined
      if (report.summary.length > 0 || report.charts.length > 0) {
        const summaryPage = addPage(orientation)
        firstPage = summaryPage
        const { width, height } = summaryPage.getSize()
        const contentWidth = width - margin * 2
        const summaryTitle = `${chapterNumber(chapter)}.${chapter.reportIds.indexOf(reportId) + 1} ${report.title} — Summary`
        const titleLines = wrapReportBookText(summaryTitle, contentWidth, 15, latin, indic, 2)
        titleLines.forEach((line, index) => drawText(summaryPage, line, margin, height - margin - 20 - index * 17, 15, brandColor, latin, indic))
        let summaryY = height - margin - 20 - titleLines.length * 17
        const summaryColumnWidth = contentWidth / 2
        report.summary.slice(0, 12).forEach((item, index) => {
          const column = index % 2
          const row = Math.floor(index / 2)
          const x = margin + column * summaryColumnWidth
          const y = summaryY - row * 20
          const lines = wrapReportBookText(`${item.label}: ${item.value}`, summaryColumnWidth - 8, 8, latin, indic, 2)
          lines.forEach((line, lineIndex) => drawText(summaryPage, line, x, y - lineIndex * 9, 8, DARK, latin, indic))
        })
        summaryY -= Math.ceil(Math.min(report.summary.length, 12) / 2) * 20 + 10
        for (const chart of report.charts.slice(0, 2)) {
          const chartTitleLines = wrapReportBookText(chart.title, contentWidth, 10, latin, indic, 2)
          chartTitleLines.forEach((line, index) => drawText(summaryPage, line, margin, summaryY - index * 12, 10, brandColor, latin, indic))
          summaryY -= chartTitleLines.length * 12 + 2
          const points = chart.labels.map((label, index) => ({ label, value: chart.values[index] }))
            .filter((point) => Number.isFinite(point.value))
            .slice(0, 12)
          const maxValue = Math.max(1, ...points.map((point) => Math.abs(point.value)))
          const labelWidth = Math.min(mm(55), contentWidth * 0.3)
          const valueWidth = Math.min(mm(22), contentWidth * 0.25)
          const barsWidth = Math.max(10, contentWidth - labelWidth - valueWidth - 4)
          for (const point of points) {
            if (summaryY < margin + 18) break
            const labelLine = wrapReportBookText(point.label, labelWidth - 2, 7, latin, indic, 1)[0]
            drawText(summaryPage, labelLine, margin, summaryY, 7, DARK, latin, indic)
            const barWidth = Math.max(0, Math.abs(point.value) / maxValue * barsWidth)
            summaryPage.drawRectangle({ x: margin + labelWidth, y: summaryY - 2, width: barWidth, height: 8, color: brandColor })
            const valueLine = wrapReportBookText(`${point.value.toLocaleString('en-IN')} ${chart.valueLabel}`, valueWidth, 7, latin, indic, 1)[0]
            drawText(summaryPage, valueLine, margin + labelWidth + barsWidth + 4, summaryY, 7, GRAY, latin, indic)
            summaryY -= 13
          }
          summaryY -= 8
        }
      }

      for (const columnGroup of columnGroups) {
        let page = addPage(orientation)
        firstPage ||= page
        let { width, height } = page.getSize()
        const tableWidth = width - margin * 2
        const columnWidth = tableWidth / Math.max(columnGroup.length, 1)
        const title = `${chapterNumber(chapter)}.${chapter.reportIds.indexOf(reportId) + 1} ${report.title}`
        const drawHeading = (continued: boolean) => {
          const heading = continued ? `${title} (continued)` : title
          const headingLines = wrapReportBookText(heading, width - margin * 2, 16, latin, indic, 2)
          headingLines.forEach((line, index) => drawText(page, line, margin, height - margin - 20 - index * 17, 16, brandColor, latin, indic))
          let metadataY = height - margin - 20 - headingLines.length * 17
          const metadataLines = wrapReportBookText(snapshot.filterScope || `${chapter.title} · ${branding.institutionName}`, width - margin * 2, 8, latin, indic, 2)
          metadataLines.forEach((line) => {
            drawText(page, line, margin, metadataY, 8, GRAY, latin, indic)
            metadataY -= 10
          })
          if (report.filterNote) {
            const filterLines = wrapReportBookText(report.filterNote, width - margin * 2, 7, latin, indic, 2)
            filterLines.forEach((line) => {
              drawText(page, line, margin, metadataY, 7, GRAY, latin, indic)
              metadataY -= 9
            })
          }
          return metadataY - 5
        }
        let y = drawHeading(false)

        const drawTableHeader = () => {
          page.drawRectangle({ x: margin, y: y - 20, width: tableWidth, height: 20, color: brandColor })
          columnGroup.forEach((column, index) => {
            const text = wrapReportBookText(column.label, columnWidth - 8, 7, latin, indic, 2)
            text.forEach((line, lineIndex) => drawText(page, line, margin + index * columnWidth + 4, y - 12 - lineIndex * 8, 7, WHITE, latin, indic))
          })
          y -= 20
        }

        if (columnGroup.length > 0) drawTableHeader()
        if (report.rows.length === 0) drawText(page, 'No records were returned by the source report for this scope.', margin, y - 14, 9, GRAY, latin, indic)

        for (const [rowIndex, row] of report.rows.entries()) {
          const cellLines = columnGroup.map((column) => wrapReportBookText(displayCell(row[column.key]), columnWidth - 8, 7, latin, indic, 3))
          const rowHeight = Math.max(18, ...cellLines.map((lines) => lines.length * 8 + 6))
          if (y - rowHeight < margin + mm(15)) {
            const nextPage = addPage(orientation)
            page = nextPage
            const nextSize = page.getSize()
            width = nextSize.width
            height = nextSize.height
            y = drawHeading(true)
            if (columnGroup.length > 0) drawTableHeader()
          }
          const rowColor = rowIndex % 2 === 0 ? WHITE : PALE_BLUE
          page.drawRectangle({ x: margin, y: y - rowHeight, width: tableWidth, height: rowHeight, color: rowColor })
          cellLines.forEach((lines, index) => {
            lines.forEach((line, lineIndex) => drawText(page, line, margin + index * columnWidth + 4, y - 10 - lineIndex * 8, 7, DARK, latin, indic))
          })
          y -= rowHeight
        }
      }
      if (firstPage) {
        const pageIndex = pdf.getPages().indexOf(firstPage)
        sectionStartPages.set(reportId, pageIndex)
        if (!sectionStartPages.has(chapter.id)) sectionStartPages.set(chapter.id, pageIndex)
      }
    }
  }

  for (const chapter of sections) {
    if (chapter.kind !== 'reports' || chapter.reportIds.length > 0) continue
    const child = sections.find((item) => item.parentId === chapter.id)
    const childReportId = child?.reportIds[0]
    if (childReportId) {
      const pageIndex = sectionStartPages.get(childReportId)
      if (pageIndex !== undefined) sectionStartPages.set(chapter.id, pageIndex)
    }
  }
  sections.forEach((chapter) => {
    const pageIndex = sectionStartPages.get(chapter.id)
    if (pageIndex !== undefined) outlineEntries.push({ title: `${chapterNumber(chapter)}. ${chapter.title}`, page: pdf.getPage(pageIndex) })
    chapter.reportIds.forEach((reportId, index) => {
      const reportPageIndex = sectionStartPages.get(reportId)
      const report = reportIndex.get(reportId)
      if (reportPageIndex !== undefined && report) {
        outlineEntries.push({ title: `${chapterNumber(chapter)}.${index + 1} ${report.title}`, page: pdf.getPage(reportPageIndex) })
      }
    })
  })

  const title = config.title.trim() || 'Report Book'
  const coverSize = cover.getSize()
  const availableHeight = Math.max(1, coverSize.height - margin * 2)
  const coverScale = Math.min(1, availableHeight / mm(170))
  const titleSize = 24 * coverScale
  const institutionSize = 14 * coverScale
  const metaSize = 9 * coverScale
  const filterScope = snapshot.filterScope || [
    snapshot.academicYearLabel || (snapshot.academicYearId ? `Academic year ID ${snapshot.academicYearId}` : 'All academic years'),
    snapshot.startDate || snapshot.endDate ? `${snapshot.startDate || 'Start'} to ${snapshot.endDate || 'Current'}` : 'All dates',
    snapshot.standardLabel || (snapshot.standardId ? `Standard ID ${snapshot.standardId}` : 'All standards'),
    snapshot.divisionLabel || (snapshot.divisionId ? `Batch ID ${snapshot.divisionId}` : 'All batches'),
  ].join(' · ')
  const coverContentWidth = coverSize.width - margin * 2
  const coverRows = [
    { text: branding.institutionName, size: institutionSize, color: brandColor, gap: 10 },
    { text: title, size: titleSize, color: DARK, gap: 18 },
    { text: `Filter scope: ${filterScope}`, size: metaSize, color: GRAY, gap: 10 },
    { text: `Reporting period: ${snapshot.startDate || 'Start'} to ${snapshot.endDate || 'Current'}`, size: metaSize, color: GRAY, gap: 10 },
    { text: `Generated: ${new Date(snapshot.generatedAt).toLocaleString('en-IN')}`, size: metaSize, color: GRAY, gap: 10 },
    { text: `Document ID: ${snapshot.documentId}`, size: metaSize, color: GRAY, gap: 10 },
  ].map((row) => ({
    ...row,
    lines: wrapReportBookText(row.text, coverContentWidth, row.size, latin, indic, 3),
  }))
  const logoBoxHeight = logo ? mm(25) * coverScale : 0
  const coverContentHeight = logoBoxHeight + coverRows.reduce((total, row) =>
    total + row.lines.length * (row.size + 2 * coverScale) + row.gap * coverScale, 0)
  let coverY = coverSize.height / 2 + coverContentHeight / 2
  if (logo) {
    const logoScale = Math.min(mm(48) * coverScale / logo.width, mm(25) * coverScale / logo.height)
    const logoHeight = logo.height * logoScale
    cover.drawImage(logo, {
      x: (coverSize.width - logo.width * logoScale) / 2,
      y: coverY - logoHeight,
      width: logo.width * logoScale,
      height: logoHeight,
    })
    coverY -= logoHeight + 12 * coverScale
  }
  coverRows.forEach((row) => {
    row.lines.forEach((line) => {
      drawText(cover, line, margin, coverY - row.size, row.size, row.color, latin, indic)
      coverY -= row.size + 2 * coverScale
    })
    coverY -= row.gap * coverScale - 2 * coverScale
  })

  tocPages.forEach((page, pageIndex) => {
    const { width, height } = page.getSize()
    drawText(page, pageIndex === 0 ? 'Contents' : 'Contents (continued)', margin, height - margin - 22, 18, brandColor, latin, indic)
    page.drawLine({ start: { x: margin, y: height - margin - 32 }, end: { x: width - margin, y: height - margin - 32 }, thickness: 1.5, color: brandColor })
    const entries = contentsEntries.slice(pageIndex * tocPageCapacity, (pageIndex + 1) * tocPageCapacity)
    entries.forEach((entry, index) => {
      const targetPage = sectionStartPages.get(entry.id) ?? (entry.reportId ? sectionStartPages.get(entry.reportId) : undefined)
      const pageNumber = targetPage === undefined ? '' : String(targetPage + 1)
      const label = entry.title
      const y = height - margin - 52 - index * 19
      const labelWidth = width - margin * 2 - 30
      const labelLine = wrapReportBookText(label, labelWidth, 9, latin, indic, 1)[0]
      drawText(page, labelLine, margin, y, 9, DARK, latin, indic)
      const pageNumberWidth = latin.widthOfTextAtSize(pageNumber, 8)
      page.drawText(pageNumber, { x: width - margin - pageNumberWidth, y, size: 8, font: latin, color: GRAY })
      page.drawLine({ start: { x: margin, y: y - 4 }, end: { x: width - margin - 26, y: y - 4 }, thickness: 0.3, color: PALE_BLUE })
    })
  })

  const allPages = pdf.getPages()
  allPages.forEach((page, index) => {
    const { width } = page.getSize()
    const footerLineY = mm(16)
    const footerRowY = mm(11)
    const softwareRowY = mm(6)
    page.drawLine({
      start: { x: margin, y: footerLineY },
      end: { x: width - margin, y: footerLineY },
      thickness: 0.4,
      color: PALE_BLUE,
    })
    const footer = `Confidential · Document ID: ${snapshot.documentId} · Page ${pageCountLabel(index, allPages.length)}`
    const footerWidth = textWidth(footer, 6, latin, indic)
    drawText(page, footer, Math.max(margin, width - margin - footerWidth), footerRowY, 6, GRAY, latin, indic)
    const software = 'Generated by PrathamOne EduOS · © PrathamOne EduOS'
    const softwareWidth = textWidth(software, 6, latin, indic)
    drawText(page, software, (width - softwareWidth) / 2, softwareRowY, 6, GRAY, latin, indic)
  })

  makeOutline(pdf, outlineEntries)
  pdf.setTitle(title)
  pdf.setAuthor(branding.institutionName)
  pdf.setSubject(`PrathamOne EduOS report book ${snapshot.documentId}`)
  return pdf.save()
}

const displayCell = (value: unknown) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
