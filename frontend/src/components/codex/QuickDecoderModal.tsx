/**
 * @file        QuickDecoderModal.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.codex
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-06
 * @updated     2026-11-08
 *
 * @description On-demand secure numeric decoder modal with PIN authorization and compliance audit logging.
 */

import React, { useState } from 'react'
import {
  X, Lock, KeyRound, Unlock, ArrowRight, ShieldCheck, AlertCircle,
  CheckCircle2, RefreshCw, Copy, Check
} from 'lucide-react'
import { codexApi } from '../../api/endpoints'

interface QuickDecoderModalProps {
  isOpen: boolean
  onClose: () => void
  initialCode?: string
}

export default function QuickDecoderModal({ isOpen, onClose, initialCode = '' }: QuickDecoderModalProps) {
  const [code, setCode] = useState(initialCode)
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    code: string
    decoded_value: number
    formatted_value: string
    version_used: number
  } | null>(null)
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleDecode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) {
      setError('Please enter a coded value.')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await codexApi.decode({
        code: code.trim(),
        pin: pin.trim() || undefined,
      })
      setResult(res.data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to decode value.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 border border-indigo-400/30 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="font-semibold text-base tracking-tight">CodeX On-Demand Decoder</h3>
              <p className="text-xs text-indigo-200/80">Authorized Numeric Reversal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleDecode} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Encoded Value / String
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. CX-AZPQ or AZPQ"
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm uppercase tracking-widest focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Security PIN <span className="text-slate-400 font-normal lowercase">(if configured)</span>
            </label>
            <div className="relative">
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter 4-6 digit PIN"
                maxLength={8}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm tracking-widest focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs text-emerald-800 font-medium">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Decoded Successfully
                </span>
                <span className="text-[11px] text-emerald-600">v{result.version_used} profile</span>
              </div>
              <div className="flex items-baseline justify-between pt-1 border-t border-emerald-100">
                <span className="text-2xl font-bold text-emerald-950 font-mono tracking-tight">
                  {result.formatted_value}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(String(result.decoded_value))}
                  className="px-2 py-1 bg-white border border-emerald-200 rounded-lg text-xs font-medium text-emerald-700 hover:bg-emerald-50 flex items-center gap-1 transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium shadow-sm shadow-indigo-200 flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Decoding...
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  Decode Value
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer Audit Notice */}
        <div className="px-6 py-2.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Enterprise Audit Trail Active</span>
          <span className="text-primary-600 font-medium">PrathamOne CodeX</span>
        </div>
      </div>
    </div>
  )
}

