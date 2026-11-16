/**
 * @file        QuickEduBoardCanvas.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.common
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-16
 * @updated     2026-11-16
 *
 * @description Quick floating EduBoard Whiteboard & Canvas component providing responsive sketching, geometric tools, multi-theme chalk/whiteboard surfaces, and instant export.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react'
import {
  Pen,
  Highlighter,
  Eraser,
  Minus,
  Square,
  Circle,
  MoveRight,
  RotateCcw,
  Trash2,
  Download,
  ExternalLink,
  Layers,
  Palette,
  Maximize2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useBottomBarDrawerStore } from '../../store/bottomBarDrawerStore'

type ToolType = 'pen' | 'highlighter' | 'eraser' | 'line' | 'arrow' | 'rect' | 'circle'
type BoardTheme = 'whiteboard' | 'chalkboard' | 'grid' | 'dark'

interface DrawAction {
  tool: ToolType
  color: string
  width: number
  points: { x: number; y: number }[]
  endPoint?: { x: number; y: number }
}

const PALETTE = [
  { name: 'Navy', hex: '#0B2D6B' },
  { name: 'Charcoal', hex: '#1E293B' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Blue', hex: '#2563EB' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Saffron', hex: '#F57C00' },
  { name: 'Crimson', hex: '#DC2626' },
  { name: 'Purple', hex: '#7C3AED' },
]

export function QuickEduBoardCanvas() {
  const navigate = useNavigate()
  const { closeDrawer } = useBottomBarDrawerStore()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [activeTool, setActiveTool] = useState<ToolType>('pen')
  const [activeColor, setActiveColor] = useState<string>('#0B2D6B')
  const [strokeWidth, setStrokeWidth] = useState<number>(3)
  const [theme, setTheme] = useState<BoardTheme>('whiteboard')
  const [history, setHistory] = useState<DrawAction[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const currentActionRef = useRef<DrawAction | null>(null)

  // Auto-switch initial color depending on theme
  useEffect(() => {
    if (theme === 'chalkboard' || theme === 'dark') {
      if (activeColor === '#0B2D6B' || activeColor === '#1E293B') {
        setActiveColor('#FFFFFF')
      }
    } else {
      if (activeColor === '#FFFFFF') {
        setActiveColor('#0B2D6B')
      }
    }
  }, [theme])

  // Canvas size sync
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
      redrawAll(history, ctx, rect.width, rect.height)
    }
  }, [history, theme])

  useEffect(() => {
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [resizeCanvas])

  const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (theme === 'whiteboard') {
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, width, height)
    } else if (theme === 'chalkboard') {
      ctx.fillStyle = '#1B382B' // Classic deep chalkboard green
      ctx.fillRect(0, 0, width, height)
    } else if (theme === 'dark') {
      ctx.fillStyle = '#0F172A' // Dark slate
      ctx.fillRect(0, 0, width, height)
    } else if (theme === 'grid') {
      ctx.fillStyle = '#F8FAFC'
      ctx.fillRect(0, 0, width, height)
      // Draw grid
      ctx.strokeStyle = '#E2E8F0'
      ctx.lineWidth = 1
      const step = 20
      for (let x = 0; x < width; x += step) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
    }
  }

  const renderAction = (ctx: CanvasRenderingContext2D, action: DrawAction) => {
    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (action.tool === 'eraser') {
      ctx.strokeStyle = theme === 'chalkboard' ? '#1B382B' : theme === 'dark' ? '#0F172A' : theme === 'grid' ? '#F8FAFC' : '#FFFFFF'
      ctx.lineWidth = action.width * 4
    } else if (action.tool === 'highlighter') {
      ctx.strokeStyle = action.color
      ctx.globalAlpha = 0.35
      ctx.lineWidth = action.width * 3
    } else {
      ctx.strokeStyle = action.color
      ctx.globalAlpha = 1.0
      ctx.lineWidth = action.width
    }

    if (action.tool === 'pen' || action.tool === 'highlighter' || action.tool === 'eraser') {
      if (action.points.length > 0) {
        ctx.beginPath()
        ctx.moveTo(action.points[0].x, action.points[0].y)
        for (let i = 1; i < action.points.length; i++) {
          ctx.lineTo(action.points[i].x, action.points[i].y)
        }
        ctx.stroke()
      }
    } else if (action.tool === 'line' && action.points.length > 0 && action.endPoint) {
      ctx.beginPath()
      ctx.moveTo(action.points[0].x, action.points[0].y)
      ctx.lineTo(action.endPoint.x, action.endPoint.y)
      ctx.stroke()
    } else if (action.tool === 'arrow' && action.points.length > 0 && action.endPoint) {
      const start = action.points[0]
      const end = action.endPoint
      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
      ctx.stroke()

      // Arrow head
      const angle = Math.atan2(end.y - start.y, end.x - start.x)
      const headLen = Math.max(10, action.width * 3)
      ctx.beginPath()
      ctx.moveTo(end.x, end.y)
      ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6))
      ctx.moveTo(end.x, end.y)
      ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6))
      ctx.stroke()
    } else if (action.tool === 'rect' && action.points.length > 0 && action.endPoint) {
      const start = action.points[0]
      const end = action.endPoint
      ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y)
    } else if (action.tool === 'circle' && action.points.length > 0 && action.endPoint) {
      const start = action.points[0]
      const end = action.endPoint
      const radiusX = Math.abs(end.x - start.x) / 2
      const radiusY = Math.abs(end.y - start.y) / 2
      const centerX = Math.min(start.x, end.x) + radiusX
      const centerY = Math.min(start.y, end.y) + radiusY
      ctx.beginPath()
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI)
      ctx.stroke()
    }

    ctx.restore()
  }

  const redrawAll = (actions: DrawAction[], ctx?: CanvasRenderingContext2D, w?: number, h?: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = ctx || canvas.getContext('2d')
    if (!context) return
    const rect = canvas.getBoundingClientRect()
    const width = w || rect.width
    const height = h || rect.height

    drawBackground(context, width, height)
    for (const act of actions) {
      renderAction(context, act)
    }
  }

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      const touch = e.touches[0]
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      }
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const handleStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const coords = getCanvasCoords(e)
    setIsDrawing(true)
    const newAction: DrawAction = {
      tool: activeTool,
      color: activeColor,
      width: strokeWidth,
      points: [coords],
    }
    currentActionRef.current = newAction
  }

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentActionRef.current) return
    e.preventDefault()
    const coords = getCanvasCoords(e)

    if (activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'eraser') {
      currentActionRef.current.points.push(coords)
      // Live draw incremental stroke
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          renderAction(ctx, currentActionRef.current)
        }
      }
    } else {
      // Shape tools need full redraw
      currentActionRef.current.endPoint = coords
      redrawAll([...history, currentActionRef.current])
    }
  }

  const handleEnd = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentActionRef.current) return
    e.preventDefault()
    setIsDrawing(false)
    const updated = [...history, currentActionRef.current]
    setHistory(updated)
    currentActionRef.current = null
    redrawAll(updated)
  }

  const handleUndo = () => {
    if (history.length === 0) return
    const updated = history.slice(0, -1)
    setHistory(updated)
    redrawAll(updated)
  }

  const handleClear = () => {
    setHistory([])
    redrawAll([])
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `EduBoard-QuickSketch-${new Date().toISOString().slice(0, 10)}.png`
    link.href = dataUrl
    link.click()
  }

  const handleOpenFullEduBoard = () => {
    closeDrawer()
    navigate('/eduboard')
  }

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 select-none overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 p-2 bg-white border-b border-slate-200 text-xs shrink-0">
        {/* Drawing Tools */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTool('pen')}
            title="Pen / Brush"
            className={`p-1.5 rounded-md transition-all ${
              activeTool === 'pen' ? 'bg-white text-primary-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Pen className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('highlighter')}
            title="Highlighter"
            className={`p-1.5 rounded-md transition-all ${
              activeTool === 'highlighter' ? 'bg-white text-primary-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Highlighter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('line')}
            title="Line"
            className={`p-1.5 rounded-md transition-all ${
              activeTool === 'line' ? 'bg-white text-primary-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('arrow')}
            title="Arrow"
            className={`p-1.5 rounded-md transition-all ${
              activeTool === 'arrow' ? 'bg-white text-primary-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MoveRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('rect')}
            title="Rectangle"
            className={`p-1.5 rounded-md transition-all ${
              activeTool === 'rect' ? 'bg-white text-primary-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Square className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('circle')}
            title="Circle"
            className={`p-1.5 rounded-md transition-all ${
              activeTool === 'circle' ? 'bg-white text-primary-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Circle className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('eraser')}
            title="Eraser"
            className={`p-1.5 rounded-md transition-all ${
              activeTool === 'eraser' ? 'bg-white text-rose-600 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Surface Backgrounds */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setTheme('whiteboard')}
            title="Whiteboard Canvas"
            className={`px-1.5 py-1 rounded text-[10px] font-semibold transition-all ${
              theme === 'whiteboard' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            White
          </button>
          <button
            type="button"
            onClick={() => setTheme('chalkboard')}
            title="Chalkboard (Greenboard)"
            className={`px-1.5 py-1 rounded text-[10px] font-semibold transition-all ${
              theme === 'chalkboard' ? 'bg-[#1B382B] text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Chalk
          </button>
          <button
            type="button"
            onClick={() => setTheme('grid')}
            title="Math & Geometry Grid"
            className={`px-1.5 py-1 rounded text-[10px] font-semibold transition-all ${
              theme === 'grid' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Grid
          </button>
        </div>

        {/* Thickness Selector */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          {[2, 4, 8].map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setStrokeWidth(w)}
              className={`w-6 h-6 flex items-center justify-center rounded transition-all ${
                strokeWidth === w ? 'bg-white shadow-2xs font-bold text-primary-700' : 'text-slate-400 hover:text-slate-700'
              }`}
              title={`Stroke width: ${w}px`}
            >
              <div
                className="rounded-full bg-current"
                style={{ width: `${w + 2}px`, height: `${w + 2}px` }}
              />
            </button>
          ))}
        </div>

        {/* Color Palette */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          {PALETTE.map((c) => (
            <button
              key={c.hex}
              type="button"
              onClick={() => setActiveColor(c.hex)}
              title={c.name}
              className={`w-5 h-5 rounded-full border transition-all ${
                activeColor === c.hex ? 'ring-2 ring-primary-500 ring-offset-1 scale-110' : 'border-slate-300 hover:scale-105'
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>

        {/* Utilities */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length === 0}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={history.length === 0}
            title="Clear Board"
            className="p-1.5 rounded-md text-rose-600 hover:text-rose-800 hover:bg-rose-50 disabled:opacity-40 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleDownload}
            title="Download Canvas PNG"
            className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Drawing Canvas */}
      <div className="relative flex-1 w-full h-full min-h-[300px] overflow-hidden cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          className="w-full h-full block touch-none"
        />

        {/* Quick hint badge */}
        <div className="absolute bottom-2 left-2 pointer-events-none opacity-60 text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-white">
          Quick Sketch Mode
        </div>
      </div>

      {/* Bottom Footer Action */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-t border-slate-200 text-xs shrink-0">
        <span className="text-[11px] text-slate-500 font-medium">
          Need full PDF presentation, chalk grids, and multi-page lesson plans?
        </span>
        <button
          type="button"
          onClick={handleOpenFullEduBoard}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-white bg-[#0B2D6B] hover:bg-[#071C44] transition-all shadow-2xs"
        >
          <span>Open Full EduBoard Studio</span>
          <ExternalLink className="w-3 h-3 text-amber-300" />
        </button>
      </div>
    </div>
  )
}
