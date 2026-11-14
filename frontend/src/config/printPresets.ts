/**
 * @file        printPresets.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.config
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-07
 * @updated     2026-11-14
 *
 * @description Canonical paper specifications, margin presets, and document-specific print defaults.
 */

import type {
  StandardPaperSize,
  PaperDimensionsMm,
  PrintMarginPreset,
  MarginsInMm,
  DocumentType,
  DocumentTypePreset,
  PrintSettings,
} from '../types/printing'
import { PRINT_FOOTER_BRANDING_TEXT } from './branding'

/**
 * Standard Physical Paper Dimensions in Millimeters (ISO 216 & North American)
 */
export const PAPER_DIMENSIONS: Record<StandardPaperSize, PaperDimensionsMm> = {
  A4: {
    width: 210,
    height: 297,
    name: 'A4',
    description: '210 × 297 mm (Standard Office & Forms)',
  },
  A5: {
    width: 148,
    height: 210,
    name: 'A5',
    description: '148 × 210 mm (Receipts & Small Vouchers)',
  },
  A3: {
    width: 297,
    height: 420,
    name: 'A3',
    description: '297 × 420 mm (Large Tabular & Poster Reports)',
  },
  Letter: {
    width: 215.9,
    height: 279.4,
    name: 'US Letter',
    description: '8.5 × 11 inches (215.9 × 279.4 mm)',
  },
  Legal: {
    width: 215.9,
    height: 355.6,
    name: 'US Legal',
    description: '8.5 × 14 inches (215.9 × 355.6 mm)',
  },
  Receipt80: {
    width: 80,
    height: 297,
    name: 'Thermal 80mm',
    description: '80 mm Continuous Roll (POS / Thermal Receipt)',
    isContinuousRoll: true,
  },
  Receipt58: {
    width: 58,
    height: 210,
    name: 'Thermal 58mm',
    description: '58 mm Mobile POS Thermal Roll',
    isContinuousRoll: true,
  },
  CR80: {
    width: 85.6,
    height: 53.98,
    name: 'ID Card (CR80)',
    description: '85.6 × 53.98 mm (Standard PVC ID Card)',
  },
  Custom: {
    width: 210,
    height: 297,
    name: 'Custom Size',
    description: 'User-specified width & height (mm)',
  },
}

/**
 * Standard Margin Presets in Millimeters
 */
export const MARGIN_PRESETS: Record<PrintMarginPreset, MarginsInMm> = {
  normal: { top: 15, right: 15, bottom: 15, left: 15 },
  narrow: { top: 7, right: 7, bottom: 7, left: 7 },
  minimum: { top: 3, right: 3, bottom: 3, left: 3 },
  none: { top: 0, right: 0, bottom: 0, left: 0 },
  custom: { top: 10, right: 10, bottom: 10, left: 10 },
}

/**
 * Document Type Configurations & Domain-Specific Presets
 */
