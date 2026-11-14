/**
 * @file        ReportBookPdf.test.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.test
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
 * @description Regression coverage for report-book page geometry, contents pagination, and non-clipping text wrapping.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { PDFDocument, PDFName, StandardFonts } from 'pdf-lib'
import { readFile } from 'node:fs/promises'
import {
  createReportBookPdf,
  getReportBookContentsPageCapacity,
  getReportBookContentsPageCount,
  getReportBookPageDimensions,
  wrapReportBookText,
} from '../components/reports/reportBookPdf'
import type { ReportBookConfiguration } from '../components/reports/reportBookTypes'

const configuration = (pageSize: ReportBookConfiguration['pageSize']): ReportBookConfiguration => ({
  title: 'Test Book',
  pageSize,
  marginMm: 15,
  chapters: [],
})

describe('Report book PDF layout', () => {
  it('reserves contents rows based on the selected page height', () => {
    const a4 = configuration('A4')
    const a5 = configuration('A5')

    expect(getReportBookContentsPageCapacity(a4)).toBeGreaterThan(getReportBookContentsPageCapacity(a5))
    expect(getReportBookContentsPageCount(100, a5)).toBeGreaterThan(1)
  })

  it('swaps page dimensions for landscape sections and respects custom dimensions', () => {
    expect(getReportBookPageDimensions(configuration('A5'), 'landscape')).toEqual([595.28, 419.53])
    const customDimensions = getReportBookPageDimensions({
      ...configuration('Custom'),
      customWidthMm: 180,
      customHeightMm: 260,
    }, 'portrait')
    expect(customDimensions[0]).toBeCloseTo(180 * 72 / 25.4)
    expect(customDimensions[1]).toBeCloseTo(260 * 72 / 25.4)
  })

  it('wraps long unbroken table values within the available column width', async () => {
    const pdf = await PDFDocument.create()
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    const lines = wrapReportBookText('ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ', 45, 8, font, font, 3)

    expect(lines).toHaveLength(3)
    expect(lines[2].endsWith('…')).toBe(true)
    expect(lines.every((line) => font.widthOfTextAtSize(line, 8) <= 45)).toBe(true)
  })

  it('creates a parseable book with continuous pagination and mixed orientations', async () => {
    const fontDirectory = `${process.cwd()}/node_modules/@fontsource/noto-sans-devanagari/files`
    const latinFont = await readFile(`${fontDirectory}/noto-sans-devanagari-latin-400-normal.woff`)
    const indicFont = await readFile(`${fontDirectory}/noto-sans-devanagari-devanagari-400-normal.woff`)
    const softwareLogo = await readFile(`${process.cwd()}/public/logo/logoone256.png`)
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const urlString = String(url)
      const bytes = urlString.includes('logoone256')
        ? softwareLogo
        : urlString.includes('devanagari-400') ? indicFont : latinFont
      const buffer = new ArrayBuffer(bytes.byteLength)
      new Uint8Array(buffer).set(bytes)
      return new Response(buffer, {
        status: 200,
        headers: urlString.includes('logoone256') ? { 'content-type': 'image/png' } : undefined,
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const book = configuration('A5')
    book.chapters = [
      { id: 'portrait', title: 'Portrait Chapter', kind: 'reports', reportIds: ['roster'], included: true, orientation: 'portrait' },
      { id: 'landscape', title: 'Landscape Chapter', kind: 'reports', reportIds: ['wide'], included: true, orientation: 'landscape' },
      { id: 'appendix', title: 'Appendix', kind: 'appendix', reportIds: [], notes: 'Supporting notes must continue across pages. '.repeat(100), included: true, orientation: 'portrait' },
    ]
    const rows = Array.from({ length: 60 }, (_, index) => ({
      student: `Student ${index + 1}`,
      admission: `ADM-${String(index + 1).padStart(4, '0')}`,
      notes: 'A long but readable value repeated across report rows to exercise pagination.',
    }))
    const bytes = await createReportBookPdf(
      book,
      book.chapters,
      [
        { reportId: 'roster', title: 'Student Roster', description: '', columns: [
          { key: 'student', label: 'Student' }, { key: 'admission', label: 'Admission' },
        ], rows, summary: [], charts: [], orientation: 'portrait' },
        { reportId: 'wide', title: 'Wide Report', description: '', columns: [
          { key: 'student', label: 'Student' }, { key: 'admission', label: 'Admission' },
        ], rows: rows.slice(0, 3), summary: [], charts: [], orientation: 'landscape' },
      ],
      { institutionName: 'Prashant Academy', softwareLogoUrl: '/logo/logoone256.png' },
      {
        documentId: '123e4567-e89b-42d3-a456-426614174000',
        title: 'Test Book',
        generatedAt: '2026-11-14T00:00:00.000Z',
        reportIds: ['roster', 'wide'],
        reportRowCounts: { roster: rows.length, wide: 3 },
        pageSize: 'A5',
      },
    )

    const output = await PDFDocument.load(bytes)
    expect(fetchMock).toHaveBeenCalledWith('/logo/logoone256.png')
    const pageSizes = output.getPages().map((page) => page.getSize())
    expect(pageSizes.length).toBeGreaterThan(5)
    const firstReportPage = pageSizes.findIndex((size, index) => index >= 2 && size.width < size.height)
    const firstLandscapePage = pageSizes.findIndex((size, index) => index >= 2 && size.width > size.height)
    expect(firstReportPage).toBeGreaterThanOrEqual(2)
    expect(firstLandscapePage).toBeGreaterThan(firstReportPage)
    expect(output.catalog.get(PDFName.of('Outlines'))).toBeDefined()
  })
})

afterEach(() => vi.unstubAllGlobals())
