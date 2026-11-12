/**
 * @file        useEduBoardSync.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.hooks
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
 * @description Real-time bidirectional synchronization hook combining backend WebSocket rooms and same-origin BroadcastChannel for zero-latency EduBoard main/detached multi-window collaboration and presence.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { eduboardApi } from '../api/endpoints'
import type { EduBoardDetailItem, EduBoardPageItem } from '../types'

export type EduBoardWsConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline'

export interface UseEduBoardSyncOptions {
  boardId: number | null
  institutionId: number
  dataEnvironment: string
  latestRevisionNo: number
  windowType: 'main' | 'detached'
  surface?: string
  explicitWsToken?: string | null
  canSendEdits: boolean
  enabled?: boolean
  onRemotePagesSync?: (pages: EduBoardPageItem[], activePageUid?: string, actorName?: string) => void
  onRemoteRevisionCommitted?: (board: EduBoardDetailItem) => void
}

function makeClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().slice(0, 12)
  }
  return `tab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

export function buildEduBoardWsUrl(
  boardId: number,
  params: {
    token: string
    clientId: string
    windowType: 'main' | 'detached'
    surface?: string
  },
): string {
  const proto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = typeof window !== 'undefined' ? window.location.host : 'localhost:5173'
  const qp = new URLSearchParams({
    token: params.token,
    client_id: params.clientId,
    window_type: params.windowType,
  })
  if (params.surface) qp.set('surface', params.surface)
  return `${proto}//${host}/api/v1/eduboard/ws/boards/${boardId}?${qp.toString()}`
}

export function useEduBoardSync(options: UseEduBoardSyncOptions) {
  const {
    boardId,
    institutionId,
    dataEnvironment,
    latestRevisionNo,
    windowType,
    surface,
    explicitWsToken,
    canSendEdits,
    enabled = true,
    onRemotePagesSync,
    onRemoteRevisionCommitted,
  } = options

  const clientIdRef = useRef<string>(makeClientId())
  const wsRef = useRef<WebSocket | null>(null)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)
  const heartbeatTimerRef = useRef<number | null>(null)
  const throttleTimerRef = useRef<number | null>(null)
  const pendingPatchRef = useRef<{ pages: EduBoardPageItem[]; activePageUid?: string; baseRev: number } | null>(null)
  const localDetachedPeersRef = useRef<Set<string>>(new Set())

  const onRemotePagesSyncRef = useRef(onRemotePagesSync)
  onRemotePagesSyncRef.current = onRemotePagesSync
  const onRemoteRevisionCommittedRef = useRef(onRemoteRevisionCommitted)
  onRemoteRevisionCommittedRef.current = onRemoteRevisionCommitted

  const [wsState, setWsState] = useState<EduBoardWsConnectionState>('idle')
  const [wsDetachedCount, setWsDetachedCount] = useState(0)
  const [localDetachedCount, setLocalDetachedCount] = useState(0)
  const [totalConnections, setTotalConnections] = useState(0)

  // BroadcastChannel setup (instantaneous same-browser tab/window sync + popup presence)
  useEffect(() => {
    if (!enabled || !boardId || typeof BroadcastChannel === 'undefined') {
      setLocalDetachedCount(0)
      localDetachedPeersRef.current.clear()
      return
    }
    const chName = `prathamone_eduboard_${dataEnvironment}_${institutionId}_${boardId}`
    const ch = new BroadcastChannel(chName)
    channelRef.current = ch

    const refreshLocalDetachedCount = () => {
      setLocalDetachedCount(localDetachedPeersRef.current.size)
    }

    ch.onmessage = (ev: MessageEvent) => {
      const msg = ev.data
      if (!msg || typeof msg !== 'object' || msg.clientId === clientIdRef.current) return

      if (msg.type === 'detached_hello') {
        localDetachedPeersRef.current.add(String(msg.clientId))
        refreshLocalDetachedCount()
        if (windowType === 'main') {
          ch.postMessage({ type: 'main_ack', clientId: clientIdRef.current })
        }
      } else if (msg.type === 'detached_bye') {
        localDetachedPeersRef.current.delete(String(msg.clientId))
        refreshLocalDetachedCount()
      } else if (msg.type === 'ping_detached' && windowType === 'detached') {
        ch.postMessage({ type: 'detached_hello', clientId: clientIdRef.current })
      } else if (msg.type === 'scene_patch' && Array.isArray(msg.pages)) {
        onRemotePagesSyncRef.current?.(msg.pages, msg.activePageUid, msg.actorName)
      } else if (msg.type === 'revision_committed' && msg.board) {
        onRemoteRevisionCommittedRef.current?.(msg.board as EduBoardDetailItem)
      }
    }

    if (windowType === 'detached') {
      ch.postMessage({ type: 'detached_hello', clientId: clientIdRef.current })
    } else {
      ch.postMessage({ type: 'ping_detached', clientId: clientIdRef.current })
    }

    const handleBeforeUnload = () => {
      if (windowType === 'detached') {
        try {
          ch.postMessage({ type: 'detached_bye', clientId: clientIdRef.current })
        } catch {
          // ignore
        }
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.close(1000, 'window_unloaded')
        } catch {
          // ignore
        }
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handleBeforeUnload)
      if (windowType === 'detached') {
        try {
          ch.postMessage({ type: 'detached_bye', clientId: clientIdRef.current })
        } catch {
          // ignore
        }
      }
      ch.close()
      channelRef.current = null
      localDetachedPeersRef.current.clear()
    }
  }, [enabled, boardId, institutionId, dataEnvironment, windowType])

  // Authenticated backend WebSocket room setup with auto-reconnect
  useEffect(() => {
    if (!enabled || !boardId || typeof WebSocket === 'undefined') {
      setWsState('idle')
      return
    }

    let cancelled = false
    let retryAttempt = 0

    const clearTimers = () => {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      if (heartbeatTimerRef.current) {
        window.clearInterval(heartbeatTimerRef.current)
        heartbeatTimerRef.current = null
      }
    }

    const connectWs = async () => {
      if (cancelled) return
      setWsState(retryAttempt === 0 ? 'connecting' : 'reconnecting')
      try {
        const wsToken =
          explicitWsToken ||
          (await eduboardApi.getWsTicket(boardId)).data.ws_token

        if (cancelled || !wsToken) return

        const url = buildEduBoardWsUrl(boardId, {
          token: wsToken,
          clientId: clientIdRef.current,
          windowType,
          surface,
        })
        const ws = new WebSocket(url)
        wsRef.current = ws

        ws.onopen = () => {
          if (cancelled) {
            ws.close()
            return
          }
          retryAttempt = 0
          setWsState('connected')
          heartbeatTimerRef.current = window.setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }))
            }
          }, 20000)
        }

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data)
            if (!msg || typeof msg !== 'object') return
            if (msg.type === 'presence') {
              setWsDetachedCount(Number(msg.detached_count || 0))
              setTotalConnections(Number(msg.total_connections || 0))
            } else if (msg.type === 'scene_sync' && msg.client_id !== clientIdRef.current) {
              if (Array.isArray(msg.pages)) {
                onRemotePagesSyncRef.current?.(msg.pages, msg.active_page_uid, msg.actor_name)
              }
            } else if (msg.type === 'revision_committed' && msg.client_id !== clientIdRef.current && msg.board) {
              onRemoteRevisionCommittedRef.current?.(msg.board as EduBoardDetailItem)
            }
          } catch {
            // ignore malformed socket frame
          }
        }

        ws.onerror = () => {
          // onclose handles reconnect
        }

        ws.onclose = () => {
          clearTimers()
          wsRef.current = null
          if (cancelled) return
          retryAttempt += 1
          const delay = Math.min(15000, 1200 * Math.pow(1.6, Math.min(retryAttempt, 5)))
          setWsState(navigator.onLine ? 'reconnecting' : 'offline')
          reconnectTimerRef.current = window.setTimeout(() => {
            void connectWs()
          }, delay)
        }
      } catch {
        if (cancelled) return
        retryAttempt += 1
        setWsState(navigator.onLine ? 'reconnecting' : 'offline')
        reconnectTimerRef.current = window.setTimeout(() => {
          void connectWs()
        }, Math.min(15000, 2000 * retryAttempt))
      }
    }

    void connectWs()

    return () => {
      cancelled = true
      clearTimers()
      if (wsRef.current) {
        try {
          wsRef.current.close()
        } catch {
          // ignore
        }
        wsRef.current = null
      }
    }
  }, [enabled, boardId, windowType, surface, explicitWsToken])

  const flushPendingPatch = useCallback(() => {
    const patch = pendingPatchRef.current
    pendingPatchRef.current = null
    if (!patch || !canSendEdits) return

    if (channelRef.current) {
      try {
        channelRef.current.postMessage({
          type: 'scene_patch',
          clientId: clientIdRef.current,
          pages: patch.pages,
          activePageUid: patch.activePageUid,
          baseRevisionNo: patch.baseRev,
        })
      } catch {
        // ignore channel serialization error
      }
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(
          JSON.stringify({
            type: 'scene_patch',
            pages: patch.pages,
            active_page_uid: patch.activePageUid,
            base_revision_no: patch.baseRev,
          }),
        )
      } catch {
        // ignore
      }
    }
  }, [canSendEdits])

  const broadcastScenePatch = useCallback(
    (pages: EduBoardPageItem[], activePageUid?: string) => {
      if (!canSendEdits || !boardId) return
      pendingPatchRef.current = { pages, activePageUid, baseRev: latestRevisionNo }
      if (throttleTimerRef.current) return
      throttleTimerRef.current = window.setTimeout(() => {
        throttleTimerRef.current = null
        flushPendingPatch()
      }, 65)
    },
    [canSendEdits, boardId, latestRevisionNo, flushPendingPatch],
  )

  const notifyCommittedRevision = useCallback((board: EduBoardDetailItem) => {
    if (channelRef.current) {
      try {
        channelRef.current.postMessage({
          type: 'revision_committed',
          clientId: clientIdRef.current,
          board,
        })
      } catch {
        // ignore
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      if (throttleTimerRef.current) {
        window.clearTimeout(throttleTimerRef.current)
      }
    }
  }, [])

  return {
    clientId: clientIdRef.current,
    wsState,
    detachedWindowCount: Math.max(wsDetachedCount, localDetachedCount),
    totalConnections,
    broadcastScenePatch,
    notifyCommittedRevision,
  }
}

