/**
 * @file        ChatWorkspaceTab.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.communication
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-16
 * @updated     2026-11-16
 *
 * @description Full Hybrid Chat Workspace component featuring Staff Collaboration Rooms,
 */

import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  MessageSquare, Send, Users, Shield, Clock, CheckCircle2,
  AlertTriangle, Search, Plus, Moon, HelpCircle, Check,
  Sparkles, RefreshCw, X, Radio, ArrowRight, Lock, BookOpen,
  AtSign, Download, Eye, FileText, UserCheck, Receipt, GraduationCap
} from 'lucide-react'
import { chatApi } from '../../api/endpoints'
import type { ChatRoomItem, ChatMessageItem, MentionableEntityItem } from '../../types'
import { useAuthStore, isUserSysAdmin } from '../../store/authStore'
import { useBranding } from '../../config/branding'

export function ChatWorkspaceTab() {
  const { user } = useAuthStore()
  const branding = useBranding()
  const isSysAdmin = isUserSysAdmin(user)
  const isTeacherOrAdmin = useMemo(() => {
    const role = (user?.role || '').toLowerCase()
    return ['superadmin', 'admin', 'principal', 'teacher'].includes(role)
  }, [user])

  // State
  const [rooms, setRooms] = useState<ChatRoomItem[]>([])
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessageItem[]>([])
  const [isLoadingRooms, setIsLoadingRooms] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'ALL' | 'STAFF' | 'DOUBTS'>('ALL')
  const [inputText, setInputText] = useState('')
  const [isDoubtMode, setIsDoubtMode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showNewRoomModal, setShowNewRoomModal] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomCode, setNewRoomCode] = useState('')
  const [newRoomDesc, setNewRoomDesc] = useState('')
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)
  const [showMentionPopover, setShowMentionPopover] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionEntities, setMentionEntities] = useState<MentionableEntityItem[]>([])
  const [isLoadingEntities, setIsLoadingEntities] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch accessible rooms on mount
  const fetchRooms = async () => {
    setIsLoadingRooms(true)
    try {
      const res = await chatApi.getRooms()
      setRooms(res.data)
      if (res.data.length > 0 && !activeRoomId) {
        setActiveRoomId(res.data[0].id)
      }
    } catch (err) {
      console.error('Failed to load chat rooms:', err)
    } finally {
      setIsLoadingRooms(false)
    }
  }

  useEffect(() => {
    fetchRooms()
  }, [])

  const activeRoom = useMemo(() => {
    return rooms.find((r) => r.id === activeRoomId) || null
  }, [rooms, activeRoomId])

  // Fetch messages when active room changes
  useEffect(() => {
    if (!activeRoomId) return

    let isMounted = true
    setIsLoadingMessages(true)

    chatApi.getMessages(activeRoomId)
      .then((res) => {
        if (isMounted) {
          setMessages(res.data)
          setIsLoadingMessages(false)
        }
      })
      .catch((err) => {
        console.error('Failed to fetch messages:', err)
        if (isMounted) setIsLoadingMessages(false)
      })

    // Establish WebSocket Connection with Fallback Polling
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const token = localStorage.getItem('prashant_access_token') || ''
    const wsUrl = `${protocol}//${host}/api/v1/chat/ws/${activeRoomId}?token=${encodeURIComponent(token)}`

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        if (isMounted) setWsConnected(true)
      }

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          if (payload.type === 'NEW_MESSAGE' && payload.message) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.message.id)) return prev
              return [...prev, payload.message]
            })
          }
        } catch (e) {
          console.warn('WS message parse error:', e)
        }
      }

      ws.onclose = () => {
        if (isMounted) setWsConnected(false)
      }

      ws.onerror = () => {
        if (isMounted) setWsConnected(false)
      }
    } catch (e) {
      console.warn('WebSocket connection not available; using polling fallback', e)
    }

    // Polling fallback every 4 seconds
    const interval = setInterval(() => {
      chatApi.getMessages(activeRoomId).then((res) => {
        if (isMounted) {
          setMessages(res.data)
        }
      }).catch(() => {})
    }, 4000)

    return () => {
      isMounted = false
      clearInterval(interval)
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [activeRoomId])

  // Auto-scroll on new message
  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const matchesSearch =
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.code.toLowerCase().includes(searchQuery.toLowerCase())

      if (!matchesSearch) return false

      if (filterType === 'STAFF') {
        return ['STAFF_GENERAL', 'STAFF_DEPT', 'STAFF_DIRECT'].includes(r.room_type)
      }
      if (filterType === 'DOUBTS') {
        return r.room_type === 'BATCH_DOUBT'
      }
      return true
    })
  }, [rooms, searchQuery, filterType])

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || !activeRoomId || isSubmitting) return

    const content = inputText.trim()
    const msgType = isDoubtMode ? 'DOUBT_QUESTION' : 'TEXT'
    setInputText('')
    setIsSubmitting(true)

    try {
      const res = await chatApi.sendMessage(activeRoomId, {
        content,
        message_type: msgType,
      })
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.data.id)) return prev
        return [...prev, res.data]
      })
      setIsDoubtMode(false)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to send message.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Resolve doubt
  const handleResolveDoubt = async (messageId: number) => {
    try {
      const res = await chatApi.resolveDoubt(messageId)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, is_doubt_resolved: true, resolved_at: res.data.resolved_at }
            : m
        )
      )
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to mark doubt as resolved.')
    }
  }

  // Create custom room
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoomName.trim() || !newRoomCode.trim()) return

    setIsCreatingRoom(true)
    try {
      await chatApi.createRoom({
        name: newRoomName.trim(),
        code: newRoomCode.trim().toLowerCase().replace(/\s+/g, '_'),
        description: newRoomDesc.trim(),
        room_type: 'STAFF_DEPT',
      })
      setShowNewRoomModal(false)
      setNewRoomName('')
      setNewRoomCode('')
      setNewRoomDesc('')
      fetchRooms()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create room.')
    } finally {
      setIsCreatingRoom(false)
    }
  }

  // Action: View entity details
  const handleViewEntity = (viewUrl: string) => {
    if (!viewUrl) return
    window.open(viewUrl, '_blank')
  }

  // Action: Download authorized document / PDF
  const handleDownloadEntity = async (downloadUrl: string, title: string) => {
    if (!downloadUrl) return
    try {
      const token = localStorage.getItem('prashant_access_token') || ''
      const fullUrl = downloadUrl.startsWith('http') ? downloadUrl : `${window.location.origin}${downloadUrl}`
      const response = await fetch(fullUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!response.ok) throw new Error(`HTTP error ${response.status}`)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      const ext = downloadUrl.endsWith('.pdf') ? '.pdf' : '.pdf'
      a.download = `${title.replace(/[^a-zA-Z0-9_\-]/g, '_')}${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)
    } catch (e) {
      console.warn('Falling back to direct window open for download:', e)
      window.open(downloadUrl, '_blank')
    }
  }

  // Handle typing in composer input with @ mention detection
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputText(val)

    // Trigger @ mention popover when @ is typed
    const match = val.match(/@([a-zA-Z0-9_\-\s]{0,30})$/)
    if (match !== null) {
      setMentionQuery(match[1])
      setShowMentionPopover(true)
    } else {
      setShowMentionPopover(false)
    }
  }

  // Fetch mentionable entities when query changes
  useEffect(() => {
    if (!showMentionPopover || !activeRoomId) return

    let isMounted = true
    setIsLoadingEntities(true)
    const timeout = setTimeout(async () => {
      try {
        const res = await chatApi.getMentionableEntities(activeRoomId, mentionQuery.trim(), 8)
        if (isMounted) {
          setMentionEntities(res.data)
        }
      } catch (err) {
        console.error('Failed to search mentionable entities:', err)
      } finally {
        if (isMounted) setIsLoadingEntities(false)
      }
    }, 150)

    return () => {
      isMounted = false
      clearTimeout(timeout)
    }
  }, [mentionQuery, showMentionPopover, activeRoomId])

  // Insert entity chip into composer
  const handleInsertEntity = (entity: MentionableEntityItem) => {
    const replaced = inputText.replace(
      /@([a-zA-Z0-9_\-\s]{0,30})$/,
      `[[entity:${entity.entity_type}:${entity.entity_id}:${encodeURIComponent(entity.title)}:${encodeURIComponent(entity.subtitle)}:${encodeURIComponent(entity.view_url)}:${encodeURIComponent(entity.download_url || '')}]] `
    )
    setInputText(replaced)
    setShowMentionPopover(false)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  // Render message content with interactive cards for entity mentions
  const renderMessageContent = (content: string, isMe: boolean) => {
    const entityRegex = /\[\[entity:([A-Z_]+):(\d+):([^:]+):([^:]+):([^:]+):([^\]]*)\]\]/g
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = entityRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
            {content.substring(lastIndex, match.index)}
          </span>
        )
      }

      const entityType = match[1]
      const title = decodeURIComponent(match[3])
      const subtitle = decodeURIComponent(match[4])
      const viewUrl = decodeURIComponent(match[5])
      const downloadUrl = decodeURIComponent(match[6])

      const isStudent = entityType === 'STUDENT'
      const isReceipt = entityType === 'RECEIPT'
      const isHomework = entityType === 'HOMEWORK'
      const isMaterial = entityType === 'STUDY_MATERIAL'

      parts.push(
        <div
          key={`entity-${match.index}`}
          className={`my-2 p-2.5 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-shadow ${
            isMe
              ? 'bg-emerald-700/90 border-emerald-500 text-white shadow-sm'
              : 'bg-slate-50 border-slate-200 text-slate-800 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                isStudent
                  ? 'bg-emerald-100 text-emerald-700'
                  : isReceipt
                  ? 'bg-blue-100 text-blue-700'
                  : isHomework
                  ? 'bg-amber-100 text-amber-700'
                  : isMaterial
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-purple-100 text-purple-700'
              }`}
            >
              {isStudent ? (
                <GraduationCap className="w-4 h-4" />
              ) : isReceipt ? (
                <Receipt className="w-4 h-4" />
              ) : isHomework ? (
                <BookOpen className="w-4 h-4" />
              ) : isMaterial ? (
                <FileText className="w-4 h-4" />
              ) : (
                <Users className="w-4 h-4" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-xs truncate">{title}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                    isMe
                      ? 'bg-emerald-800 text-emerald-200'
                      : isStudent
                      ? 'bg-emerald-100 text-emerald-800'
                      : isReceipt
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {entityType.replace('_', ' ')}
                </span>
              </div>
              {subtitle && (
                <p
                  className={`text-[10px] truncate ${
                    isMe ? 'text-emerald-200' : 'text-slate-500'
                  }`}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={() => handleViewEntity(viewUrl)}
              className={`px-2 py-1 text-[11px] font-medium rounded flex items-center gap-1 transition-colors ${
                isMe
                  ? 'bg-emerald-800 hover:bg-emerald-900 text-white'
                  : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
              title="View Record Details"
            >
              <Eye className="w-3 h-3" />
              <span>View</span>
            </button>

            {downloadUrl && (
              <button
                type="button"
                onClick={() => handleDownloadEntity(downloadUrl, title)}
                className={`px-2 py-1 text-[11px] font-medium rounded flex items-center gap-1 transition-colors ${
                  isMe
                    ? 'bg-white hover:bg-slate-100 text-emerald-800 font-semibold'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
                title="Download Official Record / PDF"
              >
                <Download className="w-3 h-3" />
                <span>Download PDF</span>
              </button>
            )}
          </div>
        </div>
      )

      lastIndex = entityRegex.lastIndex
    }

    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
          {content.substring(lastIndex)}
        </span>
      )
    }

    return parts.length > 0 ? parts : <span className="whitespace-pre-wrap">{content}</span>
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row h-[750px]">
      {/* ------------------------------------------------------------------ */}
      {/* LEFT PANE: Channels & Doubt Desks Explorer */}
      {/* ------------------------------------------------------------------ */}
      <div className="w-full md:w-80 border-r border-slate-200 bg-slate-50 flex flex-col h-full">
        {/* Channel Search & Filters */}
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              Communication Desks
            </h3>
            {isSysAdmin && (
              <button
                onClick={() => setShowNewRoomModal(true)}
                className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-slate-200 rounded transition-colors"
                title="Create Custom Channel"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 pt-1">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                filterType === 'ALL'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All ({rooms.length})
            </button>
            <button
              onClick={() => setFilterType('STAFF')}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                filterType === 'STAFF'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Staff
            </button>
            <button
              onClick={() => setFilterType('DOUBTS')}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                filterType === 'DOUBTS'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Doubts
            </button>
          </div>
        </div>

        {/* Room List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {isLoadingRooms ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading channels...</div>
          ) : filteredRooms.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No matching rooms found.</div>
          ) : (
            filteredRooms.map((room) => {
              const isActive = room.id === activeRoomId
              const isBatch = room.room_type === 'BATCH_DOUBT'
              return (
                <button
                  key={room.id}
                  onClick={() => setActiveRoomId(room.id)}
                  className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 ${
                    isActive
                      ? 'bg-emerald-50/70 border-l-4 border-emerald-600'
                      : 'hover:bg-slate-100/70'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isBatch ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {isBatch ? <BookOpen className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium text-xs text-slate-900 truncate">
                        {room.name}
                      </span>
                      {room.is_curfew_active && (
                        <span
                          className="shrink-0 p-0.5 rounded text-[10px] bg-amber-100 text-amber-800 flex items-center"
                          title="Curfew Active (Read-Only Mode)"
                        >
                          <Moon className="w-3 h-3" />
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-1 mt-1 text-[11px] text-slate-500">
                      <span className="truncate">
                        {isBatch ? 'Academic Doubt Desk' : 'Staff Collaboration'}
                      </span>
                      {room.unresolved_doubts_count > 0 && (
                        <span className="shrink-0 px-1.5 py-0.2 bg-amber-500 text-white rounded-full font-bold text-[10px]">
                          {room.unresolved_doubts_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* RIGHT PANE: Chat Stream & Message Composer */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 flex flex-col h-full bg-slate-50/30">
        {activeRoom ? (
          <>
            {/* Room Header */}
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-slate-900 text-sm">{activeRoom.name}</h2>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      activeRoom.room_type === 'BATCH_DOUBT'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {activeRoom.room_type.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeRoom.description || 'Institute collaboration channel'}
                </p>
              </div>

              {/* Status Indicators */}
              <div className="flex items-center gap-3 text-xs">
                {activeRoom.is_curfew_enabled && (
                  <span
                    className={`px-2 py-1 rounded-md flex items-center gap-1.5 font-medium ${
                      activeRoom.is_curfew_active
                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    {activeRoom.is_curfew_active
                      ? 'Curfew Active (Read-Only)'
                      : `Curfew: ${activeRoom.curfew_start_time} - ${activeRoom.curfew_end_time}`}
                  </span>
                )}

                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      wsConnected ? 'bg-emerald-500' : 'bg-amber-400'
                    }`}
                  />
                  {wsConnected ? 'Live' : 'Synced'}
                </div>
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {isLoadingMessages ? (
                <div className="text-center py-12 text-xs text-slate-400">
                  Loading message history...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-16">
                  <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-500">No messages yet in this room.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Start the conversation or ask an academic doubt below.
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  const isDoubt = m.message_type === 'DOUBT_QUESTION'
                  const isMe = m.sender_user_id === user?.id

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${
                        isMe ? 'items-end' : 'items-start'
                      }`}
                    >
                      {/* Sender badge & time */}
                      <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-800">
                          {m.sender_display_name}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            m.sender_role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-700'
                              : m.sender_role === 'TEACHER'
                              ? 'bg-blue-100 text-blue-700'
                              : m.sender_role === 'STUDENT'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {m.sender_role}
                        </span>
                        <span>
                          {m.created_at
                            ? new Date(m.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </div>

                      {/* Bubble */}
                      <div
                        className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm text-xs ${
                          isDoubt
                            ? 'bg-amber-50 border border-amber-200 text-amber-950'
                            : isMe
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-800'
                        }`}
                      >
                        {/* Doubt Tag Indicator */}
                        {isDoubt && (
                          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-amber-200/80">
                            <span className="flex items-center gap-1.5 font-bold text-amber-800 text-[11px]">
                              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                              ACADEMIC DOUBT
                            </span>

                            {m.is_doubt_resolved ? (
                              <span className="flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                                <Check className="w-3 h-3 text-emerald-600" />
                                Resolved
                              </span>
                            ) : (
                              isTeacherOrAdmin && (
                                <button
                                  onClick={() => handleResolveDoubt(m.id)}
                                  className="text-[10px] bg-amber-600 hover:bg-amber-700 text-white font-medium px-2 py-0.5 rounded transition-colors"
                                >
                                  Mark as Resolved
                                </button>
                              )
                            )}
                          </div>
                        )}

                        {/* Content text */}
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {renderMessageContent(m.content, isMe)}
                        </div>

                        {/* Quarantined alert */}
                        {m.is_quarantined && (
                          <div className="mt-2 pt-2 border-t border-red-200 flex items-center gap-1.5 text-red-600 text-[10px] font-medium">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>Quarantined by automated filter: {m.quarantine_reason}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer Section */}
            <div className="p-3 bg-white border-t border-slate-200">
              {activeRoom.is_curfew_active && !isTeacherOrAdmin ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center text-xs text-amber-800 flex items-center justify-center gap-2">
                  <Moon className="w-4 h-4 text-amber-600" />
                  <span>
                    Curfew Active: This academic room is read-only overnight to encourage healthy sleep habits.
                    Messaging reopens at {activeRoom.curfew_end_time || '8:00 AM'}.
                  </span>
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="space-y-2 relative">
                  {/* Floating @ Mention Popover */}
                  {showMentionPopover && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-20 max-h-72 flex flex-col">
                      <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
                        <span className="font-semibold flex items-center gap-1.5 text-slate-800">
                          <AtSign className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Mention or Quick Access Record</span>
                          {mentionQuery && (
                            <span className="font-normal text-slate-500">for &ldquo;{mentionQuery}&rdquo;</span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowMentionPopover(false)}
                          className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
                        {isLoadingEntities ? (
                          <div className="p-4 text-center text-xs text-slate-400">Searching records...</div>
                        ) : mentionEntities.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-400">
                            No matching records found or restricted by room permissions.
                          </div>
                        ) : (
                          mentionEntities.map((item) => (
                            <div
                              key={item.id}
                              className="p-2.5 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors text-xs"
                            >
                              <div
                                onClick={() => handleInsertEntity(item)}
                                className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                              >
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                    item.entity_type === 'STUDENT'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : item.entity_type === 'RECEIPT'
                                      ? 'bg-blue-100 text-blue-800'
                                      : item.entity_type === 'HOMEWORK'
                                      ? 'bg-amber-100 text-amber-800'
                                      : item.entity_type === 'STUDY_MATERIAL'
                                      ? 'bg-indigo-100 text-indigo-800'
                                      : 'bg-purple-100 text-purple-800'
                                  }`}
                                >
                                  {item.badge}
                                </span>
                                <div className="truncate">
                                  <p className="font-semibold text-slate-900 truncate">{item.title}</p>
                                  <p className="text-[11px] text-slate-500 truncate">{item.subtitle}</p>
                                </div>
                              </div>

                              {/* Direct Action buttons: View, Download, Insert */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleViewEntity(item.view_url)}
                                  className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded flex items-center gap-1 transition-colors"
                                  title="View Record Details"
                                >
                                  <Eye className="w-3 h-3 text-slate-500" />
                                  <span>View</span>
                                </button>

                                {item.download_url && (
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadEntity(item.download_url!, item.title)}
                                    className="px-2 py-1 text-[11px] font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded flex items-center gap-1 transition-colors"
                                    title="Download Official Record / PDF"
                                  >
                                    <Download className="w-3 h-3 text-emerald-600" />
                                    <span>Download</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleInsertEntity(item)}
                                  className="px-2 py-1 text-[11px] font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded flex items-center gap-1 transition-colors"
                                  title="Insert Link into Message"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Insert</span>
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Toolbar Row */}
                  <div className="flex items-center justify-between text-xs px-1 gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowMentionPopover(true)
                          setMentionQuery('')
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                        title="Search and link student KYC, receipts, or study materials"
                      >
                        <AtSign className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Mention Record</span>
                      </button>

                      {activeRoom.room_type === 'BATCH_DOUBT' && (
                        <button
                          type="button"
                          onClick={() => setIsDoubtMode(!isDoubtMode)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                            isDoubtMode
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          {isDoubtMode ? 'Tagged as Academic Doubt' : 'Tag as Academic Doubt'}
                        </button>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-400">
                      Type <strong className="text-slate-600 font-mono">@</strong> to search records &bull; Supports LaTeX math
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder={
                        isDoubtMode
                          ? 'State your academic problem or question clearly... (Type @ to link records)'
                          : 'Type your message... (Type @ to search & link students, receipts, notes)'
                      }
                      value={inputText}
                      onChange={handleInputChange}
                      className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    />

                    <button
                      type="submit"
                      disabled={!inputText.trim() || isSubmitting}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
            Select a communication channel from the left pane to begin.
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Modal: Create Custom Collaboration Room */}
      {/* ------------------------------------------------------------------ */}
      {showNewRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Create New Department Channel</h3>
              <button
                onClick={() => setShowNewRoomModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Channel Name</label>
                <input
                  type="text"
                  placeholder="e.g. Science Faculty Coordination"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Channel Identifier Code</label>
                <input
                  type="text"
                  placeholder="e.g. science_faculty"
                  value={newRoomCode}
                  onChange={(e) => setNewRoomCode(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Operational purpose of this channel..."
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewRoomModal(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingRoom}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                >
                  {isCreatingRoom ? 'Creating...' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
