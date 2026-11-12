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
 * @version     1.1.0
 * @created     2026-11-12
 * @updated     2026-11-12
 *
 * @description Interactive Konva + React-Konva + PDF.js multi-mode classroom canvas supporting Classic Greenboard/Blackboard chalk rendering, Digital Whiteboard, Grid/Ruled surfaces, non-destructive PDF annotations, Fit-to-Screen, keyboard shortcuts, and collapsible/dockable/floating toolbar integration.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Rect, Line, Arrow, Ellipse, Text as KonvaText, Image as KonvaImage, Group, Transformer } from 'react-konva'
import type Konva from 'konva'
import { ChevronLeft, ChevronRight, Lock, ZoomIn, ZoomOut, Maximize } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import { eduboardApi } from '../../api/endpoints'
import { useEduBoardDisplayStore } from '../../store/eduboardDisplayStore'
import EduBoardToolbar from './EduBoardToolbar'
import type {
  EduBoardBackgroundStyle,
  EduBoardMode,
  EduBoardPageItem,
  EduBoardSceneElement,
  EduBoardScenePayload,
  EduBoardTool,
} from '../../types'

export const EDUBOARD_LOGICAL_WIDTH = 1280
export const EDUBOARD_LOGICAL_HEIGHT = 720

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()
}

export function parseSceneJson(raw: string | EduBoardScenePayload | undefined | null): EduBoardScenePayload {
  if (!raw) return { schemaVersion: 1, elements: [] }
  if (typeof raw === 'object' && Array.isArray(raw.elements)) {
    return { schemaVersion: raw.schemaVersion || 1, elements: raw.elements }
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && Array.isArray(parsed.elements)) {
        return { schemaVersion: parsed.schemaVersion || 1, elements: parsed.elements }
      }
    } catch {
      // fall through
    }
  }
  return { schemaVersion: 1, elements: [] }
}

