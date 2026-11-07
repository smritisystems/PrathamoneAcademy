/**
 * @file        printing.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.types
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
 * @description Centralized type definitions for Universal Print Fit & Page Layout Engine.
 */

export type StandardPaperSize =
  | 'A4'
  | 'A5'
  | 'A3'
  | 'Letter'
  | 'Legal'
  | 'Receipt80'
  | 'Receipt58'
  | 'CR80'
  | 'Custom'

export type PrintOrientation = 'portrait' | 'landscape' | 'auto'

export type PrintFitOption =
  | 'fit-one-page'
  | 'fit-width'
  | 'fit-height'
  | 'original'
  | 'shrink-oversized'
  | 'multi-page'

export type PrintMarginPreset = 'normal' | 'narrow' | 'minimum' | 'none' | 'custom'

export interface MarginsInMm {
  top: number
  right: number
  bottom: number
  left: number
}

export interface PaperDimensionsMm {
  width: number
  height: number
  name: string
  description?: string
  isContinuousRoll?: boolean
}

export type DocumentType =
  | 'receipt'
  | 'invoice'
  | 'fee_receipt'
  | 'fee_statement'
  | 'student_report'
  | 'report_card'
  | 'teacher_payment'
  | 'payroll_report'
  | 'attendance_report'
  | 'examination_report'
  | 'certificate'
  | 'academic_report'
  | 'employee_dossier'
  | 'id_card'
  | 'form'
  | 'general_table'
  | 'general_document'

export interface PrintSettings {
  paperSize: StandardPaperSize
  customDimensions?: { width: number; height: number } // in mm
  orientation: PrintOrientation
  fitOption: PrintFitOption
  marginPreset: PrintMarginPreset
  customMargins?: MarginsInMm
  scale: number // e.g., 100 for 100%, 75 for 75%
  autoScale: boolean
  printBackground: boolean
  includeAppHeaderFooter: boolean
  pageNumbering: boolean
  repeatTableHeaders: boolean
  minimumScaleThreshold: number // default 50%
  documentType?: DocumentType
  documentTitle?: string
  documentId?: string
  confidentiality?: string
  showSoftwareBranding?: boolean
  softwareBrandingText?: string
  fixedFooter?: boolean
}

export interface PrintLayoutCalculation {
  pageDimensionsMm: { width: number; height: number }
  marginsMm: MarginsInMm
  printableAreaMm: { width: number; height: number }
  pageDimensionsPx: { width: number; height: number }
  marginsPx: { top: number; right: number; bottom: number; left: number }
  printableAreaPx: { width: number; height: number }
  contentDimensionsPx: { width: number; height: number }
  effectiveScale: number // multiplier e.g. 0.85
  scalePercentage: number // integer e.g. 85
  estimatedPages: number
  isScaledDown: boolean
  isBelowReadabilityThreshold: boolean
  readabilityWarning?: string
  fitModeApplied: PrintFitOption
}

export interface DocumentTypePreset {
  documentType: DocumentType
  label: string
  defaultPaperSize: StandardPaperSize
  defaultOrientation: PrintOrientation
  defaultFitOption: PrintFitOption
  defaultMarginPreset: PrintMarginPreset
  allowOnePageFit: boolean
  allowMultiPage: boolean
  suggestedMinScale: number
  repeatTableHeadersDefault: boolean
  badgeColor?: 'blue' | 'emerald' | 'amber' | 'indigo' | 'purple' | 'slate'
}

