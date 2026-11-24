/**
 * @file        LicenseCertificatePdf.test.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.test
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
 * @description Verifies generated license certificate PDFs and customer sharing behavior.
 */

import { readFile } from 'node:fs/promises'
import { PDFDocument } from 'pdf-lib'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createLicenseCertificateFilename,
  createLicenseCertificatePdf,
  shareLicenseCertificatePdf,
} from '../utils/licenseCertificatePdf'

describe('License certificate PDF', () => {
  it('creates a single-page branded summary with PDF metadata', async () => {
    const fontDirectory = `${process.cwd()}/node_modules/@fontsource/noto-sans-devanagari/files`
    const [latinFont, indicFont] = await Promise.all([
      readFile(`${fontDirectory}/noto-sans-devanagari-latin-400-normal.woff`),
      readFile(`${fontDirectory}/noto-sans-devanagari-devanagari-400-normal.woff`),
    ])
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const bytes = String(url).includes('devanagari-400') ? indicFont : latinFont
      const buffer = new ArrayBuffer(bytes.byteLength)
      new Uint8Array(buffer).set(bytes)
      return new Response(buffer)
    })
    vi.stubGlobal('fetch', fetchMock)

    const blob = await createLicenseCertificatePdf({
      institutionName: 'प्रशांत अकादमी',
      mode: 'active',
      documentId: 'signed-document-001',
      serialNumber: 'PRTH-2026-PA001',
      edition: 'Coaching Institute Edition',
      licenseModel: 'on_premise_perpetual',
      expiresAt: null,
      issuedAt: '2026-11-15T12:00:00Z',
    })
    const pdf = await PDFDocument.load(await blob.arrayBuffer())

    expect(blob.type).toBe('application/pdf')
    expect(pdf.getPages()).toHaveLength(1)
    expect(pdf.getTitle()).toBe('PrathamOne EduOS Software License Certificate')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('builds a safe filename from a license serial', () => {
    expect(createLicenseCertificateFilename({
      institutionName: 'Prashant Academy',
      serialNumber: 'PRTH/2026 PA001',
    })).toBe('prathamone-license-prth-2026-pa001.pdf')
  })

  it('shares the PDF file when the browser supports file sharing', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', {
      share,
      canShare: vi.fn().mockReturnValue(true),
    })

    const result = await shareLicenseCertificatePdf(
      new Blob(['%PDF'], { type: 'application/pdf' }),
      'license.pdf',
      'Prashant Academy',
    )

    expect(result).toBe('shared')
    expect(share).toHaveBeenCalledWith(expect.objectContaining({
      title: 'PrathamOne EduOS License Certificate',
      files: [expect.objectContaining({ name: 'license.pdf', type: 'application/pdf' })],
    }))
  })

  it('downloads the PDF when file sharing is unavailable', async () => {
    vi.stubGlobal('navigator', {})
    vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:license')
    vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    const result = await shareLicenseCertificatePdf(
      new Blob(['%PDF'], { type: 'application/pdf' }),
      'license.pdf',
      'Prashant Academy',
    )

    expect(result).toBe('downloaded')
    expect(click).toHaveBeenCalledOnce()
  })
})

afterEach(() => vi.unstubAllGlobals())
