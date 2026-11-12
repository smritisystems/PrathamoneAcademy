/**
 * @file        EduBoardToolbar.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.eduboard
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-12
 * @updated     2026-11-12
 *
 * @description Reusable collapsible (Expanded / Compact / Hidden), dockable (Top / Left / Right / Bottom / Floating) EduBoard drawing toolbar with Greenboard chalk palettes, thickness control, appearance switcher, zoom/fit, and keyboard shortcut tooltips.
 */

import React, { useRef, useState } from 'react'
import {
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Circle,
  Eraser,
  EyeOff,
  GripHorizontal,
  Hand,
  Highlighter,
  Image as ImageIcon,
  Maximize,
  Minus,
  MousePointer2,
  PanelBottom,
  PanelLeft,
  PanelRight,
  PanelTop,
  Pencil,
  PenTool,
  PictureInPicture2,
  Redo2,
  RotateCcw,
  SlidersHorizontal,
  Square,
  Trash2,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import type {
  EduBoardBackgroundStyle,
  EduBoardMode,
  EduBoardTool,
  EduBoardToolbarPosition,
  EduBoardToolbarState,
} from '../../types'

export const CHALK_COLORS: Array<{ hex: string; label: string }> = [
  { hex: '#ffffff', label: 'White Chalk' },
  { hex: '#fde047', label: 'Yellow Chalk' },
  { hex: '#f9a8d4', label: 'Pink Chalk' },
  { hex: '#67e8f9', label: 'Blue Chalk' },
  { hex: '#86efac', label: 'Green Chalk' },
]

export const WHITEBOARD_COLORS: Array<{ hex: string; label: string }> = [
  { hex: '#111827', label: 'Carbon Black' },
  { hex: '#2563eb', label: 'Royal Blue' },
  { hex: '#dc2626', label: 'Crimson Red' },
  { hex: '#16a34a', label: 'Forest Green' },
  { hex: '#9333ea', label: 'Deep Purple' },
  { hex: '#ea580c', label: 'Orange Ink' },
]

export interface EduBoardToolbarProps {
  backgroundStyle: EduBoardBackgroundStyle
  isDarkBoard: boolean
  activeTool: EduBoardTool
  activeColor: string
  strokeSize: number
  isPanMode: boolean
  stylusOnly: boolean
  zoom: number
  canUndo: boolean
  canRedo: boolean
  toolbarState: EduBoardToolbarState
  toolbarPosition: EduBoardToolbarPosition
  floatingPos: { x: number; y: number }
  hasSelection: boolean
  onSelectTool: (tool: EduBoardTool) => void
  onSelectColor: (hex: string) => void
  onChangeStrokeSize: (size: number) => void
  onTogglePanMode: () => void
  onToggleStylusOnly: () => void
  onChangeAppearance: (bg: EduBoardBackgroundStyle, mode: EduBoardMode) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onFitToScreen: () => void
  onUndo: () => void
  onRedo: () => void
  onDeleteSelected: () => void
  onClearPage: () => void
  onPickImage: () => void
  onChangeToolbarState: (state: EduBoardToolbarState) => void
  onChangeToolbarPosition: (pos: EduBoardToolbarPosition) => void
  onChangeFloatingPos: (pos: { x: number; y: number }) => void
}

const TOOL_ITEMS: Array<{
  id: EduBoardTool
  label: string
  shortcut: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { id: 'select', label: 'Select', shortcut: 'V', icon: MousePointer2 },
  { id: 'pen', label: 'Pen / Chalk', shortcut: 'P / C', icon: PenTool },
  { id: 'highlighter', label: 'Highlighter', shortcut: 'H', icon: Highlighter },
  { id: 'eraser', label: 'Eraser', shortcut: 'E', icon: Eraser },
  { id: 'line', label: 'Line', shortcut: 'L', icon: Minus },
  { id: 'arrow', label: 'Arrow', shortcut: 'A', icon: ArrowUpRight },
  { id: 'rect', label: 'Rectangle', shortcut: 'R', icon: Square },
  { id: 'circle', label: 'Circle', shortcut: 'O', icon: Circle },
  { id: 'text', label: 'Text', shortcut: 'T', icon: Type },
]

export function getModeForAppearance(bg: EduBoardBackgroundStyle): EduBoardMode {
  if (bg === 'blackboard' || bg === 'greenboard') return 'classic'
  if (bg === 'pdf_slide') return 'presentation'
  return 'whiteboard'
}

export default function EduBoardToolbar({
  backgroundStyle,
  isDarkBoard,
  activeTool,
  activeColor,
  strokeSize,
  isPanMode,
  stylusOnly,
  zoom,
  canUndo,
  canRedo,
  toolbarState,
  toolbarPosition,
  floatingPos,
  hasSelection,
  onSelectTool,
  onSelectColor,
  onChangeStrokeSize,
  onTogglePanMode,
  onToggleStylusOnly,
  onChangeAppearance,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  onUndo,
  onRedo,
  onDeleteSelected,
  onClearPage,
  onPickImage,
  onChangeToolbarState,
  onChangeToolbarPosition,
  onChangeFloatingPos,
}: EduBoardToolbarProps) {
  const [showPositionMenu, setShowPositionMenu] = useState(false)
  const dragOriginRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)

  const palette = isDarkBoard ? CHALK_COLORS : WHITEBOARD_COLORS
  const isVerticalDock = toolbarPosition === 'left' || toolbarPosition === 'right'
  const isCompact = toolbarState === 'compact' || toolbarPosition === 'floating'

  const handleFloatDragStart = (e: React.PointerEvent) => {
    if (toolbarPosition !== 'floating') return
    e.preventDefault()
    dragOriginRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: floatingPos.x,
      origY: floatingPos.y,
    }
    const handleMove = (mv: PointerEvent) => {
      if (!dragOriginRef.current) return
      const nextX = Math.max(8, dragOriginRef.current.origX + (mv.clientX - dragOriginRef.current.startX))
      const nextY = Math.max(8, dragOriginRef.current.origY + (mv.clientY - dragOriginRef.current.startY))
      onChangeFloatingPos({ x: nextX, y: nextY })
    }
    const handleUp = () => {
      dragOriginRef.current = null
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  if (toolbarState === 'hidden') {
    return (
      <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChangeToolbarState('compact')}
          aria-label="Show Tools"
          title="Show Drawing Tools"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-900/90 text-white shadow-lg border border-slate-700 hover:bg-slate-800 backdrop-blur-xs"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
          <span>Show Tools</span>
          <span
            className="w-2.5 h-2.5 rounded-full border border-white/60"
            style={{ backgroundColor: activeColor }}
          />
        </button>
      </div>
    )
  }

  const containerLayoutClass =
    toolbarPosition === 'floating'
      ? 'absolute z-30 bg-white/95 backdrop-blur-md border border-slate-300 rounded-xl shadow-xl p-2 max-w-[95%]'
      : isVerticalDock
        ? 'bg-white border border-slate-200 rounded-xl p-2 flex flex-col gap-2 shadow-2xs shrink-0 w-[68px] items-center overflow-y-auto max-h-[680px]'
        : 'bg-white border border-slate-200 rounded-xl p-2 flex flex-wrap items-center justify-between gap-2 shadow-2xs shrink-0'

  return (
    <div
      data-testid="eduboard-toolbar"
      data-toolbar-state={toolbarState}
      data-toolbar-position={toolbarPosition}
      style={
        toolbarPosition === 'floating'
          ? { left: `${floatingPos.x}px`, top: `${floatingPos.y}px` }
          : undefined
      }
      className={containerLayoutClass}
    >
      {/* Floating Drag Handle + Title */}
      {toolbarPosition === 'floating' && (
        <div
          onPointerDown={handleFloatDragStart}
          className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-slate-200 cursor-grab active:cursor-grabbing select-none"
          title="Drag to move floating toolbar"
        >
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            <GripHorizontal className="w-3.5 h-3.5 text-slate-400" />
            EduBoard Tools
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onChangeToolbarPosition('top')}
              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
              title="Dock back to Top"
            >
              Dock Top
            </button>
            <button
              type="button"
              onClick={() => onChangeToolbarState('hidden')}
              className="p-1 rounded text-slate-500 hover:bg-slate-100"
              title="Hide Toolbar"
            >
              <EyeOff className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Primary Drawing Tools */}
      <div
        className={`flex ${isVerticalDock ? 'flex-col items-center gap-1' : 'flex-wrap items-center gap-1'}`}
      >
        {TOOL_ITEMS.map((t) => {
          const Icon = t.icon
          const selected = !isPanMode && (activeTool === t.id || (t.id === 'pen' && activeTool === 'chalk'))
          const displayLabel =
            t.id === 'pen' ? (isDarkBoard ? 'Chalk' : 'Pen') : t.label
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTool(t.id === 'pen' && isDarkBoard ? 'chalk' : t.id)}
              title={`${displayLabel} (${t.shortcut})`}
              aria-label={displayLabel}
              className={`inline-flex items-center justify-center gap-1 rounded-lg text-xs font-medium transition-colors ${
                isCompact || isVerticalDock ? 'p-1.5' : 'px-2.5 py-1.5'
              } ${
                selected
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {!isCompact && !isVerticalDock && <span>{displayLabel}</span>}
            </button>
          )
        })}

        <button
          type="button"
          onClick={onPickImage}
          title="Insert Image onto Board"
          aria-label="Insert Image"
          className={`inline-flex items-center justify-center gap-1 rounded-lg text-xs font-medium bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 ${
            isCompact || isVerticalDock ? 'p-1.5' : 'px-2 py-1.5'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          {!isCompact && !isVerticalDock && <span>Image</span>}
        </button>

        {hasSelection && (
          <button
            type="button"
            onClick={onDeleteSelected}
            title="Delete Selected Item (Del)"
            aria-label="Delete Selected"
            className="p-1.5 rounded-lg text-xs bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Color Swatches & Thickness */}
      <div
        className={`flex ${isVerticalDock ? 'flex-col items-center gap-1.5 pt-1 border-t border-slate-200' : 'flex-wrap items-center gap-2'}`}
      >
        <div
          className={`flex ${isVerticalDock ? 'flex-col' : 'flex-row'} items-center gap-1`}
          aria-label={isDarkBoard ? 'Chalk Colors' : 'Ink Colors'}
        >
          {palette.map((item) => (
            <button
              key={item.hex}
              type="button"
              onClick={() => onSelectColor(item.hex)}
              title={item.label}
              aria-label={item.label}
              className={`w-5 h-5 rounded-full border-2 transition-transform shrink-0 ${
                activeColor === item.hex ? 'border-indigo-500 scale-115 ring-2 ring-indigo-300' : 'border-slate-300'
              }`}
              style={{ backgroundColor: item.hex }}
            />
          ))}
        </div>

        {!isVerticalDock && (
          <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200">
            <select
              value={strokeSize <= 3 ? 2.5 : strokeSize <= 6 ? 5 : 9}
              onChange={(e) => onChangeStrokeSize(Number(e.target.value))}
              aria-label="Stroke Thickness Preset"
              title="Chalk / Pen Thickness"
              className="text-xs border border-slate-200 rounded-lg px-1.5 py-1 bg-white"
            >
              <option value={2.5}>Fine</option>
              <option value={5}>Medium</option>
              <option value={9}>Thick</option>
            </select>
            {!isCompact && (
              <input
                type="range"
                min={2}
                max={20}
                value={Math.round(strokeSize)}
                onChange={(e) => onChangeStrokeSize(Number(e.target.value))}
                aria-label="Fine Thickness Slider"
                title={`Thickness: ${Math.round(strokeSize)}px`}
                className="w-16 accent-primary-600 cursor-pointer"
              />
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onToggleStylusOnly}
          title={stylusOnly ? 'Stylus-only palm rejection ON' : 'Touch + Mouse + Stylus active'}
          aria-label="Toggle Stylus Palm Rejection"
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs border ${
            stylusOnly ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-semibold' : 'bg-white text-slate-600 border-slate-200'
          }`}
        >
          <Pencil className="w-3.5 h-3.5" />
          {!isCompact && !isVerticalDock && <span>{stylusOnly ? 'Stylus' : 'Touch+Pen'}</span>}
        </button>
      </div>

      {/* Surface Appearance, Zoom/Fit, Undo/Redo, Collapse & Dock */}
      <div
        className={`flex ${isVerticalDock ? 'flex-col items-center gap-1 pt-1 border-t border-slate-200' : 'flex-wrap items-center gap-1.5'}`}
      >
        {!isVerticalDock && (
          <select
            value={backgroundStyle}
            onChange={(e) => {
              const nextBg = e.target.value as EduBoardBackgroundStyle
              onChangeAppearance(nextBg, getModeForAppearance(nextBg))
            }}
            aria-label="Board Surface Appearance"
            title="Select Board Surface (Whiteboard, Greenboard, Blackboard, Grid, Notebook)"
            className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white font-medium text-slate-700"
          >
            <option value="white">Whiteboard (Plain)</option>
            <option value="grid">Grid Whiteboard</option>
            <option value="notebook">Notebook / Ruled Board</option>
            <option value="greenboard">Greenboard</option>
            <option value="blackboard">Blackboard</option>
            <option value="pdf_slide">Presentation Slide</option>
          </select>
        )}

        <div className={`flex ${isVerticalDock ? 'flex-col' : 'items-center'} gap-0.5`}>
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className={`flex ${isVerticalDock ? 'flex-col' : 'items-center'} gap-0.5`}>
          <button
            type="button"
            onClick={onTogglePanMode}
            title="Pan Canvas (Hold Space)"
            aria-label="Pan Canvas"
            className={`p-1.5 rounded-lg border ${
              isPanMode ? 'bg-amber-100 border-amber-400 text-amber-800' : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Hand className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onZoomOut}
            title="Zoom Out (-)"
            aria-label="Zoom Out"
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono px-1 text-slate-600">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={onZoomIn}
            title="Zoom In (+)"
            aria-label="Zoom In"
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onFitToScreen}
            title="Fit Board to Screen (0)"
            aria-label="Fit to Screen"
            className="inline-flex items-center gap-1 px-1.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-medium text-slate-700"
          >
            <Maximize className="w-3.5 h-3.5" />
            {!isCompact && !isVerticalDock && <span>Fit</span>}
          </button>
        </div>

        <button
          type="button"
          onClick={onClearPage}
          title="Clear Current Page Annotations"
          aria-label="Clear Page"
          className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Toolbar Collapse / Expand / Dock Menu */}
        <div className="relative flex items-center gap-0.5 pl-1 border-l border-slate-200">
          <button
            type="button"
            onClick={() => onChangeToolbarState(toolbarState === 'expanded' ? 'compact' : 'expanded')}
            title={toolbarState === 'expanded' ? 'Compact Toolbar' : 'Expand Toolbar'}
            aria-label={toolbarState === 'expanded' ? 'Compact Toolbar' : 'Expand Toolbar'}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
          >
            {toolbarState === 'expanded' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {toolbarPosition !== 'floating' && (
            <button
              type="button"
              onClick={() => onChangeToolbarState('hidden')}
              title="Hide Tools"
              aria-label="Hide Toolbar"
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowPositionMenu((s) => !s)}
            title="Dock or Float Toolbar Position"
            aria-label="Toolbar Position"
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
          >
            <PictureInPicture2 className="w-3.5 h-3.5" />
          </button>

          {showPositionMenu && (
            <div className="absolute right-0 top-9 z-40 w-40 bg-white border border-slate-200 rounded-xl shadow-lg p-1 text-xs space-y-0.5">
              {(
                [
                  { id: 'top', label: 'Dock Top', icon: PanelTop },
                  { id: 'left', label: 'Dock Left', icon: PanelLeft },
                  { id: 'right', label: 'Dock Right', icon: PanelRight },
                  { id: 'bottom', label: 'Dock Bottom', icon: PanelBottom },
                  { id: 'floating', label: 'Floating Toolbar', icon: PictureInPicture2 },
                ] as const
              ).map((opt) => {
                const OptIcon = opt.icon
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChangeToolbarPosition(opt.id)
                      setShowPositionMenu(false)
                    }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left ${
                      toolbarPosition === opt.id
                        ? 'bg-primary-50 text-primary-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <OptIcon className="w-3.5 h-3.5" />
                    <span>{opt.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
