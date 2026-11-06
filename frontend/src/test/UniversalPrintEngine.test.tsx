/**
 * @file        UniversalPrintEngine.test.tsx
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
 * @created     2026-11-07
 * @updated     2026-11-07
 *
 * @description Comprehensive unit, layout mathematics, readability, and UI integration test suite for Universal Print Engine.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  mmToPx,
  pxToMm,
  resolvePaperDimensionsMm,
  resolveMarginsMm,
  calculatePrintLayout,
  generateUniversalPrintCss,
} from '../services/printLayoutEngine'
import {
  PAPER_DIMENSIONS,
  MARGIN_PRESETS,
  DOCUMENT_PRESETS,
  createDefaultPrintSettings,
} from '../config/printPresets'
import type { PrintSettings } from '../types/printing'
import PrintSettingsPanel from '../components/printing/PrintSettingsPanel'
import PrintPreviewCanvas from '../components/printing/PrintPreviewCanvas'
import UniversalPrintModal from '../components/printing/UniversalPrintModal'

describe('Universal Print Engine — Physical Dimension & Unit Conversion', () => {
  it('converts millimeters to pixels and back with precision (96 DPI)', () => {
    // 25.4 mm = 1 inch = 96 pixels at 96 DPI
    expect(mmToPx(25.4)).toBe(96)
    expect(pxToMm(96)).toBe(25.4)

    // A4 width: 210 mm ≈ 793.70 px
    const a4Px = mmToPx(210)
    expect(a4Px).toBeCloseTo(793.7, 0)
    expect(pxToMm(a4Px)).toBeCloseTo(210, 0)
  })

  it('provides authoritative ISO 216 and US paper sizes', () => {
    expect(PAPER_DIMENSIONS.A4).toEqual(expect.objectContaining({ width: 210, height: 297 }))
    expect(PAPER_DIMENSIONS.A5).toEqual(expect.objectContaining({ width: 148, height: 210 }))
    expect(PAPER_DIMENSIONS.A3).toEqual(expect.objectContaining({ width: 297, height: 420 }))
    expect(PAPER_DIMENSIONS.Letter).toEqual(expect.objectContaining({ width: 215.9, height: 279.4 }))
    expect(PAPER_DIMENSIONS.Legal).toEqual(expect.objectContaining({ width: 215.9, height: 355.6 }))
    expect(PAPER_DIMENSIONS.Receipt80).toEqual(expect.objectContaining({ width: 80, isContinuousRoll: true }))
    expect(PAPER_DIMENSIONS.CR80).toEqual(expect.objectContaining({ width: 85.6, height: 53.98 }))
  })
})

describe('Universal Print Engine — Orientation and Margin Resolution', () => {
  it('correctly inverts width and height for Landscape orientation', () => {
    const settings = createDefaultPrintSettings('general_document')
    settings.paperSize = 'A4'
    settings.orientation = 'landscape'

    const dims = resolvePaperDimensionsMm(settings)
    expect(dims.width).toBe(297) // Landscape: width is the larger dimension
    expect(dims.height).toBe(210) // Landscape: height is the smaller dimension
  })

  it('correctly maintains vertical dimensions for Portrait orientation', () => {
    const settings = createDefaultPrintSettings('general_document')
    settings.paperSize = 'A4'
    settings.orientation = 'portrait'

    const dims = resolvePaperDimensionsMm(settings)
    expect(dims.width).toBe(210)
    expect(dims.height).toBe(297)
  })

  it('resolves margins for Normal, Narrow, Minimum, and special sizes', () => {
    const a4Settings = createDefaultPrintSettings('general_document')
    a4Settings.paperSize = 'A4'
    a4Settings.marginPreset = 'normal'
    expect(resolveMarginsMm(a4Settings)).toEqual({ top: 15, right: 15, bottom: 15, left: 15 })

    // A5 special optimization: 10mm margin instead of 15mm for maximum printable area
    const a5Settings = createDefaultPrintSettings('receipt')
    a5Settings.paperSize = 'A5'
    a5Settings.marginPreset = 'normal'
    expect(resolveMarginsMm(a5Settings)).toEqual({ top: 10, right: 10, bottom: 10, left: 10 })

    // Narrow margins: 7mm
    a4Settings.marginPreset = 'narrow'
    expect(resolveMarginsMm(a4Settings)).toEqual({ top: 7, right: 7, bottom: 7, left: 7 })

    // Minimum margins: 3mm
    a4Settings.marginPreset = 'minimum'
    expect(resolveMarginsMm(a4Settings)).toEqual({ top: 3, right: 3, bottom: 3, left: 3 })

    // CR80 ID Card: 0mm borderless margin
    const idSettings = createDefaultPrintSettings('id_card')
    expect(resolveMarginsMm(idSettings)).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
  })
})

describe('Universal Print Engine — Intelligent Scaling & Fit Algorithms', () => {
  it('calculates Fit Entire Document on One Page scaling accurately', () => {
    const settings = createDefaultPrintSettings('invoice')
    settings.paperSize = 'A4'
    settings.orientation = 'portrait'
    settings.marginPreset = 'normal' // 15mm each side => printable: 180 × 267 mm
    settings.fitOption = 'fit-one-page'
    settings.autoScale = true

    // Document is 1000px wide by 1800px tall
    const contentDims = { width: 1000, height: 1800 }
    const layout = calculatePrintLayout(contentDims, settings)

    // Printable width px: 180 mm * (96/25.4) ≈ 680.31 px
    // Printable height px: 267 mm * (96/25.4) ≈ 1009.13 px
    // scaleW = 680.31 / 1000 = 0.6803
    // scaleH = 1009.13 / 1800 = 0.5606
    // Expected effectiveScale = min(0.6803, 0.5606) ≈ 0.5606 (56%)
    expect(layout.scalePercentage).toBeLessThanOrEqual(57)
    expect(layout.scalePercentage).toBeGreaterThanOrEqual(55)
    expect(layout.estimatedPages).toBe(1) // Always 1 page when fit-one-page is chosen
  })

  it('calculates Fit to Page Width allowing vertical multi-page flow', () => {
    const settings = createDefaultPrintSettings('fee_statement')
    settings.paperSize = 'A4'
    settings.orientation = 'portrait'
    settings.marginPreset = 'normal' // printable width ≈ 680 px
    settings.fitOption = 'fit-width'
    settings.autoScale = true

    // Long table: 1000px wide by 3000px tall
    const contentDims = { width: 1000, height: 3000 }
    const layout = calculatePrintLayout(contentDims, settings)

    // Scale should be based purely on width (≈ 68%)
    expect(layout.scalePercentage).toBeCloseTo(68, -1)
    // Scaled height: 3000 * 0.68 = 2040 px. Printable height ≈ 1009 px => Estimated pages: ceil(2040 / 1009) = 3 pages
    expect(layout.estimatedPages).toBe(3)
  })

  it('preserves 100% scale in Original mode without stretching or shrinking', () => {
    const settings = createDefaultPrintSettings('certificate')
    settings.fitOption = 'original'
    settings.autoScale = true

    const contentDims = { width: 800, height: 600 }
    const layout = calculatePrintLayout(contentDims, settings)

    expect(layout.effectiveScale).toBe(1.0)
    expect(layout.scalePercentage).toBe(100)
    expect(layout.isScaledDown).toBe(false)
  })

  it('only shrinks oversized content in shrink-oversized mode', () => {
    const settings = createDefaultPrintSettings('general_document')
    settings.fitOption = 'shrink-oversized'
    settings.autoScale = true

    // Case 1: Small content (fits inside printable area) -> 100%
    const smallContent = { width: 500, height: 700 }
    const layoutSmall = calculatePrintLayout(smallContent, settings)
    expect(layoutSmall.effectiveScale).toBe(1.0)
    expect(layoutSmall.scalePercentage).toBe(100)

    // Case 2: Oversized content -> shrinks to fit printable width
    const largeContent = { width: 1200, height: 700 }
    const layoutLarge = calculatePrintLayout(largeContent, settings)
    expect(layoutLarge.scalePercentage).toBeLessThan(100)
  })
})

describe('Universal Print Engine — Readability Protection Safeguards', () => {
  it('triggers readability warning when scale is below minimum threshold', () => {
    const settings = createDefaultPrintSettings('invoice')
    settings.fitOption = 'fit-one-page'
    settings.minimumScaleThreshold = 50 // 50% threshold

    // Extremely huge document: 2000px wide by 5000px tall
    const hugeContent = { width: 2000, height: 5000 }
    const layout = calculatePrintLayout(hugeContent, settings)

    expect(layout.scalePercentage).toBeLessThan(50)
    expect(layout.isBelowReadabilityThreshold).toBe(true)
    expect(layout.readabilityWarning).toBeDefined()
    expect(layout.readabilityWarning).toContain('below the recommended 50% readability threshold')
  })

  it('does NOT trigger readability warning when scale is above threshold', () => {
    const settings = createDefaultPrintSettings('receipt')
    settings.minimumScaleThreshold = 50

    // Reasonable document size: 700px by 900px
    const content = { width: 700, height: 900 }
    const layout = calculatePrintLayout(content, settings)

    expect(layout.scalePercentage).toBeGreaterThanOrEqual(50)
    expect(layout.isBelowReadabilityThreshold).toBe(false)
    expect(layout.readabilityWarning).toBeUndefined()
  })
})

describe('Universal Print Engine — Dynamic CSS Generation', () => {
  it('generates compliant @page rule and container scaling styles', () => {
    const settings = createDefaultPrintSettings('invoice')
    settings.paperSize = 'A4'
    settings.orientation = 'portrait'
    settings.marginPreset = 'normal'
    settings.repeatTableHeaders = true
    settings.printBackground = true

    const layout = calculatePrintLayout({ width: 1000, height: 1200 }, settings)
    const css = generateUniversalPrintCss(layout, settings)

    expect(css).toContain('@page')
    expect(css).toContain('size: 210mm 297mm;')
    expect(css).toContain('margin: 15mm 15mm 15mm 15mm;')
    expect(css).toContain('thead { display: table-header-group !important; }')
    expect(css).toContain('-webkit-print-color-adjust: exact !important;')
    expect(css).toContain('#universal-print-container')
  })
})

describe('Universal Print Engine — Component UI & Modal Integration', () => {
  it('renders PrintSettingsPanel with all controls, paper dropdown, and fit options', () => {
    const settings = createDefaultPrintSettings('general_document')
    const layout = calculatePrintLayout({ width: 794, height: 1123 }, settings)
    const onChange = vi.fn()
    const onReset = vi.fn()

    render(
      <PrintSettingsPanel
        settings={settings}
        onChange={onChange}
        layout={layout}
        onReset={onReset}
      />
    )

    // Verify paper select dropdown exists
    expect(screen.getByText(/Paper Size & Physical Dimensions/i)).toBeDefined()
    expect(screen.getByRole('combobox')).toBeDefined()

    // Verify Fit options are rendered
    expect(screen.getByText('Fit 1 Page')).toBeDefined()
    expect(screen.getByText('Fit Width')).toBeDefined()
    expect(screen.getByText('Original (100%)')).toBeDefined()

    // Change orientation to landscape
    fireEvent.click(screen.getByRole('button', { name: /landscape/i }))
    expect(onChange).toHaveBeenCalledWith({ orientation: 'landscape' })

    // Change fit option to fit-one-page
    fireEvent.click(screen.getByText('Fit 1 Page'))
    expect(onChange).toHaveBeenCalledWith({ fitOption: 'fit-one-page', autoScale: true })
  })

  it('renders PrintPreviewCanvas with dimensions and scale badges', () => {
    const settings = createDefaultPrintSettings('invoice')
    const layout = calculatePrintLayout({ width: 800, height: 1100 }, settings)

    render(
      <PrintPreviewCanvas
        contentHtml="<div id='test-content'><h1>PRASHANT ACADEMY INVOICE</h1></div>"
        layout={layout}
        settings={settings}
      />
    )

    // Verify paper badge
    expect(screen.getByText(/A4 \(210 × 297 mm\)/i)).toBeDefined()
    // Verify scale badge
    expect(screen.getByText(new RegExp(`Scale: ${layout.scalePercentage}%`, 'i'))).toBeDefined()
    // Verify rendered content is in preview
    expect(screen.getByText('PRASHANT ACADEMY INVOICE')).toBeDefined()
  })

  it('opens UniversalPrintModal and renders print and PDF export buttons', () => {
    const onClose = vi.fn()
    const onAfterPrint = vi.fn()

    render(
      <UniversalPrintModal
        isOpen={true}
        onClose={onClose}
        documentType="fee_receipt"
        documentTitle="Official Fee Receipt #REC-2026-0042"
        onAfterPrint={onAfterPrint}
      />
    )

    // Check modal title
    expect(screen.getByText('Universal Print & Page Layout Studio')).toBeDefined()
    expect(screen.getByText('Official Fee Voucher')).toBeDefined()

    // Check actions
    expect(screen.getByRole('button', { name: /Print Document/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Save as PDF/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeDefined()

    // Cancel closes modal
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

