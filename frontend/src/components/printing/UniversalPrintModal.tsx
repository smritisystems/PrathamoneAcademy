/**
 * @file        UniversalPrintModal.tsx
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
 * @updated     2026-11-08
 *
 * @description Centralized universal print dialog and live preview modal supporting A4, A5, A3, Letter, Legal, Thermal, and Custom paper.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Printer,
  FileDown,
  X,
  Maximize,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ShieldCheck,
} from 'lucide-react'
import type {
  PrintSettings,
  DocumentType,
  PrintLayoutCalculation,
} from '../../types/printing'
import {
  createDefaultPrintSettings,
  DOCUMENT_PRESETS,
} from '../../config/printPresets'
import {
  calculatePrintLayout,
  executeUniversalPrint,
} from '../../services/printLayoutEngine'
import PrintSettingsPanel from './PrintSettingsPanel'
import PrintPreviewCanvas from './PrintPreviewCanvas'

export interface UniversalPrintModalProps {
  isOpen: boolean
  onClose: () => void
  targetElementId?: string
  targetElement?: HTMLElement | null
  documentType?: DocumentType
  documentTitle?: string
  initialSettings?: Partial<PrintSettings>
  onAfterPrint?: () => void
}

export default function UniversalPrintModal({
  isOpen,
  onClose,
  targetElementId,
  targetElement,
  documentType = 'general_document',
  documentTitle,
  initialSettings,
  onAfterPrint,
}: UniversalPrintModalProps) {
  // 1. Settings State
  const defaultSettings = useMemo(
    () => ({
      ...createDefaultPrintSettings(documentType),
      ...(documentTitle ? { documentTitle } : {}),
      ...initialSettings,
    }),
    [documentType, documentTitle, initialSettings]
  )

  const [settings, setSettings] = useState<PrintSettings>(defaultSettings)
  const [contentDims, setContentDims] = useState<{ width: number; height: number }>({
    width: 794, // Default standard A4 px at 96 DPI
    height: 1123,
  })
  const [clonedHtml, setClonedHtml] = useState<string>('')
  const [isPrinting, setIsPrinting] = useState<boolean>(false)

  const resolvedDocType = settings.documentType || documentType
  const docPreset = DOCUMENT_PRESETS[resolvedDocType] || DOCUMENT_PRESETS.general_document
  const resolvedTitle = settings.documentTitle || documentTitle || docPreset.label

  // 2. Measure Target Element Dimensions & Extract Content on Open
  useEffect(() => {
    if (!isOpen) return

    let element: HTMLElement | null = targetElement || null
    if (!element && targetElementId) {
      element = document.getElementById(targetElementId)
    }

    if (element) {
      const rect = element.getBoundingClientRect()
      const scrollW = element.scrollWidth || rect.width || 794
      const scrollH = element.scrollHeight || rect.height || 1123

      setContentDims({
        width: Math.max(300, Math.round(scrollW)),
        height: Math.max(300, Math.round(scrollH)),
      })

      // Clone clean HTML without action buttons
      const clone = element.cloneNode(true) as HTMLElement
      clone.querySelectorAll('.no-print, .print\\:hidden, button, [role="button"]').forEach((el) => {
        el.parentNode?.removeChild(el)
      })
      setClonedHtml(clone.innerHTML)
    } else {
      // Fallback placeholder dimensions
      setContentDims({ width: 794, height: 1123 })
      setClonedHtml(
        `<div class="p-8 text-center text-slate-500">
          <h2 class="text-xl font-bold text-slate-900 mb-2">${resolvedTitle}</h2>
          <p class="text-xs">Authorized document preview container loaded.</p>
        </div>`
      )
    }
  }, [isOpen, targetElementId, targetElement, resolvedTitle])

  // 3. Recompute Layout Calculation
  const layout = useMemo<PrintLayoutCalculation>(() => {
    return calculatePrintLayout(contentDims, settings)
  }, [contentDims, settings])

  if (!isOpen) return null

  // 4. Update Settings Handler
  const handleSettingsChange = (updated: Partial<PrintSettings>) => {
    setSettings((prev) => ({ ...prev, ...updated }))
  }

  // 5. Reset Handler
  const handleReset = () => {
    setSettings(createDefaultPrintSettings(documentType))
  }

  // 6. Print Execution
  const handleExecutePrint = async (isPdfExport = false) => {
    setIsPrinting(true)
    try {
      let element: HTMLElement | null = targetElement || null
      if (!element && targetElementId) {
        element = document.getElementById(targetElementId)
      }

      if (!element) {
        // Fallback: create temporary container from cloned HTML
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = clonedHtml
        element = tempDiv
      }

      const printTitle = isPdfExport ? `${resolvedTitle} (PDF)` : resolvedTitle
      await executeUniversalPrint(element, settings, layout, printTitle)

      onAfterPrint?.()
    } catch (err) {
      console.error('[UniversalPrintModal] Print execution failed:', err)
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-dialog-title"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden">
        {/* ── Modal Header ── */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-900 text-white flex items-center justify-center shadow-sm">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="print-dialog-title" className="text-base font-extrabold text-slate-900">
                  Universal Print & Page Layout Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 text-primary-800 border border-indigo-200">
                  {docPreset.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Intelligent paper fit, orientation, margins, and readability optimization.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSettingsChange({ fitOption: 'fit-one-page', autoScale: true })}
              className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary-600" />
              <span>Fit One Page</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Close Print Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Modal Body: 2-Column Responsive Workspace ── */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Column: Live Visual Canvas (7 Cols) */}
          <div className="lg:col-span-7 p-4 sm:p-5 bg-slate-950 flex flex-col overflow-hidden">
            <PrintPreviewCanvas
              contentHtml={clonedHtml}
              layout={layout}
              settings={settings}
            />
          </div>

          {/* Right Column: Settings Controls (5 Cols) */}
          <div className="lg:col-span-5 p-5 bg-white border-l border-slate-200 overflow-y-auto scrollbar-thin">
            <PrintSettingsPanel
              settings={settings}
              onChange={handleSettingsChange}
              layout={layout}
              onReset={handleReset}
            />
          </div>
        </div>

        {/* ── Modal Action Footer ── */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>DPDP Act 2023 & CBSE compliant vector print output.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => handleExecutePrint(true)}
              disabled={isPrinting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              <span>Save as PDF</span>
            </button>

            <button
              type="button"
              onClick={() => handleExecutePrint(false)}
              disabled={isPrinting}
              className="px-5 py-2 bg-primary-600 hover:bg-primary-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>{isPrinting ? 'Preparing Print...' : 'Print Document'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

