/**
 * @file        EduBoardPopoutMenu.tsx
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
 * @description Pop-Out launcher dropdown component offering scoped Teacher Edit, Presentation Read-Only, and Collaborator detached windows across Greenboard, Blackboard, Whiteboard, and Projector layouts with popup-blocker fallback.
 */

import React, { useEffect, useState } from 'react'
import {
  ChevronDown,
  ExternalLink,
  Eye,
  LayoutGrid,
  Monitor,
  MonitorPlay,
  PenTool,
  Users,
} from 'lucide-react'
import { eduboardApi } from '../../api/endpoints'
import type { EduBoardBackgroundStyle, EduBoardPopoutMode } from '../../types'

export interface EduBoardPopoutMenuProps {
  boardId: number
  canEdit: boolean
  canCollaborate: boolean
  allowCollaboratorPolicy: boolean
  allowPopoutPolicy: boolean
  collaborationEnabled: boolean
  onLaunchBlockedFallback: (url: string, label: string) => void
  onError: (msg: string) => void
  onLaunched?: (mode: EduBoardPopoutMode) => void
}

export default function EduBoardPopoutMenu({
  boardId,
  canEdit,
  canCollaborate,
  allowCollaboratorPolicy,
  allowPopoutPolicy,
  collaborationEnabled,
  onLaunchBlockedFallback,
  onError,
  onLaunched,
}: EduBoardPopoutMenuProps) {
  const [open, setOpen] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [selectedMode, setSelectedMode] = useState<EduBoardPopoutMode>(
    canEdit ? 'teacher_edit' : 'presentation',
  )
  const [showBranding, setShowBranding] = useState(true)

  useEffect(() => {
    setSelectedMode((prev) => {
      if (canEdit && prev === 'presentation') return 'teacher_edit'
      if (!canEdit && prev !== 'presentation') return 'presentation'
      return prev
    })
  }, [canEdit])

  const handleLaunch = async (opts: {
    label: string
    launchMode?: EduBoardPopoutMode
    surface?: EduBoardBackgroundStyle
    compactTools?: boolean
    hideToolbar?: boolean
  }) => {
    setLaunching(true)
    try {
      const mode = opts.launchMode || selectedMode
      const res = await eduboardApi.createPopoutSession(boardId, {
        launch_mode: mode,
        surface: opts.surface,
        compact_tools: opts.compactTools ?? true,
        show_branding: showBranding,
        hide_toolbar: opts.hideToolbar ?? mode === 'presentation',
      })
      const targetUrl = res.data.launch_url
      setOpen(false)
      onLaunched?.(mode)

      const win = window.open(targetUrl, '_blank', 'noopener,width=1360,height=840')
      if (!win) {
        onLaunchBlockedFallback(targetUrl, opts.label)
      }
    } catch (err: any) {
      onError(err?.response?.data?.detail || 'Could not launch detached EduBoard window.')
    } finally {
      setLaunching(false)
    }
  }

  if (!allowPopoutPolicy) {
    return null
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={launching}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
        title="Pop out EduBoard into a dedicated live-synced window or projector tab"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        <span>Pop Out</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-40 w-80 bg-white border border-slate-200 rounded-xl shadow-xl p-3 space-y-2.5 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Detached Board Launcher
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-700 font-semibold"
            >
              Close
            </button>
          </div>

          {/* Scoped Window Permission Mode */}
          <div>
            <p className="text-[11px] font-semibold text-slate-600 mb-1">Detached Window Permission</p>
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => setSelectedMode('teacher_edit')}
                className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1 disabled:opacity-40 ${
                  selectedMode === 'teacher_edit'
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <PenTool className="w-3 h-3" /> Edit
              </button>
              <button
                type="button"
                onClick={() => setSelectedMode('presentation')}
                className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1 ${
                  selectedMode === 'presentation'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <Eye className="w-3 h-3" /> Present
              </button>
              <button
                type="button"
                disabled={!canCollaborate || !allowCollaboratorPolicy || (!collaborationEnabled && !canEdit)}
                onClick={() => setSelectedMode('collaborator')}
                title={
                  !allowCollaboratorPolicy
                    ? 'Disabled by institution policy'
                    : 'Shared live collaboration session'
                }
                className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1 disabled:opacity-40 ${
                  selectedMode === 'collaborator'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <Users className="w-3 h-3" /> Collab
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-[11px] text-slate-600">
            <input
              type="checkbox"
              checked={showBranding}
              onChange={(e) => setShowBranding(e.target.checked)}
            />
            Show teacher name &amp; institution header
          </label>

          {/* Six explicit Pop-Out Actions */}
          <div className="space-y-1 pt-1 border-t border-slate-100">
            <button
              type="button"
              disabled={launching}
              onClick={() => void handleLaunch({ label: 'Pop Out Current Board' })}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left font-medium text-slate-800 hover:bg-slate-50 border border-transparent hover:border-slate-200"
            >
              <ExternalLink className="w-3.5 h-3.5 text-primary-600 shrink-0" />
              <span>Pop Out Current Board</span>
            </button>

            <button
              type="button"
              disabled={launching}
              onClick={() =>
                void handleLaunch({
                  label: 'Open Greenboard in New Tab',
                  surface: 'greenboard',
                  compactTools: true,
                })
              }
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left font-medium text-emerald-900 bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200"
            >
              <Monitor className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>Open Greenboard in New Tab</span>
            </button>

            <button
              type="button"
              disabled={launching}
              onClick={() =>
                void handleLaunch({
                  label: 'Open Blackboard in New Tab',
                  surface: 'blackboard',
                  compactTools: true,
                })
              }
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300"
            >
              <Monitor className="w-3.5 h-3.5 text-slate-800 shrink-0" />
              <span>Open Blackboard in New Tab</span>
            </button>

            <button
              type="button"
              disabled={launching}
              onClick={() =>
                void handleLaunch({
                  label: 'Open Whiteboard in New Tab',
                  surface: 'white',
                  compactTools: true,
                })
              }
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left font-medium text-slate-800 hover:bg-slate-50 border border-slate-200"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>Open Whiteboard in New Tab</span>
            </button>

            <button
              type="button"
              disabled={launching}
              onClick={() =>
                void handleLaunch({
                  label: 'Open Presentation / Projector View',
                  launchMode: 'presentation',
                  compactTools: false,
                  hideToolbar: true,
                })
              }
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left font-medium text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200"
            >
              <MonitorPlay className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>Open Presentation / Projector View</span>
            </button>

            <button
              type="button"
              disabled={launching}
              onClick={() =>
                void handleLaunch({
                  label: 'Open Detached Teaching Board with Compact Tools',
                  compactTools: true,
                  hideToolbar: false,
                })
              }
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left font-medium text-indigo-800 bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-200"
            >
              <PenTool className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>Open Detached Teaching Board with Compact Tools</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