export const DOCUMENT_PRESETS: Record<DocumentType, DocumentTypePreset> = {
  receipt: {
    documentType: 'receipt',
    label: 'Fee / Payment Receipt',
    defaultPaperSize: 'A5',
    defaultOrientation: 'portrait',
    defaultFitOption: 'fit-one-page',
    defaultMarginPreset: 'narrow',
    allowOnePageFit: true,
    allowMultiPage: false,
    suggestedMinScale: 60,
    repeatTableHeadersDefault: false,
    badgeColor: 'emerald',
  },
  invoice: {
    documentType: 'invoice',
    label: 'Commercial Tax Invoice',
    defaultPaperSize: 'A4',
    defaultOrientation: 'portrait',
    defaultFitOption: 'fit-one-page',
    defaultMarginPreset: 'normal',
    allowOnePageFit: true,
    allowMultiPage: true,
    suggestedMinScale: 65,
    repeatTableHeadersDefault: true,
    badgeColor: 'blue',
  },
  fee_receipt: {
    documentType: 'fee_receipt',
    label: 'Official Fee Voucher',
    defaultPaperSize: 'A5',
    defaultOrientation: 'portrait',
    defaultFitOption: 'fit-one-page',
    defaultMarginPreset: 'narrow',
    allowOnePageFit: true,
    allowMultiPage: false,
    suggestedMinScale: 60,
    repeatTableHeadersDefault: false,
    badgeColor: 'emerald',
  },
  fee_statement: {
    documentType: 'fee_statement',
    label: 'Student Fee Statement & Ledger',
    defaultPaperSize: 'A4',
    defaultOrientation: 'portrait',
    defaultFitOption: 'fit-width',
    defaultMarginPreset: 'normal',
    allowOnePageFit: true,
    allowMultiPage: true,
    suggestedMinScale: 50,
    repeatTableHeadersDefault: true,
    badgeColor: 'indigo',
  },
  student_report: {
    documentType: 'student_report',
    label: 'Student Academic Progress Report',
    defaultPaperSize: 'A4',
    defaultOrientation: 'portrait',
    defaultFitOption: 'fit-width',
    defaultMarginPreset: 'normal',
    allowOnePageFit: true,
    allowMultiPage: true,
    suggestedMinScale: 55,
    repeatTableHeadersDefault: true,
    badgeColor: 'purple',
  },
  report_card: {
    documentType: 'report_card',
    label: 'Graphical Marks Transcript',
    defaultPaperSize: 'A4',
    defaultOrientation: 'portrait',
    defaultFitOption: 'fit-one-page',
    defaultMarginPreset: 'narrow',
    allowOnePageFit: true,
    allowMultiPage: true,
    suggestedMinScale: 60,
    repeatTableHeadersDefault: true,
    badgeColor: 'blue',
  },
  teacher_payment: {
    documentType: 'teacher_payment',
    label: 'Teacher Remuneration Voucher',
    defaultPaperSize: 'A5',
    defaultOrientation: 'portrait',
    defaultFitOption: 'fit-one-page',
    defaultMarginPreset: 'narrow',
    allowOnePageFit: true,
    allowMultiPage: false,
    suggestedMinScale: 60,
    repeatTableHeadersDefault: false,
    badgeColor: 'amber',
  },
  payroll_report: {
    documentType: 'payroll_report',
    label: 'Monthly Staff Payroll Summary',
    defaultPaperSize: 'A4',
    defaultOrientation: 'landscape',
    defaultFitOption: 'fit-width',
    defaultMarginPreset: 'narrow',
    allowOnePageFit: true,
    allowMultiPage: true,
    suggestedMinScale: 45,
    repeatTableHeadersDefault: true,
    badgeColor: 'slate',
  },
  attendance_report: {
    documentType: 'attendance_report',
    label: 'Monthly Attendance Register',
    defaultPaperSize: 'A4',
    defaultOrientation: 'landscape',
    defaultFitOption: 'fit-width',
    defaultMarginPreset: 'narrow',
    allowOnePageFit: true,
    allowMultiPage: true,
    suggestedMinScale: 45,
    repeatTableHeadersDefault: true,
    badgeColor: 'slate',
  },
  examination_report: {
    documentType: 'examination_report',
    label: 'Examination Broad-Sheet',
    defaultPaperSize: 'A3',
    defaultOrientation: 'landscape',
    defaultFitOption: 'fit-width',
    defaultMarginPreset: 'narrow',
    allowOnePageFit: true,
    allowMultiPage: true,
    suggestedMinScale: 40,
    repeatTableHeadersDefault: true,
    badgeColor: 'indigo',
  },
  certificate: {
    documentType: 'certificate',
    label: 'Official Institute Certificate',
    defaultPaperSize: 'A4',
    defaultOrientation: 'landscape',
    defaultFitOption: 'original',
    defaultMarginPreset: 'minimum',
    allowOnePageFit: true,
    allowMultiPage: false,
    suggestedMinScale: 80,
    repeatTableHeadersDefault: false,
    badgeColor: 'amber',
  },
  academic_report: {
    documentType: 'academic_report',
    label: 'Curriculum & Academic Audit Report',
    defaultPaperSize: 'A4',
    defaultOrientation: 'portrait',
    defaultFitOption: 'fit-width',
    defaultMarginPreset: 'normal',
    allowOnePageFit: false,
    allowMultiPage: true,
    suggestedMinScale: 50,
    repeatTableHeadersDefault: true,
    badgeColor: 'purple',
  },
  employee_dossier: {
    documentType: 'employee_dossier',
    label: 'Official Employee Dossier & KYC Record',
    defaultPaperSize: 'A4',
    defaultOrientation: 'portrait',
    defaultFitOption: 'shrink-oversized',
    defaultMarginPreset: 'normal',
    allowOnePageFit: false,
    allowMultiPage: true,
    suggestedMinScale: 55,
    repeatTableHeadersDefault: true,
    badgeColor: 'indigo',
  },
  id_card: {
    documentType: 'id_card',
    label: 'Student / Staff ID Smart Card',
    defaultPaperSize: 'CR80',
    defaultOrientation: 'landscape',
    defaultFitOption: 'original',
    defaultMarginPreset: 'none',
    allowOnePageFit: true,
    allowMultiPage: false,
    suggestedMinScale: 90,
    repeatTableHeadersDefault: false,
    badgeColor: 'blue',
  },
  form: {
    documentType: 'form',
    label: 'Statutory Form & KYC Sheet (CBSE)',
    defaultPaperSize: 'A4',
    defaultOrientation: 'portrait',
    defaultFitOption: 'original',
    defaultMarginPreset: 'normal',
    allowOnePageFit: true,
    allowMultiPage: true,
    suggestedMinScale: 60,
    repeatTableHeadersDefault: true,
    badgeColor: 'slate',
  },
  general_table: {
    documentType: 'general_table',
    label: 'Tabular Data & Excel Export Grid',
    defaultPaperSize: 'A4',
    defaultOrientation: 'landscape',
    defaultFitOption: 'fit-width',
    defaultMarginPreset: 'narrow',
    allowOnePageFit: true,
    allowMultiPage: true,
    suggestedMinScale: 45,
    repeatTableHeadersDefault: true,
    badgeColor: 'slate',
  },
  general_document: {
    documentType: 'general_document',
    label: 'General Document',
    defaultPaperSize: 'A4',
    defaultOrientation: 'portrait',
    defaultFitOption: 'shrink-oversized',
    defaultMarginPreset: 'normal',
    allowOnePageFit: true,
    allowMultiPage: true,
    suggestedMinScale: 50,
    repeatTableHeadersDefault: true,
    badgeColor: 'slate',
  },
}

