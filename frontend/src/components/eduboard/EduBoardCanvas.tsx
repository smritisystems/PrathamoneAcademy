/**
 * @file        EduBoardCanvas.tsx
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
 * @description Interactive Konva + React-Konva + perfect-freehand + PDF.js multi-mode classroom canvas supporting Classic Chalk/Greenboard, Digital Whiteboard, and non-destructive PDF Presentation annotations.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Rect, Line, Arrow, Ellipse, Text as KonvaText, Image as KonvaImage, Group, Transformer } from 'react-konva'
import type Konva from 'konva'
import { getStroke } from 'perfect-freehand'
import * as pdfjsLib from 'pdfjs-dist'
import {
  MousePointer,
  PenTool,
  Highlighter,
  Eraser,
  Minus,
  ArrowUpRight,
  Square,
  Circle,
  Type,
  Trash2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Hand,
  FileImage,
} from 'lucide-react'
import { eduboardApi } from '../../api/endpoints'
import type {
  EduBoardBackgroundStyle,
  EduBoardMode,
  EduBoardPageItem,
  EduBoardSceneElement,
  EduBoardScenePayload,
  EduBoardTool,
} from '../../types'

// Serve pdf.js worker from self origin to comply strictly with nginx CSP script-src 'self'
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()
} catch {
  // Handled cleanly by PyMuPDF PNG fallback in PDF slide loader
}

export const EDUBOARD_LOGICAL_WIDTH = 1280
export const EDUBOARD_LOGICAL_HEIGHT = 720

export function parseSceneJson(raw: string | EduBoardScenePayload | undefined | null): EduBoardScenePayload {
  if (!raw) return { schemaVersion: 1, elements: [] }
  if (typeof raw === 'object') {
    return {
      schemaVersion: Number(raw.schemaVersion || 1),
      elements: Array.isArray(raw.elements) ? raw.elements : [],
    }
  }
  try {
    const parsed = JSON.parse(raw)
    return {
      schemaVersion: Number(parsed?.schemaVersion || 1),
      elements: Array.isArray(parsed?.elements) ? parsed.elements : [],
    }
  } catch {
    return { schemaVersion: 1, elements: [] }
  }
}

function getSvgPathFlatPoints(rawPoints: number[], pressures: number[] | undefined, size: number, tool?: string): number[] {
  const pts: Array<[number, number, number]> = []
  for (let i = 0; i < rawPoints.length; i += 2) {
    const pIdx = Math.floor(i / 2)
    pts.push([rawPoints[i], rawPoints[i + 1], pressures?.[pIdx] ?? 0.5])
  }
  if (pts.length < 2) return rawPoints

  const strokeOutline = getStroke(pts, {
    size: tool === 'marker' ? size * 1.4 : tool === 'highlighter' ? size * 3 : size,
    thinning: tool === 'chalk' ? 0.35 : tool === 'highlighter' ? 0.05 : 0.45,
    smoothing: 0.55,
    streamline: 0.45,
    simulatePressure: !pressures || pressures.length === 0,
  })
  const flat: number[] = []
  for (const [x, y] of strokeOutline) {
    flat.push(x, y)
  }
  return flat
}

function isNearPoint(px: number, py: number, el: EduBoardSceneElement, radius = 18): boolean {
  if (el.type === 'stroke' || el.type === 'line' || el.type === 'arrow') {
    const pts = el.points || []
    for (let i = 0; i < pts.length; i += 2) {
      const dx = pts[i] - px
      const dy = pts[i + 1] - py
      if (dx * dx + dy * dy <= radius * radius) return true
    }
    return false
  }
  const x = el.x || 0
  const y = el.y || 0
  const w = Math.abs(el.width || 120)
  const h = Math.abs(el.height || 40)
  return px >= x - radius && px <= x + w + radius && py >= y - radius && py <= y + h + radius
}

const CLASSIC_COLORS = ['#ffffff', '#fde047', '#f9a8d4', '#67e8f9', '#86efac']
const WHITEBOARD_COLORS = ['#111827', '#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c']

export interface EduBoardCanvasProps {
  page: EduBoardPageItem
  readOnly?: boolean
  onSceneChange?: (scene: EduBoardScenePayload) => void
  onModeOrBackgroundChange?: (mode: EduBoardMode, bg: EduBoardBackgroundStyle) => void
  onUploadInlineImage?: (file: File) => Promise<{ attachmentId: number; url: string } | null>
  compactToolbar?: boolean
}

export default function EduBoardCanvas({
  page,
  readOnly = false,
  onSceneChange,
  onModeOrBackgroundChange,
  onUploadInlineImage,
  compactToolbar = false,
}: EduBoardCanvasProps) {
  const mode = page.mode || 'whiteboard'
  const backgroundStyle = page.background_style || 'white'
  const scene = useMemo(() => parseSceneJson(page.scene_json), [page.scene_json])

  const defaultTool: EduBoardTool = readOnly ? 'select' : mode === 'classic' ? 'chalk' : 'pen'
  const [activeTool, setActiveTool] = useState<EduBoardTool>(defaultTool)
  const [strokeColor, setStrokeColor] = useState<string>(mode === 'classic' ? '#ffffff' : '#111827')
  const [strokeSize, setStrokeSize] = useState<number>(4)
  const [stylusOnly, setStylusOnly] = useState<boolean>(false)
  const [zoom, setZoom] = useState<number>(1)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isPanMode, setIsPanMode] = useState<boolean>(false)

  // Undo / Redo per page UID
  const [undoStack, setUndoStack] = useState<EduBoardSceneElement[][]>([])
  const [redoStack, setRedoStack] = useState<EduBoardSceneElement[][]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState<boolean>(false)

  // Live drawing state
  const [draftElement, setDraftElement] = useState<EduBoardSceneElement | null>(null)
  const isDrawingRef = useRef(false)
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const stageRef = useRef<Konva.Stage | null>(null)
  const transformerRef = useRef<Konva.Transformer | null>(null)
  const selectedNodeRef = useRef<Konva.Node | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState<number>(960)

  // Text input overlay
  const [textDraft, setTextDraft] = useState<{ x: number; y: number; value: string } | null>(null)

  // Background PDF slide or inline image cache
  const [pdfSlideImage, setPdfSlideImage] = useState<HTMLImageElement | null>(null)
  const [pdfLoading, setPdfLoading] = useState<boolean>(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [inlineImages, setInlineImages] = useState<Record<string, HTMLImageElement>>({})
  const inlineImgInputRef = useRef<HTMLInputElement | null>(null)

  // Reset per-page stacks and color defaults when switching page or mode
  useEffect(() => {
    setUndoStack([])
    setRedoStack([])
    setSelectedId(null)
    setConfirmClear(false)
    setTextDraft(null)
    if (!readOnly) {
      if (mode === 'classic') {
        setActiveTool((prev) => (prev === 'pen' ? 'chalk' : prev))
        setStrokeColor((prev) => (WHITEBOARD_COLORS.includes(prev) ? '#ffffff' : prev))
      } else {
        setActiveTool((prev) => (prev === 'chalk' ? 'pen' : prev))
        setStrokeColor((prev) => (prev === '#ffffff' ? '#111827' : prev))
      }
    }
  }, [page.page_uid, mode, readOnly])

  // Track responsive container width to scale logical 1280x720 stage cleanly
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const updateSize = () => {
      const w = el.clientWidth || 960
      setContainerWidth(Math.max(320, w))
    }
    updateSize()
    if (typeof ResizeObserver !== 'undefined') {
      const obs = new ResizeObserver(updateSize)
      obs.observe(el)
      return () => obs.disconnect()
    }
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // Attach Konva Transformer when an element is selected
  useEffect(() => {
    if (!transformerRef.current) return
    if (selectedId && selectedNodeRef.current && activeTool === 'select' && !readOnly) {
      transformerRef.current.nodes([selectedNodeRef.current])
      transformerRef.current.getLayer()?.batchDraw()
    } else {
      transformerRef.current.nodes([])
      transformerRef.current.getLayer()?.batchDraw()
    }
  }, [selectedId, activeTool, readOnly, scene.elements.length])

  // Load PDF slide background when page has source_attachment_id
  useEffect(() => {
    let active = true
    let objectUrlToRevoke: string | null = null

    async function loadPdfSlide() {
      if (!page.source_attachment_id || !page.source_page_number) {
        setPdfSlideImage(null)
        setPdfError(null)
        return
      }
      setPdfLoading(true)
      setPdfError(null)

      // Attempt client-side PDF.js render first from authenticated blob; fallback cleanly to PyMuPDF PNG endpoint
      try {
        const res = await eduboardApi.fetchAttachmentBlob(page.source_attachment_id)
        const buf = await res.data.arrayBuffer()
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buf) })
        const pdf = await loadingTask.promise
        const pdfPage = await pdf.getPage(page.source_page_number)
        const viewport = pdfPage.getViewport({ scale: 1.75 })
        const offscreen = document.createElement('canvas')
        offscreen.width = viewport.width
        offscreen.height = viewport.height
        const ctx = offscreen.getContext('2d')
        if (ctx) {
          await pdfPage.render({ canvasContext: ctx, viewport }).promise
          const img = new window.Image()
          img.onload = () => {
            if (active) setPdfSlideImage(img)
          }
          img.src = offscreen.toDataURL('image/png')
          if (active) setPdfLoading(false)
          return
        }
      } catch {
        // Fallback to backend PyMuPDF rendered PNG page
      }

      try {
        const pngRes = await eduboardApi.fetchRenderedPdfPageBlob(
          page.source_attachment_id,
          page.source_page_number,
        )
        const objUrl = URL.createObjectURL(pngRes.data)
        objectUrlToRevoke = objUrl
        const img = new window.Image()
        img.onload = () => {
          if (active) {
            setPdfSlideImage(img)
            setPdfLoading(false)
          }
        }
        img.onerror = () => {
          if (active) {
            setPdfError('Unable to decode slide image')
            setPdfLoading(false)
          }
        }
        img.src = objUrl
      } catch {
        if (active) {
          setPdfError('Slide preview unavailable')
          setPdfLoading(false)
        }
      }
    }

    void loadPdfSlide()
    return () => {
      active = false
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke)
    }
  }, [page.source_attachment_id, page.source_page_number])

  // Load any authenticated inline image attachments referenced in scene.elements
  useEffect(() => {
    const imgElements = scene.elements.filter((el) => el.type === 'image' && el.attachmentId)
    imgElements.forEach((el) => {
      const key = String(el.attachmentId)
      if (inlineImages[key]) return
      eduboardApi
        .fetchAttachmentBlob(el.attachmentId!)
        .then((res) => {
          const url = URL.createObjectURL(res.data)
          const img = new window.Image()
          img.onload = () => {
            setInlineImages((prev) => ({ ...prev, [key]: img }))
          }
          img.src = url
        })
        .catch(() => {
          // Ignore broken image fetch
        })
    })
  }, [scene.elements, inlineImages])

  const commitElements = useCallback(
    (nextElements: EduBoardSceneElement[], pushUndo = true) => {
      if (readOnly || !onSceneChange) return
      if (pushUndo) {
        setUndoStack((prev) => [...prev.slice(-39), scene.elements])
        setRedoStack([])
      }
      onSceneChange({ schemaVersion: scene.schemaVersion || 1, elements: nextElements })
    },
    [readOnly, onSceneChange, scene.elements, scene.schemaVersion],
  )

  const handleUndo = useCallback(() => {
    if (readOnly || undoStack.length === 0 || !onSceneChange) return
    const previous = undoStack[undoStack.length - 1]
    setUndoStack((prev) => prev.slice(0, -1))
    setRedoStack((prev) => [...prev, scene.elements])
    onSceneChange({ schemaVersion: 1, elements: previous })
    setSelectedId(null)
  }, [readOnly, undoStack, onSceneChange, scene.elements])

  const handleRedo = useCallback(() => {
    if (readOnly || redoStack.length === 0 || !onSceneChange) return
    const next = redoStack[redoStack.length - 1]
    setRedoStack((prev) => prev.slice(0, -1))
    setUndoStack((prev) => [...prev, scene.elements])
    onSceneChange({ schemaVersion: 1, elements: next })
    setSelectedId(null)
  }, [readOnly, redoStack, onSceneChange, scene.elements])

  const scaleToFit = containerWidth / EDUBOARD_LOGICAL_WIDTH
  const effectiveScale = scaleToFit * zoom
  const stageWidth = Math.round(containerWidth)
  const stageHeight = Math.round(EDUBOARD_LOGICAL_HEIGHT * scaleToFit)

  const toLogicalCoords = (stage: Konva.Stage): { x: number; y: number } | null => {
    const pos = stage.getPointerPosition()
    if (!pos) return null
    return {
      x: (pos.x - pan.x) / effectiveScale,
      y: (pos.y - pan.y) / effectiveScale,
    }
  }

  const handlePointerDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
    if (readOnly || isPanMode) return
    const pointerType = (e.evt?.pointerType || 'mouse').toLowerCase()
    if (stylusOnly && pointerType === 'touch') {
      return
    }

    const stage = e.target.getStage()
    if (!stage) return
    const pt = toLogicalCoords(stage)
    if (!pt) return

    if (activeTool === 'select') {
      if (e.target === stage) {
        setSelectedId(null)
      }
      return
    }

    if (activeTool === 'text') {
      setTextDraft({ x: pt.x, y: pt.y, value: '' })
      return
    }

    if (activeTool === 'eraser') {
      isDrawingRef.current = true
      const filtered = scene.elements.filter((el) => !isNearPoint(pt.x, pt.y, el, Math.max(16, strokeSize * 3)))
      if (filtered.length !== scene.elements.length) {
        commitElements(filtered, true)
      }
      return
    }

    isDrawingRef.current = true
    startPosRef.current = pt
    const pressure = typeof e.evt?.pressure === 'number' && e.evt.pressure > 0 ? e.evt.pressure : 0.5
    const id = `el_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`

    if (activeTool === 'pen' || activeTool === 'marker' || activeTool === 'chalk' || activeTool === 'highlighter') {
      setDraftElement({
        id,
        type: 'stroke',
        tool: activeTool,
        points: [pt.x, pt.y],
        pressures: [pressure],
        color: strokeColor,
        size: strokeSize,
        opacity: activeTool === 'highlighter' ? 0.35 : activeTool === 'chalk' ? 0.92 : 1,
      })
    } else if (activeTool === 'line' || activeTool === 'arrow') {
      setDraftElement({
        id,
        type: activeTool,
        points: [pt.x, pt.y, pt.x, pt.y],
        color: strokeColor,
        size: strokeSize,
        opacity: 1,
      })
    } else if (activeTool === 'rect' || activeTool === 'circle') {
      setDraftElement({
        id,
        type: activeTool,
        x: pt.x,
        y: pt.y,
        width: 2,
        height: 2,
        color: strokeColor,
        size: strokeSize,
        opacity: 1,
      })
    }
  }

  const handlePointerMove = (e: Konva.KonvaEventObject<PointerEvent>) => {
    if (readOnly || !isDrawingRef.current || isPanMode) return
    const pointerType = (e.evt?.pointerType || 'mouse').toLowerCase()
    if (stylusOnly && pointerType === 'touch') return

    const stage = e.target.getStage()
    if (!stage) return
    const pt = toLogicalCoords(stage)
    if (!pt) return

    if (activeTool === 'eraser') {
      const filtered = scene.elements.filter((el) => !isNearPoint(pt.x, pt.y, el, Math.max(16, strokeSize * 3)))
      if (filtered.length !== scene.elements.length) {
        commitElements(filtered, true)
      }
      return
    }

    if (!draftElement) return
    const pressure = typeof e.evt?.pressure === 'number' && e.evt.pressure > 0 ? e.evt.pressure : 0.5

    if (draftElement.type === 'stroke') {
      setDraftElement({
        ...draftElement,
        points: [...(draftElement.points || []), pt.x, pt.y],
        pressures: [...(draftElement.pressures || []), pressure],
      })
    } else if (draftElement.type === 'line' || draftElement.type === 'arrow') {
      setDraftElement({
        ...draftElement,
        points: [startPosRef.current.x, startPosRef.current.y, pt.x, pt.y],
      })
    } else if (draftElement.type === 'rect' || draftElement.type === 'circle') {
      const sx = startPosRef.current.x
      const sy = startPosRef.current.y
      setDraftElement({
        ...draftElement,
        x: Math.min(sx, pt.x),
        y: Math.min(sy, pt.y),
        width: Math.abs(pt.x - sx),
        height: Math.abs(pt.y - sy),
      })
    }
  }

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    if (draftElement) {
      commitElements([...scene.elements, draftElement], true)
      setDraftElement(null)
    }
  }

  const handleCommitText = () => {
    if (!textDraft) return
    const txt = textDraft.value.trim()
    if (txt) {
      const el: EduBoardSceneElement = {
        id: `el_txt_${Date.now().toString(36)}`,
        type: 'text',
        x: textDraft.x,
        y: textDraft.y,
        text: txt,
        fontSize: Math.max(18, strokeSize * 5),
        color: strokeColor,
      }
      commitElements([...scene.elements, el], true)
    }
    setTextDraft(null)
  }

  const handleInsertImageFile = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    const file = evt.target.files?.[0]
    evt.target.value = ''
    if (!file || !onUploadInlineImage) return
    const uploaded = await onUploadInlineImage(file)
    if (!uploaded) return
    const el: EduBoardSceneElement = {
      id: `el_img_${Date.now().toString(36)}`,
      type: 'image',
      x: 160,
      y: 120,
      width: 360,
      height: 240,
      attachmentId: uploaded.attachmentId,
      src: uploaded.url,
    }
    commitElements([...scene.elements, el], true)
    setActiveTool('select')
  }

  const renderElement = (el: EduBoardSceneElement, isDraft = false) => {
    const isSelected = !readOnly && activeTool === 'select' && selectedId === el.id
    const commonInteractiveProps = readOnly
      ? {}
      : {
          draggable: activeTool === 'select',
          onClick: () => {
            if (activeTool === 'select') setSelectedId(el.id)
          },
          onTap: () => {
            if (activeTool === 'select') setSelectedId(el.id)
          },
          onDragEnd: (evt: Konva.KonvaEventObject<DragEvent>) => {
            if (activeTool !== 'select') return
            const node = evt.target
            const dx = node.x()
            const dy = node.y()
            if (el.type === 'stroke' || el.type === 'line' || el.type === 'arrow') {
              const shifted: number[] = []
              const pts = el.points || []
              for (let i = 0; i < pts.length; i += 2) {
                shifted.push(pts[i] + dx, pts[i + 1] + dy)
              }
              node.position({ x: 0, y: 0 })
              commitElements(
                scene.elements.map((item) => (item.id === el.id ? { ...item, points: shifted } : item)),
                true,
              )
            } else {
              commitElements(
                scene.elements.map((item) => (item.id === el.id ? { ...item, x: dx, y: dy } : item)),
                true,
              )
            }
          },
        }

    if (el.type === 'stroke') {
      const pts = el.points || []
      const poly = getSvgPathFlatPoints(pts, el.pressures, el.size || 4, el.tool)
      return (
        <Line
          key={el.id}
          ref={isSelected ? (node) => { selectedNodeRef.current = node } : undefined}
          points={poly.length >= 6 ? poly : pts}
          closed={poly.length >= 6}
          fill={poly.length >= 6 ? el.color || '#111827' : undefined}
          stroke={el.color || '#111827'}
          strokeWidth={poly.length >= 6 ? 1 : el.size || 4}
          lineCap="round"
          lineJoin="round"
          opacity={el.opacity ?? 1}
          listening={!isDraft && activeTool === 'select'}
          {...commonInteractiveProps}
        />
      )
    }

    if (el.type === 'line') {
      return (
        <Line
          key={el.id}
          ref={isSelected ? (node) => { selectedNodeRef.current = node } : undefined}
          points={el.points || [0, 0, 50, 50]}
          stroke={el.color || '#111827'}
          strokeWidth={el.size || 4}
          lineCap="round"
          listening={!isDraft && activeTool === 'select'}
          {...commonInteractiveProps}
        />
      )
    }

    if (el.type === 'arrow') {
      return (
        <Arrow
          key={el.id}
          ref={isSelected ? (node) => { selectedNodeRef.current = node } : undefined}
          points={el.points || [0, 0, 80, 40]}
          stroke={el.color || '#2563eb'}
          fill={el.color || '#2563eb'}
          strokeWidth={el.size || 4}
          pointerLength={12}
          pointerWidth={10}
          listening={!isDraft && activeTool === 'select'}
          {...commonInteractiveProps}
        />
      )
    }

    if (el.type === 'rect') {
      return (
        <Rect
          key={el.id}
          ref={isSelected ? (node) => { selectedNodeRef.current = node } : undefined}
          x={el.x || 0}
          y={el.y || 0}
          width={Math.max(4, el.width || 40)}
          height={Math.max(4, el.height || 40)}
          stroke={el.color || '#2563eb'}
          strokeWidth={el.size || 3}
          fill={el.fill}
          cornerRadius={4}
          listening={!isDraft && activeTool === 'select'}
          {...commonInteractiveProps}
        />
      )
    }

    if (el.type === 'circle') {
      const w = Math.max(8, el.width || 40)
      const h = Math.max(8, el.height || 40)
      return (
        <Ellipse
          key={el.id}
          ref={isSelected ? (node) => { selectedNodeRef.current = node } : undefined}
          x={(el.x || 0) + w / 2}
          y={(el.y || 0) + h / 2}
          radiusX={w / 2}
          radiusY={h / 2}
          stroke={el.color || '#16a34a'}
          strokeWidth={el.size || 3}
          fill={el.fill}
          listening={!isDraft && activeTool === 'select'}
          {...commonInteractiveProps}
        />
      )
    }

    if (el.type === 'text') {
      return (
        <KonvaText
          key={el.id}
          ref={isSelected ? (node) => { selectedNodeRef.current = node } : undefined}
          x={el.x || 40}
          y={el.y || 40}
          text={el.text || ''}
          fontSize={el.fontSize || 22}
          fontFamily="Inter, system-ui, sans-serif"
          fill={el.color || (mode === 'classic' ? '#ffffff' : '#111827')}
          listening={!isDraft && activeTool === 'select'}
          {...commonInteractiveProps}
        />
      )
    }

    if (el.type === 'image' && el.attachmentId && inlineImages[String(el.attachmentId)]) {
      return (
        <KonvaImage
          key={el.id}
          ref={isSelected ? (node) => { selectedNodeRef.current = node } : undefined}
          image={inlineImages[String(el.attachmentId)]}
          x={el.x || 100}
          y={el.y || 100}
          width={el.width || 320}
          height={el.height || 220}
          listening={!isDraft && activeTool === 'select'}
          {...commonInteractiveProps}
        />
      )
    }

    return null
  }

  const canvasBgHex =
    backgroundStyle === 'blackboard'
      ? '#111827'
      : backgroundStyle === 'greenboard'
        ? '#14532d'
        : backgroundStyle === 'pdf_slide'
          ? '#f1f5f9'
          : '#ffffff'

  const colorPalette = mode === 'classic' ? CLASSIC_COLORS : WHITEBOARD_COLORS

  const toolButtons: Array<{ id: EduBoardTool; label: string; icon: React.ReactNode }> = [
    { id: 'select', label: 'Select', icon: <MousePointer className="w-4 h-4" /> },
    mode === 'classic'
      ? { id: 'chalk', label: 'Chalk', icon: <PenTool className="w-4 h-4" /> }
      : { id: 'pen', label: 'Pen', icon: <PenTool className="w-4 h-4" /> },
    { id: 'highlighter', label: 'Highlighter', icon: <Highlighter className="w-4 h-4" /> },
    { id: 'eraser', label: 'Eraser', icon: <Eraser className="w-4 h-4" /> },
    { id: 'line', label: 'Line', icon: <Minus className="w-4 h-4" /> },
    { id: 'arrow', label: 'Arrow', icon: <ArrowUpRight className="w-4 h-4" /> },
    { id: 'rect', label: 'Rectangle', icon: <Square className="w-4 h-4" /> },
    { id: 'circle', label: 'Circle', icon: <Circle className="w-4 h-4" /> },
    { id: 'text', label: 'Text', icon: <Type className="w-4 h-4" /> },
  ]

  return (
    <div className="flex flex-col gap-2 w-full" data-testid="eduboard-canvas-shell">
      {/* ── Canvas Drawing Toolbar (Hidden/Simplified in Student Read-Only Mode) ── */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl border ${
          mode === 'classic'
            ? 'bg-slate-900 border-slate-700 text-slate-100'
            : 'bg-white border-slate-200 text-slate-700 shadow-2xs'
        }`}
      >
        {!readOnly ? (
          <div className="flex flex-wrap items-center gap-1">
            {toolButtons.map((btn) => (
              <button
                key={btn.id}
                type="button"
                title={btn.label}
                aria-label={btn.label}
                onClick={() => {
                  setIsPanMode(false)
                  setActiveTool(btn.id)
                }}
                className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTool === btn.id && !isPanMode
                    ? 'bg-primary-600 text-white shadow-2xs'
                    : mode === 'classic'
                      ? 'hover:bg-slate-800 text-slate-200'
                      : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                {btn.icon}
                {!compactToolbar && <span className="hidden xl:inline">{btn.label}</span>}
              </button>
            ))}

            {onUploadInlineImage && (
              <>
                <input
                  ref={inlineImgInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleInsertImageFile}
                />
                <button
                  type="button"
                  title="Insert Image"
                  aria-label="Insert Image"
                  onClick={() => inlineImgInputRef.current?.click()}
                  className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium ${
                    mode === 'classic' ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <FileImage className="w-4 h-4" />
                </button>
              </>
            )}

            <div className="h-5 w-px bg-slate-300/40 mx-1" />

            {/* Color Swatches */}
            <div className="flex items-center gap-1">
              {colorPalette.map((col) => (
                <button
                  key={col}
                  type="button"
                  aria-label={`Color ${col}`}
                  onClick={() => setStrokeColor(col)}
                  className={`w-5 h-5 rounded-full border transition-transform ${
                    strokeColor === col ? 'scale-110 ring-2 ring-primary-500 border-white' : 'border-slate-400/50'
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>

            <div className="h-5 w-px bg-slate-300/40 mx-1" />

            {/* Thickness */}
            <label className="flex items-center gap-1 text-[11px] font-medium">
              <span>Size</span>
              <select
                value={strokeSize}
                onChange={(e) => setStrokeSize(Number(e.target.value))}
                className={`rounded-md border px-1.5 py-0.5 text-xs ${
                  mode === 'classic'
                    ? 'bg-slate-800 border-slate-600 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <option value={2}>Fine</option>
                <option value={4}>Medium</option>
                <option value={8}>Bold</option>
                <option value={14}>Heavy</option>
              </select>
            </label>

            {/* Palm rejection toggle */}
            <button
              type="button"
              onClick={() => setStylusOnly((v) => !v)}
              className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                stylusOnly
                  ? 'bg-amber-500/20 border-amber-400 text-amber-500'
                  : 'border-transparent hover:bg-slate-500/10'
              }`}
              title="Ignore touch input so resting palm does not draw"
            >
              {stylusOnly ? 'Stylus Only ON' : 'Touch + Pen'}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            <span>Read-Only Student Lecture View</span>
          </div>
        )}

        {/* Right Controls: Mode / Background / Undo / Redo / Zoom / Clear */}
        <div className="flex flex-wrap items-center gap-1.5">
          {!readOnly && onModeOrBackgroundChange && (
            <select
              aria-label="Board Surface"
              value={`${mode}:${backgroundStyle}`}
              onChange={(e) => {
                const [nextMode, nextBg] = e.target.value.split(':') as [EduBoardMode, EduBoardBackgroundStyle]
                onModeOrBackgroundChange(nextMode, nextBg)
              }}
              className={`rounded-lg border px-2 py-1 text-xs font-medium ${
                mode === 'classic'
                  ? 'bg-slate-800 border-slate-600 text-slate-100'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <option value="classic:blackboard">Classic Blackboard</option>
              <option value="classic:greenboard">Classic Greenboard</option>
              <option value="whiteboard:white">Whiteboard Clean</option>
              <option value="whiteboard:grid">Whiteboard Grid</option>
              <option value="whiteboard:notebook">Whiteboard Ruled</option>
              {page.source_attachment_id && <option value="presentation:pdf_slide">Presentation Slide</option>}
            </select>
          )}

          {!readOnly && (
            <>
              <button
                type="button"
                aria-label="Undo"
                title="Undo"
                disabled={undoStack.length === 0}
                onClick={handleUndo}
                className="p-1.5 rounded-lg border border-transparent hover:bg-slate-500/10 disabled:opacity-40"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Redo"
                title="Redo"
                disabled={redoStack.length === 0}
                onClick={handleRedo}
                className="p-1.5 rounded-lg border border-transparent hover:bg-slate-500/10 disabled:opacity-40"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            type="button"
            aria-label="Pan Canvas"
            title="Pan Canvas"
            onClick={() => setIsPanMode((v) => !v)}
            className={`p-1.5 rounded-lg ${isPanMode ? 'bg-primary-600 text-white' : 'hover:bg-slate-500/10'}`}
          >
            <Hand className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Zoom Out"
            onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
            className="p-1.5 rounded-lg hover:bg-slate-500/10"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            aria-label="Zoom In"
            onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))))}
            className="p-1.5 rounded-lg hover:bg-slate-500/10"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Reset Zoom"
            onClick={() => {
              setZoom(1)
              setPan({ x: 0, y: 0 })
            }}
            className="p-1.5 rounded-lg hover:bg-slate-500/10"
            title="Reset Zoom & Pan"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {!readOnly && (
            <>
              {confirmClear ? (
                <div className="flex items-center gap-1 ml-1 bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-lg text-xs">
                  <span>Clear page?</span>
                  <button
                    type="button"
                    onClick={() => {
                      commitElements([], true)
                      setConfirmClear(false)
                    }}
                    className="font-bold underline"
                  >
                    Yes
                  </button>
                  <button type="button" onClick={() => setConfirmClear(false)} className="ml-1">
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  aria-label="Clear Page"
                  title="Clear current page annotations"
                  onClick={() => setConfirmClear(true)}
                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Main Logical 1280x720 Interactive Stage ── */}
      <div
        ref={containerRef}
        data-testid="eduboard-stage-wrapper"
        className="relative w-full rounded-2xl overflow-hidden border border-slate-300 shadow-inner select-none"
        style={{
          backgroundColor: canvasBgHex,
          touchAction: 'none',
          minHeight: '320px',
        }}
      >
        {pdfLoading && (
          <div className="absolute top-3 right-3 z-20 px-3 py-1 rounded-full bg-slate-900/80 text-white text-xs">
            Loading PDF slide...
          </div>
        )}
        {pdfError && (
          <div className="absolute top-3 right-3 z-20 px-3 py-1 rounded-full bg-amber-600 text-white text-xs">
            {pdfError}
          </div>
        )}

        <Stage
          ref={(node) => {
            stageRef.current = node
          }}
          width={stageWidth}
          height={stageHeight}
          scaleX={effectiveScale}
          scaleY={effectiveScale}
          x={pan.x}
          y={pan.y}
          draggable={isPanMode}
          onDragEnd={(evt) => {
            if (isPanMode && evt.target === stageRef.current) {
              setPan({ x: evt.target.x(), y: evt.target.y() })
            }
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Background & Pattern Layer */}
          <Layer listening={false}>
            <Rect
              x={0}
              y={0}
              width={EDUBOARD_LOGICAL_WIDTH}
              height={EDUBOARD_LOGICAL_HEIGHT}
              fill={canvasBgHex}
            />

            {backgroundStyle === 'grid' && (
              <Group listening={false}>
                {Array.from({ length: 32 }).map((_, idx) => (
                  <Line
                    key={`vg-${idx}`}
                    points={[(idx + 1) * 40, 0, (idx + 1) * 40, EDUBOARD_LOGICAL_HEIGHT]}
                    stroke="#e2e8f0"
                    strokeWidth={1}
                  />
                ))}
                {Array.from({ length: 18 }).map((_, idx) => (
                  <Line
                    key={`hg-${idx}`}
                    points={[0, (idx + 1) * 40, EDUBOARD_LOGICAL_WIDTH, (idx + 1) * 40]}
                    stroke="#e2e8f0"
                    strokeWidth={1}
                  />
                ))}
              </Group>
            )}

            {backgroundStyle === 'notebook' && (
              <Group listening={false}>
                <Line
                  points={[110, 0, 110, EDUBOARD_LOGICAL_HEIGHT]}
                  stroke="#fca5a5"
                  strokeWidth={2}
                />
                {Array.from({ length: 18 }).map((_, idx) => (
                  <Line
                    key={`nb-${idx}`}
                    points={[0, (idx + 1) * 38, EDUBOARD_LOGICAL_WIDTH, (idx + 1) * 38]}
                    stroke="#dbeafe"
                    strokeWidth={1.2}
                  />
                ))}
              </Group>
            )}

            {pdfSlideImage && (
              <KonvaImage
                image={pdfSlideImage}
                x={0}
                y={0}
                width={EDUBOARD_LOGICAL_WIDTH}
                height={EDUBOARD_LOGICAL_HEIGHT}
                listening={false}
              />
            )}
          </Layer>

          {/* Vector Annotation Layer */}
          <Layer>
            {scene.elements.map((el) => renderElement(el, false))}
            {draftElement && renderElement(draftElement, true)}
            {!readOnly && <Transformer ref={transformerRef} rotateEnabled={false} />}
          </Layer>
        </Stage>

        {/* Floating Text Input Overlay */}
        {textDraft && !readOnly && (
          <div
            className="absolute z-30 flex items-center gap-1 bg-white border border-primary-400 rounded-lg shadow-lg p-1.5"
            style={{
              left: `${Math.min(Math.max(12, textDraft.x * effectiveScale + pan.x), Math.max(12, stageWidth - 260))}px`,
              top: `${Math.min(Math.max(12, textDraft.y * effectiveScale + pan.y), Math.max(12, stageHeight - 56))}px`,
            }}
          >
            <input
              type="text"
              autoFocus
              value={textDraft.value}
              onChange={(e) => setTextDraft({ ...textDraft, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCommitText()
                if (e.key === 'Escape') setTextDraft(null)
              }}
              placeholder="Type annotation..."
              className="px-2 py-1 text-sm text-slate-900 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 w-48"
            />
            <button
              type="button"
              onClick={handleCommitText}
              className="px-2 py-1 text-xs font-semibold bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

