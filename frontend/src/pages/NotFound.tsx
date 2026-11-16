/**
 * @file        NotFound.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.pages
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-04
 * @updated     2026-11-16
 *
 * @description Playful, school-themed 404 error workspace featuring randomized non-consecutive educational excuses and navigation recovery.
 */

import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Home,
  ArrowLeft,
  GraduationCap,
  Sparkles,
  RefreshCw,
  School,
  Clock,
  Compass,
} from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export const STORAGE_404_KEY = 'pratham_last_404_msg_index'

/**
 * Curated collection of school and coaching-themed playful 404 excuses.
 */
export const SCHOOL_404_MESSAGES: readonly string[] = [
  "Even our topper couldn't find this page!",
  "This page bunked today's class.",
  "Attendance marked: ABSENT!",
  "The page went on vacation without permission!",
  "Even the Principal doesn't know where this page went!",
  "Wrong classroom! Please check your timetable.",
  "Our search team is still looking for this page.",
  "This page forgot to submit its homework!",
  "Looks like this page got caught chatting in the back row!",
  "The bell rang and this page ran straight to the canteen!",
  "This page is standing outside with its hands up!",
  "Zero marks for attendance — this page never showed up!",
  "This syllabus chapter seems to have been deleted!",
  "The dog actually ate this page's homework!",
  "This page is serving detention in the computer lab!",
  "Did you forget your hall ticket? This page is not on the exam list!",
  "Teacher said: 'Pin-drop silence while we locate this missing page!'",
  "Staff room report: Nobody has seen this page all period!",
  "The sports teacher took over this period; page was not found on the field!",
  "This page requested an emergency sick leave pass!",
  "Looks like this question was completely out of syllabus!",
  "Library notice: This page was never returned after recess!",
  "This page is sitting on the back bench hiding from the viva!",
  "Surprise test announced — this page vanished into thin air!",
]

/**
 * Deterministically picks a random index from 0 to totalMessages-1,
 * mathematically guaranteeing that the returned index does NOT equal lastIndex.
 */
export function getRandomNonConsecutiveMessageIndex(
  lastIndex: number | null,
  totalMessages: number
): number {
  if (totalMessages <= 1) return 0
  if (lastIndex === null || lastIndex < 0 || lastIndex >= totalMessages) {
    return Math.floor(Math.random() * totalMessages)
  }
  const offset = Math.floor(Math.random() * (totalMessages - 1))
  return offset >= lastIndex ? offset + 1 : offset
}

function getInitialMessageIndex(): number {
  try {
    const raw = sessionStorage.getItem(STORAGE_404_KEY)
    const lastIndex = raw !== null ? parseInt(raw, 10) : null
    const validLast =
      lastIndex !== null && !isNaN(lastIndex) && lastIndex >= 0 && lastIndex < SCHOOL_404_MESSAGES.length
        ? lastIndex
        : null
    const nextIndex = getRandomNonConsecutiveMessageIndex(validLast, SCHOOL_404_MESSAGES.length)
    sessionStorage.setItem(STORAGE_404_KEY, String(nextIndex))
    return nextIndex
  } catch {
    return Math.floor(Math.random() * SCHOOL_404_MESSAGES.length)
  }
}

export default function NotFoundPage() {
  useDocumentTitle('404 — Class is Missing | PrathamOne EduOS')
  const navigate = useNavigate()
  const [messageIndex, setMessageIndex] = useState<number>(getInitialMessageIndex)
  const [isRotating, setIsRotating] = useState(false)

  const handleShuffle = () => {
    setIsRotating(true)
    const nextIndex = getRandomNonConsecutiveMessageIndex(messageIndex, SCHOOL_404_MESSAGES.length)
    try {
      sessionStorage.setItem(STORAGE_404_KEY, String(nextIndex))
    } catch {
      // Fallback if storage unavailable
    }
    setMessageIndex(nextIndex)
    setTimeout(() => setIsRotating(false), 300)
  }

  const handleGoBack = () => {
    navigate(-1)
  }

  const currentMessage = SCHOOL_404_MESSAGES[messageIndex]

  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] py-8 px-4 text-center select-none animate-fade-in">
      <div className="max-w-xl w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xs space-y-6">
        {/* Playful Header Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs">
          <School className="w-3.5 h-3.5 text-amber-600" />
          <span>Period 404 • Classroom Roll Call</span>
        </div>

        {/* Central Visual Icon & Big 404 */}
        <div className="relative flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-tr from-primary-50 via-indigo-50 to-amber-50 border border-primary-100 shadow-inner">
            <GraduationCap className="w-12 h-12 text-primary-600" />
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-black shadow-xs">
              ?
            </div>
          </div>
          <div className="mt-4 font-mono font-black text-6xl sm:text-7xl text-slate-900 tracking-tight flex items-center justify-center">
            <span>4</span>
            <span className="text-primary-600 animate-pulse inline-block mx-0.5">0</span>
            <span>4</span>
          </div>
        </div>

        {/* Main Heading — Exact User Requirement */}
        <div className="space-y-2">
          <h1
            data-testid="not-found-heading"
            className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight"
          >
            Oops! Class is missing! 😄
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            The lecture hall or page you requested cannot be located in the current academy schedule.
          </p>
        </div>

        {/* Curated Excuse Card */}
        <div className="relative bg-gradient-to-br from-amber-50/60 via-slate-50/50 to-primary-50/40 border border-amber-200/70 rounded-2xl p-4 sm:p-5 shadow-2xs text-center transition-all">
          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-amber-200/50 text-[11px] font-semibold text-amber-900 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Staff Room Dispatch</span>
            </span>
            <button
              type="button"
              onClick={handleShuffle}
              data-testid="shuffle-404-btn"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-amber-100/80 text-amber-800 text-[11px] font-bold transition active:scale-95"
              title="Roll another excuse"
              aria-label="Roll another excuse"
            >
              <RefreshCw className={`w-3 h-3 ${isRotating ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">Next Excuse</span>
            </button>
          </div>

          <p
            data-testid="not-found-funny-message"
            className="text-base sm:text-lg font-bold text-slate-800 italic leading-relaxed px-2 py-1"
          >
            “{currentMessage}”
          </p>
        </div>

        {/* Action Recovery Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleGoBack}
            data-testid="go-back-btn"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Go Back</span>
          </button>

          <Link
            to="/"
            data-testid="return-dashboard-btn"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-all active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>

        {/* Safe Disclaimers */}
        <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-center gap-4 flex-wrap">
          <span className="flex items-center gap-1">
            <Compass className="w-3 h-3" />
            <span>Timetable Ref: ERR-404</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Attendance Logged Safely</span>
          </span>
        </div>
      </div>
    </div>
  )
}
