/**
 * @file        BottomBarDrawer.tsx
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
 * @description Floating quick-access slide-up popup drawer positioned at the bottom-right of the viewport for rapid hybrid chat interactions and EduBoard whiteboard sketching without navigating away from the active page.
 */

import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MessageSquare,
  Presentation,
  Maximize2,
  X,
  Sparkles,
  ExternalLink
} from 'lucide-react'
import { useBottomBarDrawerStore } from '../../store/bottomBarDrawerStore'
import { ChatWorkspaceTab } from '../communication/ChatWorkspaceTab'
import { QuickEduBoardCanvas } from './QuickEduBoardCanvas'

export function BottomBarDrawer() {
  const navigate = useNavigate()
  const { activeDrawer, openDrawer, closeDrawer } = useBottomBarDrawerStore()

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeDrawer) {
        closeDrawer()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeDrawer, closeDrawer])

  if (!activeDrawer) return null

  const handleMaximize = () => {
    const currentTab = activeDrawer
    closeDrawer()
    if (currentTab === 'chats') {
      navigate('/communication/chat')
    } else if (currentTab === 'boards') {
      navigate('/eduboard')
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={activeDrawer === 'chats' ? 'Quick Chats & Doubts Drawer' : 'EduBoard Whiteboard Drawer'}
      className="fixed bottom-12 right-2 sm:right-5 z-40 w-[96vw] sm:w-[580px] md:w-[680px] h-[600px] max-h-[calc(100vh-90px)] bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200 select-none"
      style={{
        boxShadow: '0 25px 50px -12px rgba(11, 45, 107, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.08)',
      }}
    >
      {/* Drawer Header with Integrated Tab Switcher */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-slate-900 via-[#0B2D6B] to-[#071C44] text-white shrink-0 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {/* Tab Selector Buttons */}
          <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-lg border border-white/15">
            <button
              type="button"
              onClick={() => openDrawer('chats')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                activeDrawer === 'chats'
                  ? 'bg-white text-[#0B2D6B] shadow-sm'
                  : 'text-slate-200 hover:text-white hover:bg-white/10'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chats &amp; Doubts</span>
            </button>

            <button
              type="button"
              onClick={() => openDrawer('boards')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                activeDrawer === 'boards'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-200 hover:text-white hover:bg-white/10'
              }`}
            >
              <Presentation className="w-3.5 h-3.5" />
              <span>EduBoard</span>
            </button>
          </div>
        </div>

        {/* Window Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleMaximize}
            title={activeDrawer === 'chats' ? 'Open Full Chat Workspace' : 'Open Full EduBoard Studio'}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={closeDrawer}
            title="Close Drawer (Esc)"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col bg-white">
        {activeDrawer === 'chats' ? (
          <ChatWorkspaceTab compact={true} />
        ) : (
          <QuickEduBoardCanvas />
        )}
      </div>
    </div>
  )
}
