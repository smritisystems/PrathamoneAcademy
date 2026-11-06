/**
 * @file        PrintDocumentBranding.test.tsx
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
 * @created     2026-11-05
 * @updated     2026-11-06
 *
 * @description Integration tests verifying reusable printable document branding headers, seals, and authorized signatories.
 */

import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  PrintDocumentHeader,
  PrintDocumentSignatory,
  PrintBrandingFooter,
} from '../components/PrintDocumentBranding'
import { PRINT_SHARE_BRANDING } from '../config/branding'

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('Printable Document Branding Components', () => {
  describe('PrintDocumentHeader Component', () => {
    it('renders the official document header with academy name, title, and reference', () => {
      renderWithQueryClient(
        <PrintDocumentHeader
          title="OFFICIAL FEE RECEIPT"
          documentRef="RCP-2026-0999"
          academicYear="2026-27"
          documentDate="05 Nov 2026"
          statusBadge="ORIGINAL COPY"
          statusBadgeColor="emerald"
        />
      )

      expect(screen.getByTestId('print-document-header')).toBeDefined()
      expect(screen.getByText('OFFICIAL FEE RECEIPT')).toBeDefined()
      expect(screen.getByText('REF: RCP-2026-0999')).toBeDefined()
      expect(screen.getByText(/Prashant Academy/i)).toBeDefined()
      expect(screen.getByText(/SESSION: AY 2026-27/i)).toBeDefined()
      expect(screen.getByText(/DATE: 05 Nov 2026/i)).toBeDefined()
      expect(screen.getByText('ORIGINAL COPY')).toBeDefined()
      expect(screen.getByText('PA')).toBeDefined()
    })

    it('renders custom institution information when provided', () => {
      const customInst = {
        name: 'Vanguard Academy',
        code: 'VA777',
        address: '100 Knowledge Boulevard',
        city: 'Thane',
        state: 'Maharashtra',
        pincode: '400601',
        phone: '+91-22-87654321',
        email: 'admin@vanguard.edu.in',
      }

      renderWithQueryClient(
        <PrintDocumentHeader
          title="STUDENT MERIT CERTIFICATE"
          documentRef="CERT-2026-001"
          institution={customInst}
          monogram="VA"
        />
      )

      expect(screen.getByText(/Vanguard Academy/i)).toBeDefined()
      expect(screen.getByText('CODE: VA777')).toBeDefined()
      expect(screen.getByText('VA')).toBeDefined()
      expect(screen.getByText(/100 Knowledge Boulevard, Thane, Maharashtra - 400601/i)).toBeDefined()
      expect(screen.getByText(/Ph: \+91-22-87654321/i)).toBeDefined()
    })

    it('supports compact layout for A5 documents and fee vouchers', () => {
      const { container } = renderWithQueryClient(
        <PrintDocumentHeader
          title="FEE INSTALLMENT VOUCHER"
          documentRef="VCH-01"
          compact={true}
        />
      )

      expect(screen.getByText('FEE INSTALLMENT VOUCHER')).toBeDefined()
      expect(container.querySelector('.text-lg')).toBeDefined()
    })
  })

  describe('PrintDocumentSignatory Component', () => {
    it('renders default authorized signatory layout with official stamp and DPDP compliance', () => {
      renderWithQueryClient(
        <PrintDocumentSignatory
          collectorName="Mr. Rajesh Sharma (Head Cashier)"
          generatedAt="05-Nov-2026 14:30:00"
          showStampBox={true}
          showDPDPNotice={true}
        />
      )

      expect(screen.getByTestId('print-document-signatory')).toBeDefined()
      expect(screen.getByText('Authorized Signatory')).toBeDefined()
      expect(screen.getByText('Mr. Rajesh Sharma (Head Cashier)')).toBeDefined()
      expect(screen.getByText('05-Nov-2026 14:30:00')).toBeDefined()
      expect(screen.getByText(/Official Seal/i)).toBeDefined()
      expect(screen.getByText(/Institution Stamp/i)).toBeDefined()
      expect(screen.getByText(/DPDP Act 2023/i)).toBeDefined()
      expect(screen.getByText(/Computer-generated official academic document/i)).toBeDefined()
    })

    it('renders parent / guardian signature line for student KYC and admission dossiers', () => {
      renderWithQueryClient(
        <PrintDocumentSignatory
          showParentSignature={true}
          parentSignatoryTitle="Parent / Legal Guardian Signature"
          showStampBox={false}
        />
      )

      expect(screen.getByText('Parent / Legal Guardian Signature')).toBeDefined()
      expect(screen.getByText(/Date: _______________/i)).toBeDefined()
      expect(screen.getByText('Authorized Signatory')).toBeDefined()
    })
  })

  describe('PrintBrandingFooter Component', () => {
    it('renders canonical understated branding text at the bottom', () => {
      renderWithQueryClient(<PrintBrandingFooter />)

      const footer = screen.getByTestId('print-share-branding-footer')
      expect(footer).toBeDefined()
      expect(screen.getByText(PRINT_SHARE_BRANDING.text)).toBeDefined()
      expect(screen.getByText(/PrathamOne EduOS · Coaching Institute Edition · prathamone.com/i)).toBeDefined()
    })

    it('defaults to center alignment and low-contrast 8pt font styling', () => {
      const { container } = renderWithQueryClient(<PrintBrandingFooter />)

      const footer = container.querySelector('[data-testid="print-share-branding-footer"]')
      expect(footer?.className).toContain('text-center')
      expect(footer?.className).toContain('justify-center')

      const textEl = footer?.querySelector('p')
      expect(textEl?.className).toContain('text-[8pt]')
      expect(textEl?.className).toContain('text-slate-400')
      expect(textEl?.className).toContain('font-light')
    })

    it('supports custom alignments (left, right) and dividers', () => {
      const { container: leftContainer } = renderWithQueryClient(
        <PrintBrandingFooter align="left" showDivider={true} />
      )
      const leftFooter = leftContainer.querySelector('[data-testid="print-share-branding-footer"]')
      expect(leftFooter?.className).toContain('text-left')
      expect(leftFooter?.className).toContain('border-t')

      const { container: rightContainer } = renderWithQueryClient(
        <PrintBrandingFooter align="right" />
      )
      const rightFooter = rightContainer.querySelector('[data-testid="print-share-branding-footer"]')
      expect(rightFooter?.className).toContain('text-right')
    })

    it('supports fixed bottom mode for repeating on multi-page print documents', () => {
      const { container } = renderWithQueryClient(
        <PrintBrandingFooter fixedBottom={true} />
      )
      const footer = container.querySelector('[data-testid="print-share-branding-footer"]')
      expect(footer?.className).toContain('print:fixed')
      expect(footer?.className).toContain('print:bottom-0')
    })

    it('is included automatically inside PrintDocumentSignatory', () => {
      renderWithQueryClient(<PrintDocumentSignatory />)
      expect(screen.getByTestId('print-share-branding-footer')).toBeDefined()
      expect(screen.getByText(PRINT_SHARE_BRANDING.text)).toBeDefined()
    })
  })
})