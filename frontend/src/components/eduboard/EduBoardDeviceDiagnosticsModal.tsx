/**
 * @file        EduBoardDeviceDiagnosticsModal.tsx
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
 * @created     2026-11-13
 * @updated     2026-11-13
 *
 * @description Universal hardware-independent device capability diagnostics modal for EduBoard. Displays detected browser APIs, screen geometry, pointer characteristics, and synchronization health without claiming unsupported hardware certification.
 */

import React from 'react'
import {
  Monitor,
  Cpu,
  Touchpad,
  PenTool,
  Maximize2,
  FileCheck,
  Wifi,
  WifiOff,
  Database,
  Info,
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import type { DeviceCapabilityProfile } from '../../utils/deviceCapabilities'

interface Props {
  isOpen: boolean
  onClose: () => void
  profile: DeviceCapabilityProfile
  wsState: string
  hasUnsavedChanges?: boolean
}

export default function EduBoardDeviceDiagnosticsModal({
  isOpen,
  onClose,
  profile,
  wsState,
  hasUnsavedChanges = false,
}: Props) {
  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="device-diagnostics-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 id="device-diagnostics-title" className="text-base font-bold text-slate-900">
                Universal Device & Browser Diagnostics
              </h2>
              <p className="text-xs text-slate-500">
                Hardware-independent runtime capability detection for PrathamOne EduBoard
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm text-slate-700">
          {/* Regulatory Disclaimer Banner */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex gap-2.5 items-start">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Capability Detection Notice:</span> The parameters below are dynamically detected via standard W3C browser APIs at runtime. They reflect the current browser execution environment and must be distinguished from physical factory hardware certifications.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Display & Resolution */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Monitor className="w-4 h-4 text-primary-600" />
                Display & Geometry
              </div>
              <div className="text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Category:</span>
                  <span className="font-medium text-slate-900">{profile.displayClassification}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Physical Screen:</span>
                  <span className="font-mono text-slate-800">{profile.screenWidth} × {profile.screenHeight} px</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Browser Viewport:</span>
                  <span className="font-mono text-slate-800">{profile.viewportWidth} × {profile.viewportHeight} px</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Device Pixel Ratio:</span>
                  <span className="font-mono text-slate-800">{profile.devicePixelRatio}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Orientation:</span>
                  <span className="capitalize font-medium text-slate-800">{profile.orientation}</span>
                </div>
              </div>
            </div>

            {/* Input & Pointer Engine */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Touchpad className="w-4 h-4 text-emerald-600" />
                Input & Pointer Engine
              </div>
              <div className="text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Touch Support:</span>
                  <span className="font-medium text-slate-900">
                    {profile.hasTouchEvents ? `Available (${profile.maxTouchPoints} points)` : 'None detected'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Primary Pointer:</span>
                  <span className="font-medium text-slate-900 capitalize">{profile.primaryPointer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Last Active Input:</span>
                  <span className="font-medium text-primary-700 capitalize flex items-center gap-1">
                    {profile.lastObservedPointerType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pressure Sensitivity:</span>
                  <span className="font-medium text-slate-800">
                    {profile.hasObservedPressure ? 'Hardware Reported' : 'Fallback Emulated'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tilt Detection:</span>
                  <span className="font-medium text-slate-800">
                    {profile.hasObservedTilt ? 'Hardware Reported' : 'Not Detected / Unsupported'}
                  </span>
                </div>
              </div>
            </div>

            {/* OS & Browser Engine */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                OS & Browser Runtime
              </div>
              <div className="text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Operating System:</span>
                  <span className="font-medium text-slate-900">{profile.osFamily}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Browser Family:</span>
                  <span className="font-medium text-slate-900">{profile.browserFamily}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Display Mode:</span>
                  <span className="font-medium text-slate-800">
                    {profile.isStandalonePWA ? 'Standalone App' : 'Browser Tab'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fullscreen API:</span>
                  <span className="font-medium text-emerald-700 flex items-center gap-1">
                    {profile.supportsFullscreen ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3 text-amber-600" />}
                    {profile.supportsFullscreen ? 'Supported' : 'Fallback Only'}
                  </span>
                </div>
              </div>
            </div>

            {/* Storage & Synchronization */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Database className="w-4 h-4 text-amber-600" />
                Storage & Sync Pipeline
              </div>
              <div className="text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">WebSocket Sync:</span>
                  <span className={`font-semibold capitalize flex items-center gap-1 ${
                    wsState === 'connected' ? 'text-emerald-700' : 'text-slate-600'
                  }`}>
                    {wsState === 'connected' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    {wsState}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">IndexedDB Recovery:</span>
                  <span className="font-medium text-emerald-700 flex items-center gap-1">
                    {profile.supportsIndexedDB ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3 text-rose-600" />}
                    {profile.supportsIndexedDB ? 'Ready' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Unsaved Revisions:</span>
                  <span className="font-medium text-slate-900">
                    {hasUnsavedChanges ? 'Local changes pending autosave' : 'All revisions saved'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Network Link:</span>
                  <span className="font-medium text-slate-800">
                    {profile.isOnline ? `Online (${profile.connectionType || 'Broadband'})` : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>PrathamOne EduBoard v1.93.2 Universal Runtime</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-900 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
