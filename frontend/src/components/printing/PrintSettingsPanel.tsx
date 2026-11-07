/**
 * @file        PrintSettingsPanel.tsx
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
 * @description Centralized print settings control panel for paper size, orientation, fit modes, and margins.
 */

import React from 'react'
import {
  FileText,
  Sliders,
  Maximize2,
  Minimize2,
  RotateCw,
  AlertTriangle,
  CheckCircle2,
  Check,
  RefreshCw,
} from 'lucide-react'
import type {
  PrintSettings,
  StandardPaperSize,
  PrintOrientation,
  PrintFitOption,
  PrintMarginPreset,
  PrintLayoutCalculation,
} from '../../types/printing'
import { PAPER_DIMENSIONS, MARGIN_PRESETS } from '../../config/printPresets'

interface Props {
  settings: PrintSettings
  onChange: (updated: Partial<PrintSettings>) => void
  layout: PrintLayoutCalculation
  onReset: () => void
}

export default function PrintSettingsPanel({
  settings,
  onChange,
  layout,
  onReset,
}: Props) {
  const paperOptions: StandardPaperSize[] = [
    'A4',
    'A5',
    'A3',
    'Letter',
    'Legal',
    'Receipt80',
    'Receipt58',
    'CR80',
    'Custom',
  ]

  const fitOptions: { key: PrintFitOption; label: string; desc: string }[] = [
    { key: 'fit-one-page', label: 'Fit 1 Page', desc: 'Scale entire document to single sheet' },
    { key: 'fit-width', label: 'Fit Width', desc: 'Scale to width; multi-page vertical flow' },
    { key: 'original', label: 'Original (100%)', desc: 'Unscaled original document size' },
    { key: 'shrink-oversized', label: 'Shrink Oversized', desc: 'Scale down only if overflowing' },
    { key: 'multi-page', label: 'Multi-Page Flow', desc: 'Natural page breaks across sheets' },
  ]

  const marginOptions: { key: PrintMarginPreset; label: string; mm: string }[] = [
    { key: 'normal', label: 'Normal', mm: '15 mm' },
    { key: 'narrow', label: 'Narrow', mm: '7 mm' },
    { key: 'minimum', label: 'Minimum', mm: '3 mm' },
    { key: 'none', label: 'None', mm: '0 mm' },
    { key: 'custom', label: 'Custom', mm: 'User' },
  ]

  return (
    <div className="space-y-5 text-xs text-slate-700 select-none">
      {/* ── Readability Safeguard Alert Banner ── */}
      {layout.isBelowReadabilityThreshold && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-amber-900 shadow-xs">
          <div className="flex items-center gap-1.5 font-bold text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Readability Alert: High Reduction</span>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-800/90">
            {layout.readabilityWarning}
          </p>
          <div className="pt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChange({ fitOption: 'fit-width', autoScale: true })}
              className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-[10px] shadow-2xs"
            >
              Switch to Fit Width
            </button>
            <button
              type="button"
              onClick={() => onChange({ fitOption: 'multi-page', autoScale: false, scale: 100 })}
              className="px-2 py-1 bg-white border border-amber-300 hover:bg-amber-100/60 text-amber-900 rounded font-bold text-[10px]"
            >
              100% Multi-Page
            </button>
          </div>
        </div>
      )}

      {/* ── 1. Paper Size ── */}
      <div className="space-y-1.5">
        <label className="font-bold text-slate-800 flex items-center justify-between">
          <span>Paper Size & Physical Dimensions</span>
          <span className="text-[10px] text-slate-400 font-mono">
            {layout.pageDimensionsMm.width} × {layout.pageDimensionsMm.height} mm
          </span>
        </label>
        <select
          value={settings.paperSize}
          onChange={(e) => onChange({ paperSize: e.target.value as StandardPaperSize })}
          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
        >
          {paperOptions.map((opt) => (
            <option key={opt} value={opt}>
              {PAPER_DIMENSIONS[opt].name} — {PAPER_DIMENSIONS[opt].description}
            </option>
          ))}
        </select>

        {/* Custom Paper Dimension Inputs */}
        {settings.paperSize === 'Custom' && (
          <div className="grid grid-cols-2 gap-2 pt-1.5">
            <div>
              <span className="text-[10px] text-slate-500 font-medium">Width (mm)</span>
              <input
                type="number"
                min="20"
                max="1000"
                value={settings.customDimensions?.width || 210}
                onChange={(e) =>
                  onChange({
                    customDimensions: {
                      width: Number(e.target.value) || 210,
                      height: settings.customDimensions?.height || 297,
                    },
                  })
                }
                className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-medium">Height (mm)</span>
              <input
                type="number"
                min="20"
                max="1000"
                value={settings.customDimensions?.height || 297}
                onChange={(e) =>
                  onChange({
                    customDimensions: {
                      width: settings.customDimensions?.width || 210,
                      height: Number(e.target.value) || 297,
                    },
                  })
                }
                className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Orientation ── */}
      <div className="space-y-1.5">
        <label className="font-bold text-slate-800">Page Orientation</label>
        <div className="grid grid-cols-3 gap-1.5">
          {(['portrait', 'landscape', 'auto'] as PrintOrientation[]).map((orient) => {
            const isSelected = settings.orientation === orient
            return (
              <button
                type="button"
                key={orient}
                onClick={() => onChange({ orientation: orient })}
                className={`py-2 px-2.5 rounded-xl border text-center font-semibold capitalize transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                {orient}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 3. Page Fit Mode ── */}
      <div className="space-y-1.5">
        <label className="font-bold text-slate-800 flex items-center justify-between">
          <span>Intelligent Scaling & Fit</span>
          <span className="text-[10px] font-bold text-indigo-700 font-mono">
            {layout.scalePercentage}% scale
          </span>
        </label>
        <div className="space-y-1">
          {fitOptions.map((fit) => {
            const isSelected = settings.fitOption === fit.key && settings.autoScale
            return (
              <button
                type="button"
                key={fit.key}
                onClick={() => onChange({ fitOption: fit.key, autoScale: true })}
                className={`w-full p-2 rounded-xl border text-left flex items-start justify-between transition-all ${
                  isSelected
                    ? 'bg-indigo-50/70 border-indigo-500 text-indigo-950 font-bold shadow-2xs'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div>
                  <div className="font-bold">{fit.label}</div>
                  <div className="text-[10px] text-slate-500 font-normal leading-tight">
                    {fit.desc}
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 4. Manual Scale Slider ── */}
      <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
        <div className="flex items-center justify-between font-bold text-slate-800">
          <span>Manual Zoom & Scale</span>
          <span className="font-mono text-indigo-700 text-xs">{settings.scale}%</span>
        </div>
        <input
          type="range"
          min="30"
          max="200"
          step="5"
          value={settings.scale}
          onChange={(e) => onChange({ scale: Number(e.target.value), autoScale: false })}
          className="w-full accent-indigo-600 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
          <span>30%</span>
          <span>100% (Original)</span>
          <span>200%</span>
        </div>
      </div>

      {/* ── 5. Margins ── */}
      <div className="space-y-1.5">
        <label className="font-bold text-slate-800">Page Margins</label>
        <div className="grid grid-cols-4 gap-1">
          {marginOptions.map((m) => {
            const isSelected = settings.marginPreset === m.key
            return (
              <button
                type="button"
                key={m.key}
                onClick={() => onChange({ marginPreset: m.key })}
                className={`py-1.5 px-2 rounded-lg border text-center transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-2xs'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="font-semibold capitalize text-[11px]">{m.label}</div>
                <div className={`text-[9px] ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {m.mm}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 6. Global Footer Governance Controls ── */}
      <div className="space-y-3 pt-2 border-t border-slate-200">
        <label className="font-bold text-slate-800 flex items-center justify-between">
          <span>Print Footer & Governance</span>
          <span className="text-[10px] text-indigo-600 font-mono">Row 1 & 2 Standard</span>
        </label>

        <div className="space-y-1.5">
          <span className="text-[11px] text-slate-600 font-medium">Confidentiality Classification</span>
          <div className="grid grid-cols-2 gap-1">
            {[
              { id: 'Confidential', label: 'Confidential' },
              { id: 'Strictly Confidential', label: 'Strictly Confid.' },
              { id: 'Official Record', label: 'Official Record' },
              { id: 'Internal Only', label: 'Internal Only' },
            ].map((c) => {
              const isSelected = (settings.confidentiality || 'Confidential') === c.id
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => onChange({ confidentiality: c.id })}
                  className={`py-1 px-2 rounded-lg text-[10px] font-semibold border text-center transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] text-slate-600 font-medium">Document ID Reference</span>
          <input
            type="text"
            value={settings.documentId || ''}
            onChange={(e) => onChange({ documentId: e.target.value })}
            placeholder="DOC-001"
            className="w-full text-xs font-mono border border-slate-200 rounded-lg p-1.5 bg-white text-slate-800"
          />
        </div>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="font-medium text-slate-800">Repeat Fixed Footer on Multi-Page</span>
          <input
            type="checkbox"
            checked={settings.fixedFooter ?? true}
            onChange={(e) => onChange({ fixedFooter: e.target.checked })}
            className="w-4 h-4 rounded text-indigo-600 accent-indigo-600"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="font-medium text-slate-800">Show Software Branding (Row 2)</span>
          <input
            type="checkbox"
            checked={settings.showSoftwareBranding ?? true}
            onChange={(e) => onChange({ showSoftwareBranding: e.target.checked })}
            className="w-4 h-4 rounded text-indigo-600 accent-indigo-600"
          />
        </label>
      </div>

      {/* ── 7. Advanced Toggles ── */}
      <div className="space-y-2 pt-1 border-t border-slate-200">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="font-medium text-slate-800">Print Background Graphics & Colors</span>
          <input
            type="checkbox"
            checked={settings.printBackground}
            onChange={(e) => onChange({ printBackground: e.target.checked })}
            className="w-4 h-4 rounded text-indigo-600 accent-indigo-600"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="font-medium text-slate-800">Repeat Table Headers on Multi-Page</span>
          <input
            type="checkbox"
            checked={settings.repeatTableHeaders}
            onChange={(e) => onChange({ repeatTableHeaders: e.target.checked })}
            className="w-4 h-4 rounded text-indigo-600 accent-indigo-600"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="font-medium text-slate-800">Include Page Numbering</span>
          <input
            type="checkbox"
            checked={settings.pageNumbering}
            onChange={(e) => onChange({ pageNumbering: e.target.checked })}
            className="w-4 h-4 rounded text-indigo-600 accent-indigo-600"
          />
        </label>
      </div>

      {/* ── 8. Reset to Document Defaults ── */}
      <button
        type="button"
        onClick={onReset}
        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
        <span>Reset to Document Defaults</span>
      </button>
    </div>
  )
}