function makeUid(): string {
  return `el_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function pointsDist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1)
}

function pointNearPolyline(px: number, py: number, pts: number[], threshold: number): boolean {
  for (let i = 0; i < pts.length; i += 2) {
    if (pointsDist(px, py, pts[i], pts[i + 1]) <= threshold) return true
  }
  return false
}

export interface EduBoardCanvasProps {
  page: EduBoardPageItem
  readOnly?: boolean
  readOnlyLabel?: string
  hideToolbar?: boolean
  fullscreenFill?: boolean
  compactToolbar?: boolean
  pageIndex?: number
  totalPages?: number
  onPrevPage?: () => void
  onNextPage?: () => void
  onSceneChange?: (scene: EduBoardScenePayload) => void
  onModeOrBackgroundChange?: (mode: EduBoardMode, bg: EduBoardBackgroundStyle) => void
  onUploadInlineImage?: (file: File) => Promise<{ attachmentId: number; url: string } | null>
}

export default function EduBoardCanvas({
  page,
  readOnly = false,
  readOnlyLabel = 'Read-Only Student Lecture View',
  hideToolbar = false,
  fullscreenFill = false,
  compactToolbar = false,
  pageIndex,
  totalPages,
  onPrevPage,
  onNextPage,
  onSceneChange,
  onModeOrBackgroundChange,
  onUploadInlineImage,
}: EduBoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<Konva.Stage | null>(null)
  const transformerRef = useRef<Konva.Transformer | null>(null)
  const selectedNodeRef = useRef<Konva.Node | null>(null)
  const imageFileInputRef = useRef<HTMLInputElement | null>(null)

  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 960, h: 540 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Persistent shared toolbar & tool state across workspace mode switches
  const storeActiveTool = useEduBoardDisplayStore((s) => s.activeTool)
  const setStoreActiveTool = useEduBoardDisplayStore((s) => s.setActiveTool)
  const storeActiveColor = useEduBoardDisplayStore((s) => s.activeColor)
  const setStoreActiveColor = useEduBoardDisplayStore((s) => s.setActiveColor)
  const strokeSize = useEduBoardDisplayStore((s) => s.strokeSize)
  const setStrokeSize = useEduBoardDisplayStore((s) => s.setStrokeSize)
  const isPanMode = useEduBoardDisplayStore((s) => s.isPanMode)
  const setIsPanMode = useEduBoardDisplayStore((s) => s.setIsPanMode)
  const toolbarState = useEduBoardDisplayStore((s) => s.toolbarState)
  const setToolbarState = useEduBoardDisplayStore((s) => s.setToolbarState)
  const toolbarPosition = useEduBoardDisplayStore((s) => s.toolbarPosition)
  const setToolbarPosition = useEduBoardDisplayStore((s) => s.setToolbarPosition)
  const floatingPos = useEduBoardDisplayStore((s) => s.floatingPos)
  const setFloatingPos = useEduBoardDisplayStore((s) => s.setFloatingPos)

  const [stylusOnly, setStylusOnly] = useState(false)
  const [spacePanActive, setSpacePanActive] = useState(false)

  const scene = useMemo(() => parseSceneJson(page.scene_json), [page.scene_json])
  const [elements, setElements] = useState<EduBoardSceneElement[]>(scene.elements)
  const [draftElement, setDraftElement] = useState<EduBoardSceneElement | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [undoStack, setUndoStack] = useState<EduBoardSceneElement[][]>([])
  const [redoStack, setRedoStack] = useState<EduBoardSceneElement[][]>([])
  const [textDraft, setTextDraft] = useState<{ x: number; y: number; value: string; existingId?: string } | null>(null)

  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)
  const [bgLoading, setBgLoading] = useState(false)
  const [bgLoadError, setBgLoadError] = useState<string | null>(null)
  const [inlineImages, setInlineImages] = useState<Record<string, HTMLImageElement>>({})

  const drawingRef = useRef(false)
  const panStartRef = useRef<{ x: number; y: number; origX: number; origY: number } | null>(null)
  const spacePrevPanRef = useRef<boolean | null>(null)
  const activeBackground = page.background_style || (page.mode === 'classic' ? 'greenboard' : 'white')
  const isDarkBoard = activeBackground === 'blackboard' || activeBackground === 'greenboard'

  // Auto-align tool/color contrast when switching page into dark or light surface
  useEffect(() => {
    const darkPalette = new Set(['#ffffff', '#fde047', '#f9a8d4', '#67e8f9', '#86efac'])
    if (isDarkBoard && !darkPalette.has(storeActiveColor)) {
      setStoreActiveColor('#ffffff')
      if (storeActiveTool === 'pen') setStoreActiveTool('chalk')
    } else if (!isDarkBoard && storeActiveColor === '#ffffff') {
      setStoreActiveColor('#111827')
      if (storeActiveTool === 'chalk') setStoreActiveTool('pen')
    }
  }, [isDarkBoard]) // intentionally scoped to surface polarity switch only

  // Sync elements when switching pages or receiving remote updates
  useEffect(() => {
    const parsed = parseSceneJson(page.scene_json)
    setElements(parsed.elements)
    setDraftElement(null)
    setSelectedId(null)
    setUndoStack([])
    setRedoStack([])
    setTextDraft(null)
  }, [page.page_uid])

  useEffect(() => {
    if (!drawingRef.current) {
      setElements(parseSceneJson(page.scene_json).elements)
    }
  }, [page.scene_json])

  // Attach Konva Transformer when an element is selected
  useEffect(() => {
    if (!transformerRef.current) return
    if (selectedId && selectedNodeRef.current && !readOnly) {
      transformerRef.current.nodes([selectedNodeRef.current])
      transformerRef.current.getLayer()?.batchDraw()
    } else {
      transformerRef.current.nodes([])
      transformerRef.current.getLayer()?.batchDraw()
    }
  }, [selectedId, elements, readOnly])

  // Measure container dynamically for responsive fit-to-screen scaling
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const updateSize = () => {
      const w = el.clientWidth || 960
      const availH = el.clientHeight > 220 ? el.clientHeight - 8 : Math.round((w * 9) / 16)
      const h = fullscreenFill ? availH : Math.max(360, Math.min(availH, Math.round((w * 9) / 16)))
      setContainerSize({ w, h })
    }
    updateSize()
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateSize)
      ro.observe(el)
      return () => ro.disconnect()
    }
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [fullscreenFill, toolbarPosition, toolbarState])

  // Load PDF slide or image background via authenticated API blobs
  useEffect(() => {
    let active = true
    let createdUrl: string | null = null
    setBgImage(null)
    setBgLoadError(null)

    if (!page.source_attachment_id) return

    const loadBg = async () => {
      setBgLoading(true)
      try {
        if (page.source_page_number) {
          try {
            const blobRes = await eduboardApi.fetchAttachmentBlob(page.source_attachment_id!)
            const buf = await blobRes.data.arrayBuffer()
            const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buf) })
            const pdf = await loadingTask.promise
            const pdfPage = await pdf.getPage(page.source_page_number)
            const vp = pdfPage.getViewport({ scale: 1.8 })
            const offscreen = document.createElement('canvas')
            offscreen.width = vp.width
            offscreen.height = vp.height
            const ctx = offscreen.getContext('2d')
            if (ctx) {
              await pdfPage.render({ canvasContext: ctx, viewport: vp, canvas: offscreen } as any).promise
              const dataUrl = offscreen.toDataURL('image/png')
              const img = new window.Image()
              img.onload = () => {
                if (active) setBgImage(img)
              }
              img.src = dataUrl
              return
            }
          } catch {
            const pngRes = await eduboardApi.fetchRenderedPdfPageBlob(
              page.source_attachment_id!,
              page.source_page_number!,
            )
            createdUrl = URL.createObjectURL(pngRes.data)
            const img = new window.Image()
            img.onload = () => {
              if (active) setBgImage(img)
            }
            img.src = createdUrl
          }
        } else {
          const blobRes = await eduboardApi.fetchAttachmentBlob(page.source_attachment_id!)
          createdUrl = URL.createObjectURL(blobRes.data)
          const img = new window.Image()
          img.onload = () => {
            if (active) setBgImage(img)
          }
          img.src = createdUrl
        }
      } catch {
        if (active) setBgLoadError('Could not load attached slide asset')
      } finally {
        if (active) setBgLoading(false)
      }
    }

    void loadBg()

    return () => {
      active = false
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [page.source_attachment_id, page.source_page_number])

  // Load inline board images dynamically via authenticated API blob fetch
  useEffect(() => {
    let active = true
    const urlsToRevoke: string[] = []
    elements.forEach((el) => {
      if (el.type === 'image' && el.attachmentId && !inlineImages[el.id]) {
        eduboardApi
          .fetchAttachmentBlob(el.attachmentId)
          .then((res) => {
            if (!active) return
            const url = URL.createObjectURL(res.data)
            urlsToRevoke.push(url)
            const img = new window.Image()
            img.onload = () => {
              if (active) setInlineImages((prev) => ({ ...prev, [el.id]: img }))
            }
            img.src = url
          })
          .catch(() => {})
      }
    })
    return () => {
      active = false
      urlsToRevoke.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [elements, inlineImages])

  const commitElements = useCallback(
    (next: EduBoardSceneElement[], pushHistory = true) => {
      if (readOnly) return
      if (pushHistory) {
        setUndoStack((prev) => [...prev.slice(-39), elements])
        setRedoStack([])
      }
      setElements(next)
      onSceneChange?.({ schemaVersion: 1, elements: next })
    },
    [elements, onSceneChange, readOnly],
  )

  const handleUndo = useCallback(() => {
    if (readOnly || undoStack.length === 0) return
    const prev = undoStack[undoStack.length - 1]
    setUndoStack((s) => s.slice(0, -1))
    setRedoStack((r) => [...r, elements])
    setElements(prev)
    onSceneChange?.({ schemaVersion: 1, elements: prev })
  }, [elements, onSceneChange, readOnly, undoStack])

  const handleRedo = useCallback(() => {
    if (readOnly || redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    setRedoStack((r) => r.slice(0, -1))
    setUndoStack((u) => [...u, elements])
    setElements(next)
    onSceneChange?.({ schemaVersion: 1, elements: next })
  }, [elements, onSceneChange, readOnly, redoStack])

  const handleFitToScreen = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setIsPanMode(false)
  }, [setIsPanMode])

  const handleDeleteSelected = useCallback(() => {
    if (readOnly || !selectedId) return
    commitElements(elements.filter((item) => item.id !== selectedId))
    setSelectedId(null)
  }, [commitElements, elements, readOnly, selectedId])

  // Keyboard Shortcuts (tools, undo/redo, zoom/fit, delete, space-to-pan)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (!readOnly) {
          e.preventDefault()
          if (e.shiftKey) handleRedo()
          else handleUndo()
        }
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        if (!readOnly) {
          e.preventDefault()
          handleRedo()
        }
        return
      }

      if (e.key === '+' || e.key === '=') {
        setZoom((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))))
        return
      }
      if (e.key === '-') {
        setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))
        return
      }
      if (e.key === '0') {
        handleFitToScreen()
        return
      }

      if (readOnly) return

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        spacePrevPanRef.current = isPanMode
        setSpacePanActive(true)
        setIsPanMode(true)
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault()
        handleDeleteSelected()
        return
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return
      const keyMap: Record<string, EduBoardTool> = {
        v: 'select',
        p: isDarkBoard ? 'chalk' : 'pen',
        c: 'chalk',
        h: 'highlighter',
        e: 'eraser',
        l: 'line',
        a: 'arrow',
        r: 'rect',
        o: 'circle',
        t: 'text',
      }
      const mapped = keyMap[e.key.toLowerCase()]
      if (mapped) {
        setStoreActiveTool(mapped)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && spacePrevPanRef.current !== null) {
        setSpacePanActive(false)
        setIsPanMode(spacePrevPanRef.current)
        spacePrevPanRef.current = null
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [
    readOnly,
    handleUndo,
    handleRedo,
    handleFitToScreen,
    handleDeleteSelected,
    isPanMode,
    setIsPanMode,
    selectedId,
    isDarkBoard,
    setStoreActiveTool,
  ])

  const fitScale = Math.min(
    containerSize.w / EDUBOARD_LOGICAL_WIDTH,
    containerSize.h / EDUBOARD_LOGICAL_HEIGHT,
  )
  const effectiveScale = fitScale * zoom

  const toLogicalCoords = (stage: Konva.Stage): { x: number; y: number } | null => {
    const pos = stage.getPointerPosition()
    if (!pos) return null
    return {
      x: (pos.x - pan.x) / effectiveScale,
      y: (pos.y - pan.y) / effectiveScale,
    }
  }

  const handlePointerDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
    if (stylusOnly && e.evt.pointerType === 'touch') return

    const stage = e.target.getStage()
    if (!stage) return

    if (isPanMode || spacePanActive || (readOnly && zoom > 1)) {
      panStartRef.current = { x: e.evt.clientX, y: e.evt.clientY, origX: pan.x, origY: pan.y }
      return
    }
    if (readOnly) return

    const pt = toLogicalCoords(stage)
    if (!pt) return

    if (storeActiveTool === 'select') {
      if (e.target === stage || e.target.name() === 'eduboard-bg') {
        setSelectedId(null)
      }
      return
    }

    if (storeActiveTool === 'text') {
      setTextDraft({ x: pt.x, y: pt.y, value: '' })
      return
    }

    if (storeActiveTool === 'eraser') {
      drawingRef.current = true
      const filtered = elements.filter((el) => {
        if (el.points && pointNearPolyline(pt.x, pt.y, el.points, 18)) return false
        if (el.x !== undefined && el.y !== undefined) {
          const w = el.width ?? 60
          const h = el.height ?? 40
          const minX = Math.min(el.x, el.x + w)
          const maxX = Math.max(el.x, el.x + w)
          const minY = Math.min(el.y, el.y + h)
          const maxY = Math.max(el.y, el.y + h)
          if (pt.x >= minX - 12 && pt.x <= maxX + 12 && pt.y >= minY - 12 && pt.y <= maxY + 12) return false
        }
        return true
      })
      if (filtered.length !== elements.length) {
        commitElements(filtered)
      }
      return
    }

    drawingRef.current = true
    const pressure = e.evt.pressure && e.evt.pressure > 0 ? e.evt.pressure : 0.5
    const resolvedTool = isDarkBoard && storeActiveTool === 'pen' ? 'chalk' : storeActiveTool

    if (resolvedTool === 'pen' || resolvedTool === 'marker' || resolvedTool === 'chalk' || resolvedTool === 'highlighter') {
      const sz =
        resolvedTool === 'highlighter'
          ? Math.max(14, strokeSize * 3.5)
          : resolvedTool === 'marker'
            ? strokeSize * 1.8
            : strokeSize
      const op = resolvedTool === 'highlighter' ? 0.34 : 1
      setDraftElement({
        id: makeUid(),
        type: 'stroke',
        tool: resolvedTool,
        points: [pt.x, pt.y],
        pressures: [pressure],
        color: storeActiveColor,
        size: sz,
        opacity: op,
      })
    } else if (resolvedTool === 'line' || resolvedTool === 'arrow') {
      setDraftElement({
        id: makeUid(),
        type: resolvedTool,
        points: [pt.x, pt.y, pt.x, pt.y],
        color: storeActiveColor,
        size: strokeSize,
      })
    } else if (resolvedTool === 'rect' || resolvedTool === 'circle') {
      setDraftElement({
        id: makeUid(),
        type: resolvedTool,
        x: pt.x,
        y: pt.y,
        width: 0,
        height: 0,
        color: storeActiveColor,
        size: strokeSize,
      })
    }
  }

  const handlePointerMove = (e: Konva.KonvaEventObject<PointerEvent>) => {
    if (panStartRef.current) {
      const dx = e.evt.clientX - panStartRef.current.x
      const dy = e.evt.clientY - panStartRef.current.y
      setPan({ x: panStartRef.current.origX + dx, y: panStartRef.current.origY + dy })
      return
    }
    if (readOnly || !drawingRef.current) return
    const stage = e.target.getStage()
    if (!stage) return
    const pt = toLogicalCoords(stage)
    if (!pt) return

    if (storeActiveTool === 'eraser') {
      const filtered = elements.filter((el) => {
        if (el.points && pointNearPolyline(pt.x, pt.y, el.points, 18)) return false
        return true
      })
      if (filtered.length !== elements.length) {
        commitElements(filtered, false)
      }
      return
    }

    if (!draftElement) return
    if (draftElement.type === 'stroke') {
      const pressure = e.evt.pressure && e.evt.pressure > 0 ? e.evt.pressure : 0.5
      setDraftElement((prev) =>
        prev
          ? {
              ...prev,
              points: [...(prev.points || []), pt.x, pt.y],
              pressures: [...(prev.pressures || []), pressure],
            }
          : null,
      )
    } else if (draftElement.type === 'line' || draftElement.type === 'arrow') {
      const pts = draftElement.points || [0, 0, 0, 0]
      setDraftElement({ ...draftElement, points: [pts[0], pts[1], pt.x, pt.y] })
    } else if (draftElement.type === 'rect' || draftElement.type === 'circle') {
      const ox = draftElement.x ?? 0
      const oy = draftElement.y ?? 0
      setDraftElement({ ...draftElement, width: pt.x - ox, height: pt.y - oy })
    }
  }

  const handlePointerUp = () => {
    if (panStartRef.current) {
      panStartRef.current = null
      return
    }
    if (!drawingRef.current) return
    drawingRef.current = false
    if (draftElement) {
      commitElements([...elements, draftElement])
      setDraftElement(null)
    }
  }

  const handleInlineImagePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !onUploadInlineImage) return
    const uploaded = await onUploadInlineImage(file)
    if (!uploaded) return
    const newEl: EduBoardSceneElement = {
      id: makeUid(),
      type: 'image',
      x: 160,
      y: 110,
      width: 360,
      height: 240,
      attachmentId: uploaded.attachmentId,
    }
    commitElements([...elements, newEl])
  }

  const handleAppearanceChange = (nextBg: EduBoardBackgroundStyle, nextMode: EduBoardMode) => {
    onModeOrBackgroundChange?.(nextMode, nextBg)
  }

  const canvasBgHex =
    activeBackground === 'blackboard'
      ? '#131720'
      : activeBackground === 'greenboard'
        ? '#0f4c35'
        : activeBackground === 'pdf_slide'
          ? '#f1f5f9'
          : '#ffffff'

  const bgPatternElements = useMemo(() => {
    const nodes: React.ReactNode[] = []
    if (activeBackground === 'grid') {
      for (let x = 32; x < EDUBOARD_LOGICAL_WIDTH; x += 32) {
        nodes.push(
          <Line
            key={`gx_${x}`}
            points={[x, 0, x, EDUBOARD_LOGICAL_HEIGHT]}
            stroke="#e2e8f0"
            strokeWidth={1}
            listening={false}
          />,
        )
      }
      for (let y = 32; y < EDUBOARD_LOGICAL_HEIGHT; y += 32) {
        nodes.push(
          <Line
            key={`gy_${y}`}
            points={[0, y, EDUBOARD_LOGICAL_WIDTH, y]}
            stroke="#e2e8f0"
            strokeWidth={1}
            listening={false}
          />,
        )
      }
    } else if (activeBackground === 'notebook') {
      nodes.push(
        <Line
          key="nb_margin"
          points={[96, 0, 96, EDUBOARD_LOGICAL_HEIGHT]}
          stroke="#fda4af"
          strokeWidth={1.5}
          listening={false}
        />,
      )
      for (let y = 44; y < EDUBOARD_LOGICAL_HEIGHT; y += 36) {
        nodes.push(
          <Line
            key={`ny_${y}`}
            points={[0, y, EDUBOARD_LOGICAL_WIDTH, y]}
            stroke="#dbeafe"
            strokeWidth={1}
            listening={false}
          />,
        )
      }
    } else if (activeBackground === 'greenboard' || activeBackground === 'blackboard') {
      // Classroom chalkboard border frame line
      nodes.push(
        <Rect
          key="chalkboard-inner-frame"
          x={6}
          y={6}
          width={EDUBOARD_LOGICAL_WIDTH - 12}
          height={EDUBOARD_LOGICAL_HEIGHT - 12}
          stroke={activeBackground === 'greenboard' ? '#1e6b4d' : '#263042'}
          strokeWidth={2}
          listening={false}
        />,
      )
    }
    return nodes
  }, [activeBackground])

  const renderElement = (el: EduBoardSceneElement) => {
    const isSelectable = !readOnly && storeActiveTool === 'select'
    const isSelected = el.id === selectedId
    const commonInteractive = {
      draggable: isSelectable,
      onClick: () => {
        if (isSelectable) setSelectedId(el.id)
      },
      onTap: () => {
        if (isSelectable) setSelectedId(el.id)
      },
      onDragEnd: (evt: Konva.KonvaEventObject<DragEvent>) => {
        const node = evt.target
        const dx = node.x()
        const dy = node.y()
        if (dx === 0 && dy === 0) return
        if (el.type === 'stroke' || el.type === 'line' || el.type === 'arrow') {
          node.position({ x: 0, y: 0 })
          const shifted = (el.points || []).map((v, idx) => (idx % 2 === 0 ? v + dx : v + dy))
          commitElements(elements.map((item) => (item.id === el.id ? { ...item, points: shifted } : item)))
        } else {
          commitElements(
            elements.map((item) => (item.id === el.id ? { ...item, x: dx, y: dy } : item)),
          )
        }
      },
      ref: (node: Konva.Node | null) => {
        if (isSelected && node) selectedNodeRef.current = node
      },
    }

    if (el.type === 'stroke') {
      const isChalkStroke = el.tool === 'chalk' || (isDarkBoard && el.tool !== 'highlighter')
      const strokeColor = el.color || (isDarkBoard ? '#ffffff' : '#111827')
      const baseW = el.size || 3
      if (isChalkStroke) {
        // Textured classroom chalk stroke: soft powdery outer aura + crisp inner chalk line
        return (
          <Group key={el.id} {...commonInteractive}>
            <Line
              points={el.points || []}
              stroke={strokeColor}
              strokeWidth={baseW * 1.45}
              opacity={0.28}
              tension={0.35}
              lineCap="round"
              lineJoin="round"
              dash={[Math.max(2, baseW * 0.9), 0.75]}
            />
            <Line
              points={el.points || []}
              stroke={strokeColor}
              strokeWidth={baseW}
              opacity={0.96}
              tension={0.4}
              lineCap="round"
              lineJoin="round"
              shadowColor={strokeColor}
              shadowBlur={1.8}
              shadowOpacity={0.35}
            />
          </Group>
        )
      }
      return (
        <Line
          key={el.id}
          {...commonInteractive}
          points={el.points || []}
          stroke={strokeColor}
          strokeWidth={baseW}
          opacity={el.opacity ?? 1}
          tension={0.4}
          lineCap="round"
          lineJoin="round"
        />
      )
    }

    if (el.type === 'line') {
      return (
        <Line
          key={el.id}
          {...commonInteractive}
          points={el.points || [0, 0, 100, 100]}
          stroke={el.color || (isDarkBoard ? '#ffffff' : '#111827')}
          strokeWidth={el.size || 3}
          lineCap="round"
        />
      )
    }

    if (el.type === 'arrow') {
      return (
        <Arrow
          key={el.id}
          {...commonInteractive}
          points={el.points || [0, 0, 100, 100]}
          stroke={el.color || (isDarkBoard ? '#ffffff' : '#111827')}
          fill={el.color || (isDarkBoard ? '#ffffff' : '#111827')}
          strokeWidth={el.size || 3}
          pointerLength={12}
          pointerWidth={10}
        />
      )
    }

    if (el.type === 'rect') {
      const rw = el.width ?? 0
      const rh = el.height ?? 0
      return (
        <Rect
          key={el.id}
          {...commonInteractive}
          x={rw >= 0 ? el.x ?? 0 : (el.x ?? 0) + rw}
          y={rh >= 0 ? el.y ?? 0 : (el.y ?? 0) + rh}
          width={Math.abs(rw)}
          height={Math.abs(rh)}
          stroke={el.color || (isDarkBoard ? '#ffffff' : '#111827')}
          strokeWidth={el.size || 3}
        />
      )
    }

    if (el.type === 'circle') {
      const cw = Math.abs(el.width ?? 0)
      const ch = Math.abs(el.height ?? 0)
      const cx = (el.x ?? 0) + (el.width ?? 0) / 2
      const cy = (el.y ?? 0) + (el.height ?? 0) / 2
      return (
        <Ellipse
          key={el.id}
          {...commonInteractive}
          x={cx}
          y={cy}
          radiusX={cw / 2}
          radiusY={ch / 2}
          stroke={el.color || (isDarkBoard ? '#ffffff' : '#111827')}
          strokeWidth={el.size || 3}
        />
      )
    }

    if (el.type === 'text') {
      return (
        <KonvaText
          key={el.id}
          {...commonInteractive}
          x={el.x ?? 0}
          y={el.y ?? 0}
          text={el.text || ''}
          fontSize={el.fontSize || 22}
          fill={el.color || (isDarkBoard ? '#ffffff' : '#111827')}
          fontFamily={isDarkBoard ? 'Georgia, serif' : 'Inter, system-ui, sans-serif'}
          onDblClick={() => {
            if (!readOnly) {
              setTextDraft({
                x: el.x ?? 0,
                y: el.y ?? 0,
                value: el.text || '',
                existingId: el.id,
              })
            }
          }}
        />
      )
    }

    if (el.type === 'image') {
      const img = inlineImages[el.id]
      if (!img) return null
      return (
        <KonvaImage
          key={el.id}
          {...commonInteractive}
          image={img}
          x={el.x ?? 100}
          y={el.y ?? 100}
          width={el.width ?? 320}
          height={el.height ?? 220}
        />
      )
    }

    return null
  }

  const effectiveToolbarState = hideToolbar
    ? 'hidden'
    : compactToolbar && toolbarState === 'expanded'
      ? 'compact'
      : toolbarState

  const flexWrapClass =
    toolbarPosition === 'bottom'
      ? 'flex-col-reverse'
      : toolbarPosition === 'left'
        ? 'flex-row'
        : toolbarPosition === 'right'
          ? 'flex-row-reverse'
          : 'flex-col'

  const stageOuterBezelClass =
    activeBackground === 'greenboard'
      ? 'border-4 border-emerald-950/90 shadow-inner bg-emerald-950'
      : activeBackground === 'blackboard'
        ? 'border-4 border-slate-900 shadow-inner bg-slate-950'
        : 'border border-slate-300 bg-slate-100'

  return (
    <div className={`relative flex ${flexWrapClass} gap-2 w-full ${fullscreenFill ? 'h-full' : ''}`}>
      {/* Read-Only Banner for Student Portal or Presentation Projector View */}
      {readOnly ? (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/95 text-white px-3 py-1.5 rounded-xl text-xs shadow-xs shrink-0">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            {readOnlyLabel}
          </span>
          <div className="flex items-center gap-1.5">
            {totalPages && totalPages > 1 && (
              <div className="inline-flex items-center gap-1 bg-slate-800 rounded-lg px-1.5 py-0.5 mr-1">
                <button
                  type="button"
                  disabled={!pageIndex || pageIndex <= 0}
                  onClick={onPrevPage}
                  aria-label="Previous Page"
                  className="p-1 rounded hover:bg-slate-700 disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono px-1">
                  {(pageIndex ?? 0) + 1}/{totalPages}
                </span>
                <button
                  type="button"
                  disabled={pageIndex === undefined || pageIndex >= totalPages - 1}
                  onClick={onNextPage}
                  aria-label="Next Page"
                  className="p-1 rounded hover:bg-slate-700 disabled:opacity-40"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
              aria-label="Zoom Out"
              className="p-1 rounded hover:bg-slate-700"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px]">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))))}
              aria-label="Zoom In"
              className="p-1 rounded hover:bg-slate-700"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleFitToScreen}
              aria-label="Fit to Screen"
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px]"
              title="Fit to Screen (0)"
            >
              <Maximize className="w-3 h-3 inline mr-1" />
              Fit
            </button>
          </div>
        </div>
      ) : (
        !hideToolbar && (
          <EduBoardToolbar
            backgroundStyle={activeBackground}
            isDarkBoard={isDarkBoard}
            activeTool={storeActiveTool}
            activeColor={storeActiveColor}
            strokeSize={strokeSize}
            isPanMode={isPanMode || spacePanActive}
            stylusOnly={stylusOnly}
            zoom={zoom}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            toolbarState={effectiveToolbarState}
            toolbarPosition={toolbarPosition}
            floatingPos={floatingPos}
            hasSelection={!!selectedId}
            onSelectTool={(t) => setStoreActiveTool(t)}
            onSelectColor={(c) => setStoreActiveColor(c)}
            onChangeStrokeSize={(sz) => setStrokeSize(sz)}
            onTogglePanMode={() => setIsPanMode(!isPanMode)}
            onToggleStylusOnly={() => setStylusOnly((s) => !s)}
            onChangeAppearance={handleAppearanceChange}
            onZoomIn={() => setZoom((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))))}
            onZoomOut={() => setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
            onFitToScreen={handleFitToScreen}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onDeleteSelected={handleDeleteSelected}
            onClearPage={() => commitElements([])}
            onPickImage={() => imageFileInputRef.current?.click()}
            onChangeToolbarState={(st) => setToolbarState(st)}
            onChangeToolbarPosition={(pos) => setToolbarPosition(pos)}
            onChangeFloatingPos={(pos) => setFloatingPos(pos)}
          />
        )
      )}

      {/* Hidden inline image upload input */}
      <input
        ref={imageFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleInlineImagePicked}
      />

      {/* Responsive Konva Stage Wrapper */}
      <div
        ref={containerRef}
        data-testid="eduboard-stage-frame"
        data-surface={activeBackground}
        className={`relative flex-1 w-full rounded-xl overflow-hidden shadow-inner flex items-center justify-center select-none ${stageOuterBezelClass} ${
          fullscreenFill ? 'min-h-[480px]' : ''
        }`}
        style={{
          touchAction: 'none',
          background:
            activeBackground === 'greenboard'
              ? 'radial-gradient(circle at 50% 42%, #155e42 0%, #0f4c35 65%, #093524 100%)'
              : activeBackground === 'blackboard'
                ? 'radial-gradient(circle at 50% 42%, #1c2230 0%, #131720 75%, #0b0e14 100%)'
                : undefined,
        }}
      >
        {bgLoading && (
          <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-slate-900/80 text-white text-[11px] font-medium">
            Rendering Slide...
          </div>
        )}
        {bgLoadError && (
          <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 text-xs font-medium border border-rose-200">
            {bgLoadError}
          </div>
        )}

        <Stage
          ref={stageRef}
          width={containerSize.w}
          height={containerSize.h}
          scaleX={effectiveScale}
          scaleY={effectiveScale}
          x={pan.x}
          y={pan.y}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            cursor:
              isPanMode || spacePanActive
                ? 'grab'
                : readOnly
                  ? 'default'
                  : storeActiveTool === 'select'
                    ? 'default'
                    : storeActiveTool === 'text'
                      ? 'text'
                      : 'crosshair',
          }}
        >
          <Layer>
            {/* Base Board Surface */}
            <Rect
              name="eduboard-bg"
              x={0}
              y={0}
              width={EDUBOARD_LOGICAL_WIDTH}
              height={EDUBOARD_LOGICAL_HEIGHT}
              fill={canvasBgHex}
            />
            {bgPatternElements}

            {/* Uploaded PDF Slide / Reference Image */}
            {bgImage && (
              <KonvaImage
                name="eduboard-bg"
                image={bgImage}
                x={0}
                y={0}
                width={EDUBOARD_LOGICAL_WIDTH}
                height={EDUBOARD_LOGICAL_HEIGHT}
                listening={false}
              />
            )}

            {/* Vector Strokes, Chalk, Shapes, Text & Inline Images */}
            {elements.map((el) => renderElement(el))}
            {draftElement && renderElement(draftElement)}

            <Transformer
              ref={transformerRef}
              rotateEnabled={false}
              boundBoxFunc={(oldBox, newBox) => (newBox.width < 10 || newBox.height < 10 ? oldBox : newBox)}
            />
          </Layer>
        </Stage>

        {/* Subtle Classroom Chalk Tray Trim on Greenboard / Blackboard */}
        {(activeBackground === 'greenboard' || activeBackground === 'blackboard') && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 inset-x-6 h-2 rounded-t-md bg-gradient-to-b from-amber-700/80 via-amber-800/90 to-amber-950 shadow-md flex items-center justify-end pr-6 gap-2"
          >
            <span className="w-5 h-1 rounded-full bg-white/90" />
            <span className="w-4 h-1 rounded-full bg-yellow-300/90" />
            <span className="w-4 h-1 rounded-full bg-pink-300/85" />
          </div>
        )}

        {/* Quick Page Overlay Stepper in Teacher Fullscreen / Focus View */}
        {!readOnly && totalPages && totalPages > 1 && (
          <div className="absolute bottom-3 right-3 z-20 inline-flex items-center gap-1 rounded-full bg-slate-900/80 text-white px-2.5 py-1 text-xs shadow-lg backdrop-blur-xs border border-slate-700/70">
            <button
              type="button"
              disabled={!pageIndex || pageIndex <= 0}
              onClick={onPrevPage}
              aria-label="Previous Slide"
              className="p-0.5 rounded-full hover:bg-slate-700 disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] px-1">
              Page {(pageIndex ?? 0) + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={pageIndex === undefined || pageIndex >= totalPages - 1}
              onClick={onNextPage}
              aria-label="Next Slide"
              className="p-0.5 rounded-full hover:bg-slate-700 disabled:opacity-40"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Inline Text Input Overlay (Create or Edit Existing Text) */}
        {textDraft && !readOnly && (
          <div
            className="absolute z-30 bg-white border-2 border-indigo-500 rounded-lg shadow-lg p-1.5 flex items-center gap-1.5"
            style={{
              left: `${Math.min(Math.max(textDraft.x * effectiveScale + pan.x, 12), containerSize.w - 240)}px`,
              top: `${Math.min(Math.max(textDraft.y * effectiveScale + pan.y, 12), containerSize.h - 60)}px`,
            }}
          >
            <input
              type="text"
              autoFocus
              value={textDraft.value}
              onChange={(e) => setTextDraft({ ...textDraft, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && textDraft.value.trim()) {
                  if (textDraft.existingId) {
                    commitElements(
                      elements.map((item) =>
                        item.id === textDraft.existingId ? { ...item, text: textDraft.value.trim() } : item,
                      ),
                    )
                  } else {
                    commitElements([
                      ...elements,
                      {
                        id: makeUid(),
                        type: 'text',
                        x: textDraft.x,
                        y: textDraft.y,
                        text: textDraft.value.trim(),
                        color: storeActiveColor,
                        fontSize: Math.max(18, strokeSize * 4),
                      },
                    ])
                  }
                  setTextDraft(null)
                } else if (e.key === 'Escape') {
                  setTextDraft(null)
                }
              }}
              placeholder="Type text & press Enter..."
              className="text-sm px-2 py-1 border border-slate-200 rounded w-48 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (textDraft.value.trim()) {
                  if (textDraft.existingId) {
                    commitElements(
                      elements.map((item) =>
                        item.id === textDraft.existingId ? { ...item, text: textDraft.value.trim() } : item,
                      ),
                    )
                  } else {
                    commitElements([
                      ...elements,
                      {
                        id: makeUid(),
                        type: 'text',
                        x: textDraft.x,
                        y: textDraft.y,
                        text: textDraft.value.trim(),
                        color: storeActiveColor,
                        fontSize: Math.max(18, strokeSize * 4),
                      },
                    ])
                  }
                }
                setTextDraft(null)
              }}
              className="px-2 py-1 bg-indigo-600 text-white text-xs rounded font-medium"
            >
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
