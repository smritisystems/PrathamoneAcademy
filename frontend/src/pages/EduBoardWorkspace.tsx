/**
 * @file        EduBoardWorkspace.tsx
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
 * @description Main interactive PrathamOne EduBoard workspace for Classic Chalk/Greenboard, Digital Whiteboard, and PDF Presentation teaching, with View-First governance, scoped IndexedDB crash recovery, debounced revision sync, conflict resolution, templates, and PDF export.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Presentation,
  Plus,
  Save,
  Send,
  FileDown,
  FileUp,
  History,
  Settings,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Maximize2,
  Minimize2,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BookOpen,
  Layers,
  RotateCcw,
} from 'lucide-react'
import { eduboardApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { useEnvironmentStore } from '../store/environmentStore'
import { EditModeBar, DeleteConfirmationModal, ContextualHelpButton } from '../components/common'
import Modal from '../components/Modal'
import EduBoardCanvas, { parseSceneJson } from '../components/eduboard/EduBoardCanvas'
import {
  clearRecoverySnapshot,
  loadRecoverySnapshot,
  saveRecoverySnapshot,
  type EduBoardRecoveryRecord,
} from '../utils/eduboardRecovery'
import type {
  EduBoardBackgroundStyle,
  EduBoardDetailItem,
  EduBoardMode,
  EduBoardPageItem,
  EduBoardScenePayload,
  EduBoardSummaryItem,
} from '../types'

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function EduBoardWorkspace() {
  const { boardId: routeBoardId } = useParams<{ boardId?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { user } = useAuthStore()
  const dataEnv = useEnvironmentStore((s) => s.dataEnvironment || 'PRODUCTION')

  const editScope = 'eduboard:workspace'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])
  const setScopeDirty = useEditModeStore((s) => s.setDirty)
  const disableEditMode = useEditModeStore((s) => s.disableEditMode)

  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(() => {
    if (routeBoardId && !Number.isNaN(Number(routeBoardId))) return Number(routeBoardId)
    const qId = searchParams.get('board_id')
    return qId && !Number.isNaN(Number(qId)) ? Number(qId) : null
  })

  // Active editable copy of board state
  const [localBoard, setLocalBoard] = useState<EduBoardDetailItem | null>(null)
  const [localPages, setLocalPages] = useState<EduBoardPageItem[]>([])
  const [activePageUid, setActivePageUid] = useState<string>('')
  const [isDirty, setIsDirty] = useState<boolean>(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'conflict' | 'error'>('idle')
  const [syncMessage, setSyncMessage] = useState<string>('')
  const [recoveryCandidate, setRecoveryCandidate] = useState<EduBoardRecoveryRecord | null>(null)
  const [conflictInfo, setConflictInfo] = useState<{ latestRevisionNo: number; message: string } | null>(null)

  // UI Drawers & Modals
  const [boardSearch, setBoardSearch] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false)
  const [showRevisionsModal, setShowRevisionsModal] = useState<boolean>(false)
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false)
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [uploadingDoc, setUploadingDoc] = useState<boolean>(false)
  const [actionBanner, setActionBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const docInputRef = useRef<HTMLInputElement | null>(null)
  const autosaveTimerRef = useRef<number | null>(null)

  // Create form state
  const [newTitle, setNewTitle] = useState<string>('')
  const [newTopic, setNewTopic] = useState<string>('')
  const [newMode, setNewMode] = useState<EduBoardMode>('whiteboard')
  const [newDivisionId, setNewDivisionId] = useState<string>('')
  const [newSubjectId, setNewSubjectId] = useState<string>('')
  const [newSessionId, setNewSessionId] = useState<string>('')
  const [newTemplateId, setNewTemplateId] = useState<string>('')
  const [newIsTemplate, setNewIsTemplate] = useState<boolean>(false)

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    max_file_size_mb: 25,
    autosave_interval_ms: 3500,
    default_board_mode: 'whiteboard' as EduBoardMode,
    notify_students_on_publish: true,
  })

  const { data: contextData } = useQuery({
    queryKey: ['eduboard-context', dataEnv],
    queryFn: async () => (await eduboardApi.getContext()).data,
  })

  const { data: settingsData, refetch: refetchSettings } = useQuery({
    queryKey: ['eduboard-settings', dataEnv],
    queryFn: async () => (await eduboardApi.getSettings()).data,
  })

  const { data: boardsData, refetch: refetchBoards, isLoading: loadingList } = useQuery({
    queryKey: ['eduboard-boards', dataEnv, boardSearch, statusFilter],
    queryFn: async () =>
      (
        await eduboardApi.listBoards({
          search: boardSearch.trim() || undefined,
          status: statusFilter || undefined,
        })
      ).data,
  })

  const { data: fetchedBoardDetail, refetch: refetchBoardDetail } = useQuery({
    queryKey: ['eduboard-detail', selectedBoardId, dataEnv],
    queryFn: async () => (await eduboardApi.getBoard(selectedBoardId!)).data,
    enabled: !!selectedBoardId,
  })

  const { data: revisionsData, refetch: refetchRevisions } = useQuery({
    queryKey: ['eduboard-revisions', selectedBoardId, dataEnv],
    queryFn: async () => (await eduboardApi.getRevisions(selectedBoardId!)).data,
    enabled: !!selectedBoardId && showRevisionsModal,
  })

  useEffect(() => {
    if (settingsData) {
      setSettingsForm({
        max_file_size_mb: settingsData.max_file_size_mb ?? 25,
        autosave_interval_ms: settingsData.autosave_interval_ms ?? 3500,
        default_board_mode: (settingsData.default_board_mode as EduBoardMode) || 'whiteboard',
        notify_students_on_publish: settingsData.notify_students_on_publish ?? true,
      })
    }
  }, [settingsData])

  // Deep-link launch from TeachingSession / TeacherManagement
  useEffect(() => {
    const qSession = searchParams.get('session_id')
    const qDiv = searchParams.get('division_id')
    const qSubj = searchParams.get('subject_id')
    const qTopic = searchParams.get('topic')
    if (qSession && !selectedBoardId && boardsData?.items) {
      const existing = boardsData.items.find((b) => String(b.teaching_session_id) === qSession)
      if (existing) {
        setSelectedBoardId(existing.id)
      } else {
        setNewSessionId(qSession)
        if (qDiv) setNewDivisionId(qDiv)
        if (qSubj) setNewSubjectId(qSubj)
        if (qTopic) {
          setNewTitle(qTopic)
          setNewTopic(qTopic)
        }
        setShowCreateModal(true)
      }
    } else if (!selectedBoardId && boardsData?.items?.length && !qSession) {
      setSelectedBoardId(boardsData.items[0].id)
    }
  }, [searchParams, boardsData, selectedBoardId])

  // Sync fetched board into local workspace & check scoped IndexedDB crash recovery
  useEffect(() => {
    if (!fetchedBoardDetail) {
      setLocalBoard(null)
      setLocalPages([])
      return
    }
    setLocalBoard(fetchedBoardDetail)
    const sortedPages = [...(fetchedBoardDetail.pages || [])].sort((a, b) => a.page_order - b.page_order)
    setLocalPages(sortedPages)
    setActivePageUid((prev) =>
      sortedPages.some((p) => p.page_uid === prev) ? prev : sortedPages[0]?.page_uid || '',
    )
    setIsDirty(false)
    setScopeDirty(editScope, false)
    setSyncStatus('idle')

    if (user) {
      void loadRecoverySnapshot({
        institutionId: user.institution_id || 1,
        dataEnvironment: dataEnv,
        userId: user.id,
        boardId: fetchedBoardDetail.id,
        teachingSessionId: fetchedBoardDetail.teaching_session_id,
      }).then((rec) => {
        if (rec && rec.dirty && rec.pages?.length) {
          setRecoveryCandidate(rec)
        } else {
          setRecoveryCandidate(null)
        }
      })
    }
  }, [fetchedBoardDetail, user, dataEnv, setScopeDirty])

  // Unsaved warning on browser tab close/refresh
  useEffect(() => {
    if (!isDirty) return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  // Sync active page object
  const activePage = useMemo(
    () => localPages.find((p) => p.page_uid === activePageUid) || localPages[0] || null,
    [localPages, activePageUid],
  )

  const persistRecoveryDraft = useCallback(
    (nextPages: EduBoardPageItem[], dirtyFlag: boolean) => {
      if (!user || !localBoard) return
      void saveRecoverySnapshot(
        {
          institutionId: user.institution_id || 1,
          dataEnvironment: dataEnv,
          userId: user.id,
          boardId: localBoard.id,
          teachingSessionId: localBoard.teaching_session_id,
        },
        {
          revisionNo: localBoard.latest_revision_no,
          title: localBoard.title,
          pages: nextPages,
          dirty: dirtyFlag,
        },
      )
    },
    [user, localBoard, dataEnv],
  )

  const markDirtyPages = useCallback(
    (nextPages: EduBoardPageItem[]) => {
      setLocalPages(nextPages)
      setIsDirty(true)
      setScopeDirty(editScope, true)
      persistRecoveryDraft(nextPages, true)
    },
    [setScopeDirty, persistRecoveryDraft],
  )

  const handleSyncToServer = useCallback(
    async (saveType: 'autosave' | 'manual' = 'manual', forceOverwrite = false) => {
      if (!localBoard || !isEditMode) return
      setSyncStatus('saving')
      setSyncMessage(saveType === 'autosave' ? 'Autosaving...' : 'Saving revision...')
      try {
        const res = await eduboardApi.syncBoard(localBoard.id, {
          title: localBoard.title,
          topic: localBoard.topic || undefined,
          board_mode_default: localBoard.board_mode_default,
          is_template: localBoard.is_template,
          expected_revision_no: forceOverwrite ? undefined : localBoard.latest_revision_no,
          force_overwrite: forceOverwrite,
          save_type: saveType,
          note: saveType === 'manual' ? 'Manual classroom save' : undefined,
          replace_pages: true,
          pages: localPages.map((pg, idx) => ({
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
        setLocalBoard(updated)
        setLocalPages([...(updated.pages || [])].sort((a, b) => a.page_order - b.page_order))
        setIsDirty(false)
        setScopeDirty(editScope, false)
        setConflictInfo(null)
        setRecoveryCandidate(null)
        setSyncStatus('saved')
        setSyncMessage(`Saved rev #${updated.latest_revision_no}`)
        if (user) {
          void clearRecoverySnapshot({
            institutionId: user.institution_id || 1,
            dataEnvironment: dataEnv,
            userId: user.id,
            boardId: updated.id,
            teachingSessionId: updated.teaching_session_id,
          })
        }
        void queryClient.invalidateQueries({ queryKey: ['eduboard-boards'] })
      } catch (err: any) {
        if (err?.response?.status === 409) {
          const detail = err.response.data?.detail || {}
          setSyncStatus('conflict')
          setSyncMessage('Revision conflict detected')
          setConflictInfo({
            latestRevisionNo: detail.latest_revision_no || localBoard.latest_revision_no,
            message: detail.message || 'This board was modified in another session.',
          })
        } else {
          setSyncStatus('error')
          setSyncMessage(err?.response?.data?.detail || 'Save failed (local draft preserved)')
        }
      }
    },
    [localBoard, localPages, isEditMode, setScopeDirty, user, dataEnv, queryClient],
  )

  // Debounced autosave while dirty in Edit Mode
  useEffect(() => {
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
    }
    if (!isEditMode || !isDirty || !localBoard || syncStatus === 'conflict') return
    const delay = Math.max(1500, settingsForm.autosave_interval_ms || 3500)
    autosaveTimerRef.current = window.setTimeout(() => {
      void handleSyncToServer('autosave', false)
    }, delay)
    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    }
  }, [isEditMode, isDirty, localBoard, syncStatus, settingsForm.autosave_interval_ms, handleSyncToServer])

  const handleSceneChange = (scene: EduBoardScenePayload) => {
    if (!isEditMode || !activePage) return
    const nextPages = localPages.map((p) =>
      p.page_uid === activePage.page_uid ? { ...p, scene_json: JSON.stringify(scene) } : p,
    )
    markDirtyPages(nextPages)
  }

  const handleModeBgChange = (nextMode: EduBoardMode, nextBg: EduBoardBackgroundStyle) => {
    if (!isEditMode || !activePage) return
    const nextPages = localPages.map((p) =>
      p.page_uid === activePage.page_uid ? { ...p, mode: nextMode, background_style: nextBg } : p,
    )
    markDirtyPages(nextPages)
  }

  const handleAddPage = () => {
    if (!isEditMode || !localBoard) return
    const newUid = `pg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`
    const mode = localBoard.board_mode_default || 'whiteboard'
    const bg: EduBoardBackgroundStyle = mode === 'classic' ? 'blackboard' : 'white'
    const nextPg: EduBoardPageItem = {
      page_uid: newUid,
      page_order: localPages.length + 1,
      title: `Page ${localPages.length + 1}`,
      mode,
      background_style: bg,
      scene_json: JSON.stringify({ schemaVersion: 1, elements: [] }),
      version: 1,
    }
    const nextPages = [...localPages, nextPg]
    markDirtyPages(nextPages)
    setActivePageUid(newUid)
  }

  const handleDuplicatePage = () => {
    if (!isEditMode || !activePage) return
    const newUid = `pg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`
    const copyPg: EduBoardPageItem = {
      ...activePage,
      id: undefined,
      page_uid: newUid,
      page_order: localPages.length + 1,
      title: `${activePage.title} (Copy)`,
      version: 1,
    }
    const nextPages = [...localPages, copyPg]
    markDirtyPages(nextPages)
    setActivePageUid(newUid)
  }

  const handleMovePage = (uid: string, delta: -1 | 1) => {
    if (!isEditMode) return
    const idx = localPages.findIndex((p) => p.page_uid === uid)
    const target = idx + delta
    if (idx < 0 || target < 0 || target >= localPages.length) return
    const reordered = [...localPages]
    const [item] = reordered.splice(idx, 1)
    reordered.splice(target, 0, item)
    markDirtyPages(reordered.map((p, i) => ({ ...p, page_order: i + 1 })))
  }

  const handleDeletePage = (uid: string) => {
    if (!isEditMode || localPages.length <= 1) return
    const remaining = localPages.filter((p) => p.page_uid !== uid).map((p, i) => ({ ...p, page_order: i + 1 }))
    markDirtyPages(remaining)
    if (activePageUid === uid) {
      setActivePageUid(remaining[0]?.page_uid || '')
    }
  }

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    try {
      const selectedDiv = contextData?.divisions.find((d) => String(d.id) === newDivisionId)
      const res = await eduboardApi.createBoard({
        title: newTitle.trim(),
        topic: newTopic.trim() || undefined,
        division_id: newDivisionId ? Number(newDivisionId) : undefined,
        standard_id: selectedDiv?.standard_id,
        subject_id: newSubjectId ? Number(newSubjectId) : undefined,
        teaching_session_id: newSessionId ? Number(newSessionId) : undefined,
        from_template_id: newTemplateId ? Number(newTemplateId) : undefined,
        board_mode_default: newMode,
        is_template: newIsTemplate,
      })
      setShowCreateModal(false)
      setNewTitle('')
      setNewTopic('')
      setNewTemplateId('')
      setNewIsTemplate(false)
      setSelectedBoardId(res.data.id)
      setSearchParams({})
      await refetchBoards()
      setActionBanner({ type: 'success', text: `Created EduBoard "${res.data.title}". Enable Edit Mode to draw.` })
    } catch (err: any) {
      setActionBanner({ type: 'error', text: err?.response?.data?.detail || 'Failed to create board.' })
    }
  }

  const handleUploadDocument = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    const file = evt.target.files?.[0]
    evt.target.value = ''
    if (!file || !localBoard || !isEditMode) return
    setUploadingDoc(true)
    setActionBanner(null)
    try {
      const res = await eduboardApi.uploadAttachment(localBoard.id, file, {
        attachment_role: 'source_document',
        create_slides: true,
      })
      await refetchBoardDetail()
      setActionBanner({
        type: 'success',
        text: `Imported "${res.data.original_filename}" (${res.data.created_pages_count} page(s) added).`,
      })
    } catch (err: any) {
      setActionBanner({ type: 'error', text: err?.response?.data?.detail || 'Document import failed.' })
    } finally {
      setUploadingDoc(false)
    }
  }

  const handleInlineImageUpload = async (file: File) => {
    if (!localBoard || !isEditMode) return null
    try {
      const res = await eduboardApi.uploadAttachment(localBoard.id, file, {
        attachment_role: 'inline_image',
        create_slides: false,
      })
      return { attachmentId: res.data.id, url: `/api/v1/eduboard/attachments/${res.data.id}/download` }
    } catch (err: any) {
      setActionBanner({ type: 'error', text: err?.response?.data?.detail || 'Image upload failed.' })
      return null
    }
  }

  const handlePublishBoard = async () => {
    if (!localBoard || !isEditMode) return
    if (isDirty) {
      await handleSyncToServer('manual', false)
    }
    try {
      const res = await eduboardApi.publishBoard(localBoard.id)
      setLocalBoard(res.data.board)
      await refetchBoards()
      setActionBanner({
        type: 'success',
        text: `Board published to Student Portal (${res.data.notified_students} student notification(s) logged).`,
      })
    } catch (err: any) {
      setActionBanner({ type: 'error', text: err?.response?.data?.detail || 'Failed to publish board.' })
    }
  }

  const handleExportPdf = async () => {
    if (!localBoard) return
    try {
      if (isEditMode && isDirty) {
        await handleSyncToServer('manual', false)
      }
      const res = await eduboardApi.exportBoardPdfBlob(localBoard.id)
      triggerBlobDownload(res.data, `${localBoard.board_code}_annotated.pdf`)
      setActionBanner({ type: 'success', text: 'Annotated lecture PDF exported cleanly.' })
    } catch (err: any) {
      setActionBanner({ type: 'error', text: err?.response?.data?.detail || 'PDF export failed.' })
    }
  }

  const handleRestoreRevision = async (revId: number) => {
    if (!localBoard || !isEditMode) return
    try {
      const res = await eduboardApi.restoreRevision(localBoard.id, revId)
      setLocalBoard(res.data)
      setLocalPages([...(res.data.pages || [])].sort((a, b) => a.page_order - b.page_order))
      setIsDirty(false)
      setScopeDirty(editScope, false)
      setShowRevisionsModal(false)
      setActionBanner({ type: 'success', text: `Restored revision cleanly (now rev #${res.data.latest_revision_no}).` })
    } catch (err: any) {
      setActionBanner({ type: 'error', text: err?.response?.data?.detail || 'Restore failed.' })
    }
  }

  const handleDeleteBoard = async () => {
    if (!localBoard) return
    try {
      await eduboardApi.deleteBoard(localBoard.id)
      setShowDeleteModal(false)
      setSelectedBoardId(null)
      setLocalBoard(null)
      disableEditMode(editScope)
      await refetchBoards()
      setActionBanner({ type: 'success', text: 'EduBoard moved to archive/deleted cleanly.' })
    } catch (err: any) {
      setActionBanner({ type: 'error', text: err?.response?.data?.detail || 'Delete failed.' })
    }
  }

  const isAdmin = ['superadmin', 'sysadmin', 'super_admin', 'admin', 'principal'].includes(
    (user?.role || '').toLowerCase(),
  )

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-slate-50 p-4 overflow-y-auto' : 'space-y-4 pb-10'}`}>
      {/* ── Rule 010 Global View-First Edit Mode Governance Bar ── */}
      <EditModeBar
        scope={editScope}
        title="PrathamOne EduBoard Classroom Workspace"
        requiredPermission="eduboard:edit"
        isDirty={isDirty}
        onSave={() => void handleSyncToServer('manual', false)}
        saveLoading={syncStatus === 'saving'}
      />

      {/* ── Workspace Top Bar ── */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
            <Presentation className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">
                {localBoard ? localBoard.title : 'PrathamOne EduBoard'}
              </h1>
              {localBoard && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                    localBoard.status === 'published'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {localBoard.status}
                </span>
              )}
              {localBoard && (
                <span className="text-[11px] text-slate-400 font-mono">
                  {localBoard.board_code} · Rev #{localBoard.latest_revision_no}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {localBoard
                ? `${localBoard.division_name || 'Batch N/A'} · ${localBoard.subject_name || 'Subject N/A'}${
                    localBoard.session_code ? ` · Session ${localBoard.session_code}` : ''
                  }`
                : 'Select an existing classroom lecture board or create a new teaching session board.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {syncStatus !== 'idle' && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                syncStatus === 'saving'
                  ? 'bg-sky-50 text-sky-700'
                  : syncStatus === 'saved'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700'
              }`}
            >
              {syncStatus === 'saved' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              {syncMessage}
            </span>
          )}

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700"
          >
            <Plus className="w-3.5 h-3.5" /> New Board
          </button>

          {localBoard && (
            <>
              <input
                ref={docInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={handleUploadDocument}
              />
              <button
                type="button"
                disabled={!isEditMode || uploadingDoc}
                onClick={() => docInputRef.current?.click()}
                title="Import PDF slides or image (PPT/PPTX requires PDF export before import)"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <FileUp className="w-3.5 h-3.5" /> {uploadingDoc ? 'Importing...' : 'Import PDF / Image'}
              </button>

              <button
                type="button"
                disabled={!isEditMode || syncStatus === 'saving'}
                onClick={() => void handleSyncToServer('manual', false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" /> Save
              </button>

              <button
                type="button"
                disabled={!isEditMode}
                onClick={() => void handlePublishBoard()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" /> Publish
              </button>

              <button
                type="button"
                onClick={() => void handleExportPdf()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              >
                <FileDown className="w-3.5 h-3.5" /> Export PDF
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowRevisionsModal(true)
                  void refetchRevisions()
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                title="Revision History"
              >
                <History className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreen((f) => !f)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Classroom Mode'}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              {isEditMode && localBoard.status !== 'published' && (
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-rose-200 text-rose-600 hover:bg-rose-50"
                  title="Delete draft board"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              title="EduBoard Admin Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
          <ContextualHelpButton moduleKey="eduboard" />
        </div>
      </div>

      {/* ── Banners: Action Result, Scoped IndexedDB Crash Recovery ── */}
      {actionBanner && (
        <div
          className={`px-4 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
            actionBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{actionBanner.text}</span>
          <button type="button" onClick={() => setActionBanner(null)} className="underline ml-3">
            Dismiss
          </button>
        </div>
      )}

      {recoveryCandidate && localBoard && (
        <div className="px-4 py-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Unsaved local classroom draft recovered</strong> from{' '}
              {new Date(recoveryCandidate.savedAt).toLocaleString()} ({recoveryCandidate.pages.length} page(s)).
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setLocalPages(recoveryCandidate.pages)
                setActivePageUid(recoveryCandidate.pages[0]?.page_uid || '')
                setIsDirty(true)
                setScopeDirty(editScope, true)
                setRecoveryCandidate(null)
              }}
              className="px-3 py-1 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700"
            >
              Restore Local Work
            </button>
            <button
              type="button"
              onClick={() => {
                if (user) {
                  void clearRecoverySnapshot({
                    institutionId: user.institution_id || 1,
                    dataEnvironment: dataEnv,
                    userId: user.id,
                    boardId: localBoard.id,
                    teachingSessionId: localBoard.teaching_session_id,
                  })
                }
                setRecoveryCandidate(null)
              }}
              className="px-3 py-1 rounded-lg border border-amber-300 text-xs font-medium hover:bg-amber-100"
            >
              Discard Draft
            </button>
          </div>
        </div>
      )}

      {/* ── Main Split Workspace: Left Board & Page Sidebar + Right Canvas Stage ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Sidebar: Saved Boards History + Multi-Page Slide Strip */}
        <div className={`${isFullscreen ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}>
          {/* Page Strip */}
          {localBoard && (
            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  Pages ({localPages.length})
                </h2>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={!isEditMode}
                    onClick={handleDuplicatePage}
                    title="Duplicate active page"
                    className="p-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                  <button
                    type="button"
                    disabled={!isEditMode}
                    onClick={handleAddPage}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-700 disabled:opacity-40"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {localPages.map((pg, idx) => {
                  const elemCount = parseSceneJson(pg.scene_json).elements.length
                  const isActive = pg.page_uid === activePage?.page_uid
                  return (
                    <div
                      key={pg.page_uid}
                      onClick={() => setActivePageUid(pg.page_uid)}
                      className={`p-2 rounded-lg border cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                        isActive
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-900'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">
                          {idx + 1}. {pg.title}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {pg.mode} · {elemCount} item(s)
                        </p>
                      </div>
                      {isEditMode && (
                        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMovePage(pg.page_uid, -1)}
                            className="p-0.5 hover:bg-white rounded disabled:opacity-30"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === localPages.length - 1}
                            onClick={() => handleMovePage(pg.page_uid, 1)}
                            className="p-0.5 hover:bg-white rounded disabled:opacity-30"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          {localPages.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeletePage(pg.page_uid)}
                              className="p-0.5 text-rose-600 hover:bg-white rounded"
                              title="Delete Page"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Previous Boards & Lecture Library */}
          {!isFullscreen && (
            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 shadow-2xs">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-primary-600" />
                Saved Lecture Boards
              </h2>

              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={boardSearch}
                    onChange={(e) => setBoardSearch(e.target.value)}
                    placeholder="Search boards..."
                    className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1"
                >
                  <option value="">All</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>

              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {loadingList ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Loading boards...</p>
                ) : !boardsData?.items?.length ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No boards match filters.</p>
                ) : (
                  boardsData.items.map((item: EduBoardSummaryItem) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedBoardId(item.id)
                        navigate(`/eduboard/${item.id}`, { replace: true })
                      }}
                      className={`w-full text-left p-2.5 rounded-lg border transition-colors ${
                        selectedBoardId === item.id
                          ? 'bg-primary-50 border-primary-300'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-slate-900 truncate">{item.title}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            item.status === 'published'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {item.division_name || 'Unscoped'} · {item.subject_name || 'General'} · {item.page_count}p
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Primary Canvas Area */}
        <div className={isFullscreen ? 'lg:col-span-10' : 'lg:col-span-9'}>
          {localBoard && activePage ? (
            <EduBoardCanvas
              page={activePage}
              readOnly={!isEditMode}
              onSceneChange={handleSceneChange}
              onModeOrBackgroundChange={handleModeBgChange}
              onUploadInlineImage={isEditMode ? handleInlineImageUpload : undefined}
            />
          ) : (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center space-y-3">
              <Presentation className="w-10 h-10 text-indigo-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">Ready to Teach with PrathamOne EduBoard</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Create a classroom board linked to your Teaching Session &amp; Batch, draw in Classic Chalkboard or
                Digital Whiteboard mode, or import PDF slides for live annotation.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700"
              >
                <Plus className="w-4 h-4" /> Create Classroom Board
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Create New EduBoard Modal ── */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Classroom EduBoard">
        <form onSubmit={handleCreateBoard} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Lecture Title *</label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Quadratic Equations — Lecture 4"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Batch / Division</label>
              <select
                value={newDivisionId}
                onChange={(e) => setNewDivisionId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              >
                <option value="">Select Batch</option>
                {contextData?.divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.standard_name ? `${d.standard_name} — ` : ''}{d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
              <select
                value={newSubjectId}
                onChange={(e) => setNewSubjectId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              >
                <option value="">Select Subject</option>
                {contextData?.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Teaching Session (Optional)</label>
              <select
                value={newSessionId}
                onChange={(e) => setNewSessionId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              >
                <option value="">Unlinked / Standalone Lecture</option>
                {contextData?.teaching_sessions.map((ts) => (
                  <option key={ts.id} value={ts.id}>
                    {ts.session_date} · {ts.session_code} {ts.topic_taught ? `— ${ts.topic_taught}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Default Board Surface</label>
              <select
                value={newMode}
                onChange={(e) => setNewMode(e.target.value as EduBoardMode)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              >
                <option value="classic">Classic Chalk / Greenboard</option>
                <option value="whiteboard">Digital Whiteboard</option>
                <option value="presentation">Presentation PDF Board</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Clone From Template (Optional)</label>
              <select
                value={newTemplateId}
                onChange={(e) => setNewTemplateId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              >
                <option value="">Start Blank</option>
                {contextData?.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.page_count}p)
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newIsTemplate}
                  onChange={(e) => setNewIsTemplate(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Save as Reusable Lesson Template
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Create Board
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Optimistic Concurrency Conflict Modal (409 Guard) ── */}
      <Modal
        isOpen={!!conflictInfo}
        onClose={() => setConflictInfo(null)}
        title="Revision Conflict Detected (409)"
      >
        <div className="space-y-4 text-xs text-slate-700">
          <p>{conflictInfo?.message}</p>
          <p className="text-slate-500">
            Server revision is now <strong>#{conflictInfo?.latestRevisionNo}</strong>. Choose whether to reload the latest
            server version or keep your current screen strokes by forcing an overwrite.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setConflictInfo(null)
                void refetchBoardDetail()
              }}
              className="px-3 py-2 rounded-lg border border-slate-300 font-semibold hover:bg-slate-50"
            >
              Reload Server Version
            </button>
            <button
              type="button"
              onClick={() => void handleSyncToServer('manual', true)}
              className="px-3 py-2 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700"
            >
              Keep Local Work (Overwrite)
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Revision History Drawer / Modal ── */}
      <Modal isOpen={showRevisionsModal} onClose={() => setShowRevisionsModal(false)} title="Board Revision History">
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {!revisionsData?.items?.length ? (
            <p className="text-xs text-slate-500 py-4 text-center">No revisions recorded yet.</p>
          ) : (
            revisionsData.items.map((rev) => (
              <div
                key={rev.id}
                className="p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-2 text-xs"
              >
                <div>
                  <p className="font-bold text-slate-900">
                    Revision #{rev.revision_no}{' '}
                    <span className="ml-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase text-[10px]">
                      {rev.save_type}
                    </span>
                  </p>
                  <p className="text-slate-500 mt-0.5">
                    {rev.note || 'Snapshot'} · {rev.created_at ? new Date(rev.created_at).toLocaleString() : ''}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!isEditMode}
                  onClick={() => void handleRestoreRevision(rev.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold hover:bg-indigo-100 disabled:opacity-40"
                >
                  <RotateCcw className="w-3 h-3" /> Restore
                </button>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* ── Admin Settings Modal ── */}
      <Modal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} title="EduBoard Workspace Settings">
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Max Attachment Size (MB)</label>
            <input
              type="number"
              min={1}
              max={100}
              value={settingsForm.max_file_size_mb}
              onChange={(e) => setSettingsForm({ ...settingsForm, max_file_size_mb: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Autosave Debounce Interval (ms)</label>
            <input
              type="number"
              min={1500}
              max={30000}
              step={500}
              value={settingsForm.autosave_interval_ms}
              onChange={(e) => setSettingsForm({ ...settingsForm, autosave_interval_ms: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <label className="flex items-center gap-2 font-medium text-slate-700 pt-1">
            <input
              type="checkbox"
              checked={settingsForm.notify_students_on_publish}
              onChange={(e) =>
                setSettingsForm({ ...settingsForm, notify_students_on_publish: e.target.checked })
              }
            />
            Notify enrolled batch students in CommunicationLog upon Publish
          </label>
          <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200">
            PPT/PPTX conversion is disabled in the current runtime baseline (LibreOffice / python-pptx not installed).
            Export presentations as PDF before importing.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                await eduboardApi.updateSettings(settingsForm)
                await refetchSettings()
                setShowSettingsModal(false)
                setActionBanner({ type: 'success', text: 'EduBoard settings saved.' })
              }}
              className="px-3 py-1.5 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700"
            >
              Save Settings
            </button>
          </div>
        </div>
      </Modal>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        scope={editScope}
        entityType="EduBoard"
        entityName={localBoard?.title || 'Draft EduBoard'}
        entityId={localBoard?.id}
        requiredPermission="eduboard:delete"
        enablePreflightCheck={false}
        onConfirm={() => void handleDeleteBoard()}
      />
    </div>
  )
}