/**
 * Creates default PrintSettings initialized for a specific DocumentType.
 */
export function createDefaultPrintSettings(docType: DocumentType = 'general_document'): PrintSettings {
  const preset = DOCUMENT_PRESETS[docType] || DOCUMENT_PRESETS.general_document

  const defaultConfidentiality =
    docType === 'fee_receipt' || docType === 'receipt'
      ? 'Official Fee Voucher'
      : docType === 'report_card' || docType === 'examination_report'
      ? 'Official Academic Record'
      : docType === 'employee_dossier'
      ? 'Strictly Confidential'
      : docType === 'teacher_payment' || docType === 'payroll_report'
      ? 'Confidential Remuneration Record'
      : 'Confidential'

  return {
    paperSize: preset.defaultPaperSize,
    orientation: preset.defaultOrientation,
    fitOption: preset.defaultFitOption,
    marginPreset: preset.defaultMarginPreset,
    scale: 100,
    autoScale: preset.defaultFitOption !== 'original',
    printBackground: true,
    includeAppHeaderFooter: false,
    pageNumbering: preset.allowMultiPage,
    repeatTableHeaders: preset.repeatTableHeadersDefault,
    minimumScaleThreshold: preset.suggestedMinScale,
    documentType: docType,
    documentTitle: preset.label,
    confidentiality: defaultConfidentiality,
    documentId: `DOC-001`,
    showSoftwareBranding: true,
    softwareBrandingText: PRINT_FOOTER_BRANDING_TEXT,
    fixedFooter: preset.allowMultiPage,
  }
}

