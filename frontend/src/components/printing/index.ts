/**
 * @file        index.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.printing
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
 * @description Centralized export barrel for Universal Print Fit & Page Layout Engine.
 */

export { default as UniversalPrintModal } from './UniversalPrintModal'
export type { UniversalPrintModalProps } from './UniversalPrintModal'
export { default as PrintSettingsPanel } from './PrintSettingsPanel'
export { default as PrintPreviewCanvas } from './PrintPreviewCanvas'
export { default as PrintFooter } from './PrintFooter'
export type { PrintFooterProps } from './PrintFooter'
export { useUniversalPrint } from '../../hooks/useUniversalPrint'
export * from '../../types/printing'
export * from '../../config/printPresets'
export * from '../../services/printLayoutEngine'

