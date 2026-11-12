/**
 * @file        EduBoardWindowPage.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.pages
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
 * @description Chromeless detached Pop-Out EduBoard Window route (/eduboard/window) supporting Teacher Edit, Collaborator, and Read-Only Presentation Projector views with short-lived scoped auth and live bidirectional WebSocket + BroadcastChannel sync.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  Maximize2,
  Minimize2,
  Plus,
  RefreshCw,
  Save,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react'
import EduBoardCanvas from '../components/eduboard/EduBoardCanvas'
import { eduboardApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useEnvironmentStore } from '../store/environmentStore'
import { useEduBoardSync } from '../hooks/useEduBoardSync'
import { saveRecoverySnapshot, clearRecoverySnapshot } from '../utils/eduboardRecovery'
import type {
  EduBoardBackgroundStyle,
  EduBoardDetailItem,
  EduBoardMode,
  EduBoardPageItem,
  EduBoardPopoutMode,
  EduBoardScenePayload,
} from '../types'

export default function EduBoardWindowPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const launchToken = searchParams.get('launch') || ''
  const { user } = useAuthStore()
  const dataEnv = useEnvironmentStore((s) => s.dataEnvironment)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const autosaveTimerRef = useRef<number | null>(null)

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [board, setBoard] = useState<EduBoardDetailItem | null>(null)
  const [pages, setPages] = useState<EduBoardPageItem[]>([])
  const [activePageUid, setActivePageUid] = useState<string>('')
  const [effectiveMode, setEffectiveMode] = useState<EduBoardPopoutMode>('presentation')
  const [canEdit, setCanEdit] = useState(false)
  const [institutionName, setInstitutionName] = useState('PrathamOne Academy')
  const [teacherName, setTeacherName] = useState('')
  const [wsToken, setWsToken] = useState<string | null>(null)
  const [uiConfig, setUiConfig] = useState<{
    surface?: EduBoardBackgroundStyle | null
    compact_tools: boolean
    show_branding: boolean
    hide_toolbar: boolean
  }>({ compact_tools: true, show_branding: true, hide_toolbar: false })

  const [isDirty, setIsDirty] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'conflict' | 'error'>('idle')
  const [syncMessage, setSyncMessage] = useState('')
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false)

  // Resolve short-lived scoped launch token from backend
  useEffect(() => {
    let active = true
    if (!launchToken) {
      setErrorMsg('Missing detached board launch token. Open the board via the EduBoard Pop Out menu.')
      setLoading(false)
      return
    }

    setLoading(true)
    setErrorMsg(null)
    eduboardApi
      .resolvePopoutSession(launchToken)
      .then((res) => {
        if (!active) return
        const payload = res.data
        setBoard(payload.board)
        setEffectiveMode(payload.effective_mode)
        setCanEdit(payload.permissions.can_edit)
        setInstitutionName(payload.institution_name)
        setTeacherName(payload.teacher_name)
        setWsToken(payload.ws_token)
        setUiConfig(payload.ui_config)

        const sorted = [...(payload.board.pages || [])].sort((a, b) => a.page_order - b.page_order)
        // Apply temporary surface override locally if requested (e.g. "Open Greenboard in New Tab")
        const requestedSurface = payload.ui_config.surface
        const adjusted = requestedSurface
          ? sorted.map((pg, idx) =>
              idx === 0
                ? {
                    ...pg,
                    background_style: requestedSurface,
                    mode: (requestedSurface === 'greenboard' || requestedSurface === 'blackboard'
                      ? 'classic'
                      : requestedSurface === 'pdf_slide'
                        ? 'presentation'
                        : 'whiteboard') as EduBoardMode,
                  }
                : pg,
            )
          : sorted
        setPages(adjusted)
        setActivePageUid((prev) =>
          adjusted.some((p) => p.page_uid === prev) ? prev : adjusted[0]?.page_uid || '',
        )
      })
      .catch((err: any) => {
        if (!active) return
        setErrorMsg(err?.response?.data?.detail || 'Detached board session expired or access denied.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [launchToken])

  // Real-time bidirectional multi-tab sync
  const handleRemotePagesSync = useCallback(
    (incomingPages: EduBoardPageItem[], incomingActiveUid?: string) => {
      setPages([...incomingPages].sort((a, b) => a.page_order - b.page_order))
      if (effectiveMode === 'presentation' && incomingActiveUid) {
        setActivePageUid(incomingActiveUid)
      }
      setSyncMessage('Live synced from main workspace')
    },
    [effectiveMode],
  )

  const handleRemoteRevisionCommitted = useCallback((updatedBoard: EduBoardDetailItem) => {
    setBoard(updatedBoard)
    const sorted = [...(updatedBoard.pages || [])].sort((a, b) => a.page_order - b.page_order)
    setPages(sorted)
    setIsDirty(false)
    setSyncStatus('saved')
    setSyncMessage(`Synced rev #${updatedBoard.latest_revision_no}`)
  }, [])

  const {
    clientId,
    wsState,
    broadcastScenePatch,
    notifyCommittedRevision,
  } = useEduBoardSync({
    boardId: board?.id ?? null,
    institutionId: board?.institution_id ?? (user?.institution_id || 1),
    dataEnvironment: dataEnv,
    latestRevisionNo: board?.latest_revision_no ?? 1,
    windowType: 'detached',
    surface: uiConfig.surface || undefined,
    explicitWsToken: wsToken,
    canSendEdits: canEdit,
    enabled: !!board && !errorMsg,
    onRemotePagesSync: handleRemotePagesSync,
    onRemoteRevisionCommitted: handleRemoteRevisionCommitted,
  })

  const activeIndex = useMemo(
    () => Math.max(0, pages.findIndex((p) => p.page_uid === activePageUid)),
    [pages, activePageUid],
  )
  const activePage = useMemo(() => pages[activeIndex] || pages[0] || null, [pages, activeIndex])

  const markDirtyPages = useCallback(
    (nextPages: EduBoardPageItem[], nextActiveUid?: string) => {
      if (!canEdit || !board) return
      setPages(nextPages)
      setIsDirty(true)
      broadcastScenePatch(nextPages, nextActiveUid || activePageUid)
      if (user) {
        void saveRecoverySnapshot(
          {
            institutionId: board.institution_id,
            dataEnvironment: dataEnv,
            userId: user.id,
            boardId: board.id,
            teachingSessionId: board.teaching_session_id,
          },
          {
            revisionNo: board.latest_revision_no,
            title: board.title,
            pages: nextPages,
            dirty: true,
          },
        )
      }
    },
    [canEdit, board, broadcastScenePatch, activePageUid, user, dataEnv],
  )

  const handleSyncToServer = useCallback(
    async (saveType: 'autosave' | 'manual' = 'manual', forceOverwrite = false) => {
      if (!board || !canEdit) return
      setSyncStatus('saving')
      setSyncMessage(saveType === 'autosave' ? 'Autosaving...' : 'Saving...')
      try {
        const res = await eduboardApi.syncBoard(board.id, {
          expected_revision_no: forceOverwrite ? undefined : board.latest_revision_no,
          force_overwrite: forceOverwrite,
          save_type: saveType,
          replace_pages: true,
          client_id: clientId,
          popout_token: launchToken,
          pages: pages.map((pg, idx) => ({
            page_uid: pg.page_uid,
            page_order: idx + 1,
            title: pg.title,
            mode: pg.mode,
            background_style: pg.background_style,
            source_attachment_id: pg.source_attachment_id ?? null,
            source_page_number: pg.source_page_number ?? null,
            scene_json: typeof pg.scene_json === 'string' ? pg.scene_json : JSON.stringify(pg.scene_json),
            version: forceOverwrite ? undefined : pg.version,
          })),
        })
        const updated = res.data
        setBoard(updated)
        setPages([...(updated.pages || [])].sort((a, b) => a.page_order - b.page_order))
        setIsDirty(false)
        setSyncStatus('saved')
        setSyncMessage(`Saved rev #${updated.latest_revision_no}`)
        notifyCommittedRevision(updated)
        if (user) {
          void clearRecoverySnapshot({
            institutionId: updated.institution_id,
            dataEnvironment: dataEnv,
            userId: user.id,
            boardId: updated.id,
            teachingSessionId: updated.teaching_session_id,
          })
        }
      } catch (err: any) {
        if (err?.response?.status === 409) {
          setSyncStatus('conflict')
          setSyncMessage('Revision updated in another tab — click Sync Latest')
        } else {
          setSyncStatus('error')
          setSyncMessage(err?.response?.data?.detail || 'Save error')
        }
      }
    },
    [board, canEdit, clientId, launchToken, pages, notifyCommittedRevision, user, dataEnv],
  )

  useEffect(() => {
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
    }
    if (!canEdit || !isDirty || !board || syncStatus === 'conflict') return
    autosaveTimerRef.current = window.setTimeout(() => {
      void handleSyncToServer('autosave', false)
    }, 2500)
    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    }
  }, [canEdit, isDirty, board, syncStatus, handleSyncToServer])

  // Browser Fullscreen tracking
  useEffect(() => {
    const handleFsChange = () => {
      setIsNativeFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  const toggleBrowserFullscreen = async () => {
    try {
      if (!document.fullscreenElement && containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen()
      } else if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen()
      }
    } catch {
      // viewport already full-bleed
    }
  }

  const handleReturnToMainWorkspace = () => {
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.focus()
      } catch {
        // ignore cross-focus block
      }
    }
    navigate(board ? `/eduboard/${board.id}` : '/eduboard')
  }

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white text-sm">
        Connecting to PrathamOne EduBoard Live Window...
      </div>
    )
  }

  if (errorMsg || !board || !activePage) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl p-6 space-y-4 text-center shadow-2xl">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h1 className="text-base font-bold text-slate-900">Detached Board Session Unavailable</h1>
          <p className="text-xs text-slate-600">{errorMsg || 'Board could not be loaded.'}</p>
          <button
            type="button"
            onClick={() => navigate('/eduboard')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to EduBoard Workspace
          </button>
        </div>
      </div>
    )
  }

  const modeBadgeLabel =
    effectiveMode === 'presentation'
      ? 'Presentation Mode (Read-Only)'
      : effectiveMode === 'collaborator'
        ? 'Collaborator Mode'
        : 'Teacher Edit Mode'

  return (
    <div ref={containerRef} className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden">
      {/* Compact Top Control & Branding Strip */}
      <header className="px-3 py-2 bg-slate-900 border-b border-slate-800 text-white flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          {uiConfig.show_branding && (
            <span className="px-2 py-0.5 rounded bg-indigo-600/90 text-white font-bold text-[11px] shrink-0">
              {institutionName}
            </span>
          )}
          <span className="font-semibold truncate max-w-[260px]" title={board.title}>
            {board.title}
          </span>
          {uiConfig.show_branding && teacherName && (
            <span className="hidden md:inline text-slate-400">· {teacherName}</span>
          )}
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
              effectiveMode === 'presentation'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                : effectiveMode === 'collaborator'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  : 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
            }`}
          >
            {modeBadgeLabel}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Page Stepper */}
          <div className="inline-flex items-center gap-1 bg-slate-800 rounded-lg px-1.5 py-1 border border-slate-700">
            <button
              type="button"
              disabled={activeIndex <= 0}
              onClick={() => setActivePageUid(pages[activeIndex - 1]?.page_uid)}
              className="p-0.5 hover:bg-slate-700 rounded disabled:opacity-35"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] px-1">
              Page {activeIndex + 1}/{pages.length}
            </span>
            <button
              type="button"
              disabled={activeIndex >= pages.length - 1}
              onClick={() => setActivePageUid(pages[activeIndex + 1]?.page_uid)}
              className="p-0.5 hover:bg-slate-700 rounded disabled:opacity-35"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  const newUid = `pg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`
                  const nextPg: EduBoardPageItem = {
                    page_uid: newUid,
                    page_order: pages.length + 1,
                    title: `Page ${pages.length + 1}`,
                    mode: activePage.mode,
                    background_style: activePage.background_style,
                    scene_json: JSON.stringify({ schemaVersion: 1, elements: [] }),
                    version: 1,
                  }
                  const nextPages = [...pages, nextPg]
                  setActivePageUid(newUid)
                  markDirtyPages(nextPages, newUid)
                }}
                className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-[10px] font-semibold"
                title="Add Page"
              >
                <Plus className="w-3 h-3" /> Page
              </button>
            )}
          </div>

          {/* Live WebSocket Status Pill */}
          <span
            data-testid="detached-sync-status"
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border ${
              wsState === 'connected'
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700'
                : wsState === 'reconnecting' || wsState === 'connecting'
                  ? 'bg-amber-950/70 text-amber-300 border-amber-700'
                  : 'bg-rose-950/70 text-rose-300 border-rose-700'
            }`}
          >
            {wsState === 'connected' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{wsState === 'connected' ? 'Live Sync' : wsState}</span>
          </span>

          {syncMessage && <span className="text-[11px] text-slate-300 hidden sm:inline">{syncMessage}</span>}

          {syncStatus === 'conflict' && canEdit && (
            <button
              type="button"
              onClick={async () => {
                const latest = await eduboardApi.getBoard(board.id)
                handleRemoteRevisionCommitted(latest.data)
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-500"
            >
              <RefreshCw className="w-3 h-3" /> Sync Latest
            </button>
          )}

          {canEdit && (
            <button
              type="button"
              disabled={!isDirty && syncStatus !== 'saving'}
              onClick={() => void handleSyncToServer('manual', false)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-semibold disabled:opacity-40"
            >
              <Save className="w-3.5 h-3.5" />
              {syncStatus === 'saving' ? 'Saving...' : 'Save'}
            </button>
          )}

          <button
            type="button"
            onClick={() => void toggleBrowserFullscreen()}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            title={isNativeFullscreen ? 'Exit Browser Fullscreen' : 'Enter Browser Fullscreen'}
          >
            {isNativeFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleReturnToMainWorkspace}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-medium"
            title="Return to main EduBoard Workspace (never ends session)"
          >
            <ArrowLeft className="w-3 h-3" /> Main Workspace
          </button>

          <button
            type="button"
            onClick={() => window.close()}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-700 text-slate-300 hover:text-white border border-slate-700"
            title="Close Detached Window (session remains open)"
            aria-label="Close Detached Window"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Full-Area Board Stage */}
      <main className="flex-1 min-h-0 p-2 bg-slate-900">
        <EduBoardCanvas
          page={activePage}
          readOnly={!canEdit}
          readOnlyLabel={
            effectiveMode === 'presentation'
              ? 'Presentation / Projector View · Read-Only'
              : 'Read-Only Detached View'
          }
          hideToolbar={uiConfig.hide_toolbar || effectiveMode === 'presentation'}
          compactToolbar={uiConfig.compact_tools}
          fullscreenFill={true}
          pageIndex={activeIndex}
          totalPages={pages.length}
          onPrevPage={() => {
            if (activeIndex > 0) setActivePageUid(pages[activeIndex - 1].page_uid)
          }}
          onNextPage={() => {
            if (activeIndex < pages.length - 1) setActivePageUid(pages[activeIndex + 1].page_uid)
          }}
          onSceneChange={(scene: EduBoardScenePayload) => {
            if (!canEdit) return
            const nextPages = pages.map((p) =>
              p.page_uid === activePage.page_uid ? { ...p, scene_json: JSON.stringify(scene) } : p,
            )
            markDirtyPages(nextPages)
          }}
          onModeOrBackgroundChange={(nextMode: EduBoardMode, nextBg: EduBoardBackgroundStyle) => {
            if (!canEdit) return
            const nextPages = pages.map((p) =>
              p.page_uid === activePage.page_uid ? { ...p, mode: nextMode, background_style: nextBg } : p,
            )
            markDirtyPages(nextPages)
          }}
        />
      </main>
    </div>
  )
}

