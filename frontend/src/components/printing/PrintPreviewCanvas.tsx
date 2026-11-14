/**
 * @file        PrintPreviewCanvas.tsx
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
 * @updated     2026-11-14
 *
 * @description True-to-scale visual print preview viewport with physical margin guides, scaling indicators, and page boundaries.
 */

import React, { useState, useRef, useEffect } from 'react'
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileCheck2,
  AlertTriangle,
  Info,
  Layers,
} from 'lucide-react'
import { useEnvironmentStore } from '../../store/environmentStore'
import { BRANDING_CONFIG, PRINT_FOOTER_BRANDING_TEXT } from '../../config/branding'
import { sanitizeRichHtml } from '../../utils/htmlSanitizer'
import type {
  PrintSettings,
  PrintLayoutCalculation,
} from '../../types/printing'

interface Props {
  contentRef?: React.RefObject<HTMLElement>
  contentHtml?: string
  layout: PrintLayoutCalculation
  settings: PrintSettings
}

export default function PrintPreviewCanvas({
  contentRef,
  contentHtml,
  layout,
  settings,
}: Props) {
  const [viewportZoom, setViewportZoom] = useState<number>(100) // Visual zoom of preview canvas (50% - 150%)
  const [showMarginGuides, setShowMarginGuides] = useState<boolean>(true)

  const previewSheetRef = useRef<HTMLDivElement>(null)

  // Paper aspect ratio (width / height)
  const paperAspect = layout.pageDimensionsMm.width / layout.pageDimensionsMm.height

  return (
    <div className="flex flex-col h-full bg-slate-900/90 rounded-2xl overflow-hidden border border-slate-700/80 shadow-inner">
      {/* ── Top Floating Toolbar & Dimension Badges ── */}
      <div className="bg-slate-950/80 backdrop-blur-md px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-indigo-950 text-indigo-300 border border-indigo-800/80 rounded-lg font-bold font-mono text-[11px] flex items-center gap-1.5">
            <FileCheck2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              {settings.paperSize} ({layout.pageDimensionsMm.width} × {layout.pageDimensionsMm.height} mm)
            </span>
          </span>

          <span
            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono border ${
              layout.isBelowReadabilityThreshold
                ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            Scale: {layout.scalePercentage}%
          </span>

          <span className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-bold font-mono flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-400" />
            <span>
              {layout.estimatedPages} {layout.estimatedPages === 1 ? 'Page' : 'Pages'}
            </span>
          </span>
        </div>

        {/* Viewport Zoom & Margin Guides Toggle */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-400 hover:text-slate-200">
            <input
              type="checkbox"
              checked={showMarginGuides}
              onChange={(e) => setShowMarginGuides(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-primary-600 accent-indigo-600"
            />
            <span>Guides</span>
          </label>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          <button
            type="button"
            onClick={() => setViewportZoom((z) => Math.max(50, z - 15))}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Zoom Out Canvas"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] text-slate-400 w-10 text-center">
            {viewportZoom}%
          </span>
          <button
            type="button"
            onClick={() => setViewportZoom((z) => Math.min(150, z + 15))}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Zoom In Canvas"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewportZoom(100)}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Reset Zoom"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Center Canvas: Simulated Physical Sheet ── */}
      <div className="flex-1 overflow-auto p-6 sm:p-8 flex items-center justify-center bg-slate-900 scrollbar-thin scrollbar-thumb-slate-700">
        <div
          ref={previewSheetRef}
          style={{
            transform: `scale(${viewportZoom / 100})`,
            transformOrigin: 'center center',
            transition: 'transform 0.15s ease-out',
            width: `${layout.pageDimensionsPx.width}px`,
            minHeight: `${layout.pageDimensionsPx.height}px`,
          }}
          className="bg-white text-slate-900 rounded-sm shadow-2xl relative transition-all mx-auto select-none overflow-hidden"
        >
          {/* Global Training / Demo Mode Watermark */}
          {typeof useEnvironmentStore?.getState === 'function' && useEnvironmentStore.getState()?.isTrainingMode && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30 select-none overflow-hidden opacity-15">
              <div className="transform -rotate-45 text-center">
                <div className="text-3xl md:text-5xl font-black tracking-widest text-amber-700 uppercase border-4 border-dashed border-amber-700 px-6 py-3 rounded-2xl">
                  DEMO REPORT — NOT FOR ACTUAL BUSINESS USE
                </div>
                <div className="text-xs md:text-sm font-bold text-amber-800 mt-2 tracking-wider">
                  PrathamOne EduOS · Training & Simulation Environment
                </div>
              </div>
            </div>
          )}

          {/* Visual Margin Guides Overlay */}
          {showMarginGuides && (
            <div
              style={{
                top: `${layout.marginsPx.top}px`,
                right: `${layout.marginsPx.right}px`,
                bottom: `${layout.marginsPx.bottom}px`,
                left: `${layout.marginsPx.left}px`,
              }}
              className="absolute pointer-events-none border border-dashed border-indigo-400/50 z-20"
              title="Printable Area Boundary"
            >
              <span className="absolute -top-3 left-1 text-[8px] font-mono text-primary-500 font-bold bg-white/90 px-1 rounded">
                Printable: {layout.printableAreaMm.width} × {layout.printableAreaMm.height} mm
              </span>
            </div>
          )}

          {/* Document Content Render Container with Intelligent Scaling */}
          <div
            style={{
              paddingTop: `${layout.marginsPx.top}px`,
              paddingRight: `${layout.marginsPx.right}px`,
              paddingBottom: `${layout.marginsPx.bottom}px`,
              paddingLeft: `${layout.marginsPx.left}px`,
              boxSizing: 'border-box',
              width: '100%',
              minHeight: `${layout.pageDimensionsPx.height}px`,
            }}
          >
            <div
              style={{
                transform: layout.effectiveScale !== 1.0 ? `scale(${layout.effectiveScale})` : undefined,
                transformOrigin: 'top left',
                width: layout.effectiveScale !== 1.0 ? `${(100 / layout.effectiveScale).toFixed(2)}%` : '100%',
              }}
            >
              {/* Cloned HTML or Direct Child Container */}
              {contentHtml ? (
                <div
                  dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(contentHtml) }}
                  className="preview-content-rendered"
                />
              ) : (
                <div className="p-4 text-center text-slate-400 italic text-xs">
                  Target element rendered on page. Content scaled to {layout.scalePercentage}%.
                </div>
              )}
            </div>
          </div>

          {/* Simulated Canonical Two-Row Global Print Footer Standard */}
          {settings.pageNumbering !== false && (
            <div
              className="absolute bottom-2 left-6 right-6 pt-1.5 border-t border-slate-200 pointer-events-none select-none bg-white/95"
              style={{
                left: `${layout.marginsPx.left}px`,
                right: `${layout.marginsPx.right}px`,
                bottom: `${Math.max(6, Math.round(layout.marginsPx.bottom / 3))}px`,
              }}
            >
              {/* Row 1: Right-Aligned */}
              <div
                data-testid="print-footer-row-1"
                className="flex items-center justify-end gap-1.5 text-slate-600 text-[9.5px] font-sans font-normal leading-tight text-right"
              >
                <span>{settings.confidentiality || 'Confidential'}</span>
                <span className="text-slate-400">·</span>
                <span>
                  Document ID: <span className="font-mono">{settings.documentId || 'DOC-001'}</span>
                </span>
                <span className="text-slate-400">·</span>
                <span>Page 1 of {layout.estimatedPages}</span>
              </div>

              {/* Row 2: Center-Aligned */}
              {settings.showSoftwareBranding !== false && (
                <div
                  data-testid="print-footer-row-2"
                  className="flex items-center justify-center gap-1.5 text-center text-slate-400 text-[7.5px] mt-0.5 leading-none tracking-normal font-light"
                >
                  <span>{settings.softwareBrandingText || PRINT_FOOTER_BRANDING_TEXT}</span>
                  <img
                    src={BRANDING_CONFIG.assets.softwareLogoSvgUrl}
                    alt="PrathamOne EduOS logo"
                    className="h-[7pt] w-auto max-w-[42pt] object-contain"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

