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
  createLicenseVerificationQrDataUrl,
  createLicenseCertificateFilename,
  createLicenseCertificatePdf,
  formatLicenseCertificateEntitlements,
  formatLicenseCertificateDateTime,
  groupLicenseCertificateEntitlements,
  getLicenseCertificateStatus,
  shareLicenseCertificatePdf,
} from '../utils/licenseCertificatePdf'

async function mockCertificateAssets() {
  const fontDirectory = `${process.cwd()}/node_modules/@fontsource/noto-sans-devanagari/files`
  const [latinFont, indicFont, logoPng, signature, svg] = await Promise.all([
    readFile(`${fontDirectory}/noto-sans-devanagari-latin-400-normal.woff`),
    readFile(`${fontDirectory}/noto-sans-devanagari-devanagari-400-normal.woff`),
    readFile(`${process.cwd()}/public/logo/logoone256.png`),
    readFile(`${process.cwd()}/public/logo/license-issuer-signature.png`),
    readFile(`${process.cwd()}/public/artwork/18112026/03/license-certificate-watermark.svg`),
  ])
  const png = new Uint8Array(logoPng)
  const MockUrl = class extends URL {}
  Object.assign(MockUrl, {
    createObjectURL: vi.fn(() => 'blob:certificate-svg'),
    revokeObjectURL: vi.fn(),
  })
  vi.stubGlobal('URL', MockUrl)
  vi.stubGlobal('Image', class {
    naturalWidth = 800
    naturalHeight = 400
    src = ''
    decode = vi.fn().mockResolvedValue(undefined)
  })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => ({ drawImage: vi.fn() }) as unknown as CanvasRenderingContext2D,
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
    callback(new Blob([png], { type: 'image/png' }))
  })

  const fetchMock = vi.fn(async (url: string | URL | Request) => {
    const source = String(url)
    const bytes = source.includes('devanagari-400')
      ? indicFont
      : source.includes('license-issuer-signature')
        ? signature
        : source.endsWith('.svg')
          ? svg
          : latinFont
    const buffer = new ArrayBuffer(bytes.byteLength)
    new Uint8Array(buffer).set(bytes)
    return new Response(buffer)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('License certificate PDF', () => {
  it('uses a white, stroke-free embossed header logo', async () => {
    const logo = await readFile(
      `${process.cwd()}/public/artwork/18112026/03/license-certificate-logo.svg`,
      'utf8',
    )

    expect(logo).toContain('fill="#FFFFFF" stroke="none"')
    expect(logo).toContain('filter="url(#emboss)"')
    expect(logo).toContain('<filter id="emboss"')
  })

  it(
    'creates an A4 portrait summary with the product logo, signed entitlement, QR, and PDF metadata',
    async () => {
      const fetchMock = await mockCertificateAssets()

    const blob = await createLicenseCertificatePdf({
      institutionName: 'प्रशांत अकादमी',
      institutionAddress: '123 Education Road, Mumbai, Maharashtra, 400001',
      mode: 'active',
      licenseStatus: 'ACTIVE',
      licenseId: '1042',
      documentId: 'signed-document-001',
      serialNumber: 'PRTH-2026-PA001',
      edition: 'Coaching Institute Edition',
      licenseModel: 'on_premise_perpetual',
      expiresAt: null,
      issuedAt: '2026-11-15T12:00:00Z',
      entitlements: [{ key: 'Users', value: '25' }],
      verificationUrl: 'https://smritisys.com/api/license/verify?document_id=123e4567-e89b-42d3-a456-426614174000',
    })
    const pdf = await PDFDocument.load(await blob.arrayBuffer())

    expect(blob.type).toBe('application/pdf')
    expect(pdf.getPages()).toHaveLength(1)
    expect(pdf.getPages()[0].getSize().width).toBeCloseTo(595.28, 1)
    expect(pdf.getPages()[0].getSize().height).toBeCloseTo(841.89, 1)
    expect(pdf.getTitle()).toBe('PrathamOne EduOS Software License Certificate')
    expect(fetchMock).toHaveBeenCalledTimes(5)
    expect(fetchMock).toHaveBeenCalledWith('/artwork/18112026/03/license-certificate-logo.svg')
    expect(fetchMock).toHaveBeenCalledWith('/artwork/18112026/03/license-certificate-watermark.svg')
    expect(fetchMock).toHaveBeenCalledWith('/artwork/18112026/03/license-certificate-watermark.svg')
    expect(fetchMock).toHaveBeenCalledWith('/logo/license-issuer-signature.png')
  }, 15000)

  it(
    'keeps long organization, address, and entitlement content on A4 continuation pages',
    async () => {
      await mockCertificateAssets()

    const blob = await createLicenseCertificatePdf({
      institutionName: 'Long Institute Legal Name '.repeat(24),
      institutionAddress: 'Long registered address with locality and postal details, '.repeat(10),
      mode: 'evaluation',
      licenseStatus: 'ACTIVE',
      licenseId: '1042',
      documentId: 'signed-document-001',
      serialNumber: 'PRTH-2026-PA001',
      edition: 'Coaching Institute Edition',
      licenseModel: 'on_premise_subscription',
      expiresAt: '2000-01-01',
      issuedAt: '2026-11-15T12:00:00Z',
      entitlements: [{ key: 'Modules', value: 'Dashboard, reports, fees, admissions, and '.repeat(24) }],
      verificationUrl: null,
    })
    const pdf = await PDFDocument.load(await blob.arrayBuffer())
    expect(pdf.getPages().length).toBeGreaterThan(1)
    for (const page of pdf.getPages()) {
      expect(page.getSize().width).toBeCloseTo(595.28, 1)
      expect(page.getSize().height).toBeCloseTo(841.89, 1)
    }
  }, 15000)

  it(
    'creates a safe certificate when optional fields and the authority URL are unavailable',
    async () => {
      await mockCertificateAssets()

    const blob = await createLicenseCertificatePdf({
      institutionName: 'Organization name not recorded',
      institutionAddress: null,
      mode: 'evaluation',
      licenseStatus: null,
      licenseId: null,
      documentId: 'signed-document-optional-fields',
      serialNumber: null,
      edition: null,
      licenseModel: null,
      expiresAt: null,
      issuedAt: null,
      entitlements: [],
      verificationUrl: null,
    })
    const pdf = await PDFDocument.load(await blob.arrayBuffer())
    expect(pdf.getPages()).toHaveLength(1)
    expect(pdf.getPages()[0].getSize().height).toBeCloseTo(841.89, 1)
  }, 15000)

  it('formats signed entitlement values without exposing private bindings and labels inactive states', async () => {
    expect(formatLicenseCertificateEntitlements({
      users: 25,
      'company.binding': 'private-binding',
      'license.model': 'on_premise_perpetual',
      modules: ['fees', 'reports'],
      config: { feature: true, refresh_token: 'private-token' },
    })).toEqual([
      { key: 'Users', value: '25' },
      { key: 'Modules', value: 'fees, reports' },
      { key: 'Config', value: '{"feature":true}' },
    ])
    expect(getLicenseCertificateStatus('SUSPENDED', 'evaluation', null)).toBe('SUSPENDED')
    expect(getLicenseCertificateStatus('ACTIVE', 'evaluation', '2000-01-01')).toBe('EXPIRED')
  })

  it('groups only recorded signed entitlement values into the reference layout', () => {
    expect(groupLicenseCertificateEntitlements([
      { key: 'users', value: '25' },
      { key: 'allowed_branches', value: '2' },
      { key: 'modules', value: 'fees, reports' },
      { key: 'deployment_type', value: 'on-premise' },
      { key: 'Offline Lease Days', value: '14' },
    ])).toEqual({
      groups: [
        { label: 'Licensed Users', value: '25' },
        { label: 'Branches / locations', value: '2' },
        { label: 'Licensed modules', value: 'fees, reports' },
        { label: 'Deployment type', value: 'on-premise' },
      ],
      other: [{ key: 'Offline Lease Days', value: '14' }],
    })
    expect(groupLicenseCertificateEntitlements([]).groups.every(({ value }) =>
      value === 'Not recorded in signed snapshot',
    )).toBe(true)
    expect(formatLicenseCertificateDateTime('2026-11-24T09:00:00Z')).toContain('IST')
  })

  it('generates QR codes only for secure verification URLs', async () => {
    const qr = await createLicenseVerificationQrDataUrl('https://smritisys.com/api/license/verify?document_id=123e4567-e89b-42d3-a456-426614174000')
    expect(qr).toMatch(/^data:image\/png;base64,/)
    await expect(createLicenseVerificationQrDataUrl('http://smritisys.com/verify')).rejects.toThrow('HTTPS')
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

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
