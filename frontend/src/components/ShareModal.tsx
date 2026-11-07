/**
 * @file        ShareModal.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-05
 * @updated     2026-11-08
 *
 * @description Universal Sharing Action modal supporting WhatsApp, Email, SMS, expiring secure links, PDF download, and printing.
 */

import React, { useState, useEffect } from 'react'
import {
  X, Share2, MessageCircle, Mail, MessageSquare, Link, Copy, Check,
  Download, Printer, Shield, Clock, Lock, AlertTriangle, ExternalLink, RefreshCw
} from 'lucide-react'
import { communicationApi } from '../api/endpoints'
import type { ShareDocumentResponse } from '../types'
import { useBranding, PRINT_SHARE_BRANDING } from '../config/branding'
import { PrintBrandingFooter } from './PrintDocumentBranding'

export interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  documentType: 'RECEIPT' | 'REPORT_CARD' | 'FEE_STATEMENT' | 'STUDENT_PROFILE' | 'ATTENDANCE_SUMMARY' | 'STAFF_DOCUMENT' | 'FORM' | string
  recordId: number | string
  title: string
  recipientName?: string
  recipientPhone?: string
  recipientEmail?: string
  defaultMessage?: string
  onPrint?: () => void
  onDownload?: () => void
}

export default function ShareModal({
  isOpen,
  onClose,
  documentType,
  recordId,
  title,
  recipientName = '',
  recipientPhone = '',
  recipientEmail = '',
  defaultMessage = '',
  onPrint,
  onDownload,
}: ShareModalProps) {
  const branding = useBranding()

  // Active channel tab: 'whatsapp' | 'email' | 'sms' | 'link' | 'actions'
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'email' | 'sms' | 'link'>('whatsapp')

  // Form states
  const [phone, setPhone] = useState(recipientPhone)
  const [email, setEmail] = useState(recipientEmail)
  const [name, setName] = useState(recipientName)
  const [customMessage, setCustomMessage] = useState(defaultMessage)
  const [expiryHours, setExpiryHours] = useState<number>(168) // 7 days
  const [accessPin, setAccessPin] = useState<string>('')
  const [isPinProtected, setIsPinProtected] = useState<boolean>(false)

  // Status & Token states
  const [loading, setLoading] = useState<boolean>(false)
  const [shareData, setShareData] = useState<ShareDocumentResponse | null>(null)
  const [copied, setCopied] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Synchronize initial prop values
  useEffect(() => {
    if (isOpen) {
      setPhone(recipientPhone || '')
      setEmail(recipientEmail || '')
      setName(recipientName || '')
      setFeedback(null)
      setCopied(false)

      const initialText =
        defaultMessage ||
        `Official ${documentType.replace('_', ' ').toLowerCase()} from ${branding.appName}: ${title}.`
      setCustomMessage(initialText)

      // Auto-generate or pre-fetch secure link
      handleGenerateShareLink(false)
    }
  }, [isOpen, recordId, documentType])

  const handleGenerateShareLink = async (showToast: boolean = true) => {
    try {
      setLoading(true)
      const res = await communicationApi.shareDocument({
        document_type: documentType,
        record_id: typeof recordId === 'number' ? recordId : parseInt(recordId as string) || 1,
        recipient_name: name || undefined,
        recipient_phone: phone || undefined,
        recipient_email: email || undefined,
        expires_in_hours: expiryHours,
        access_key: isPinProtected && accessPin ? accessPin : undefined,
      })
      setShareData(res.data)
      if (showToast) {
        setFeedback({ type: 'success', message: 'Secure access link generated with auto-expiration.' })
      }
    } catch (err: any) {
      console.error('Failed to generate secure share link:', err)
      if (showToast) {
        setFeedback({ type: 'error', message: 'Failed to generate secure link. Please try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  // Copy Secure Link
  const handleCopyLink = () => {
    if (!shareData?.share_url) return
    const fullUrl = `${window.location.origin}${shareData.share_url}`
    navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    setFeedback({ type: 'success', message: 'Link copied to clipboard.' })
    setTimeout(() => setCopied(false), 3000)
  }

  // WhatsApp Send / Open
  const handleWhatsAppSend = async () => {
    if (!phone) {
      setFeedback({ type: 'error', message: 'Please provide a recipient WhatsApp mobile number.' })
      return
    }

    try {
      setLoading(true)
      const linkSnippet = shareData?.share_url ? `\nSecure Link: ${window.location.origin}${shareData.share_url}` : ''
      const finalMsg = `${customMessage}${linkSnippet}\n\n— ${PRINT_SHARE_BRANDING.text}`

      // Call API to record dispatch in audit logs
      await communicationApi.sendMessage({
        channel: 'WHATSAPP',
        message: finalMsg,
        recipients: [
          {
            recipient_type: 'STUDENT',
            name: name || 'Recipient',
            destination: phone,
          },
        ],
        document_attachment: {
          document_type: documentType,
          record_id: typeof recordId === 'number' ? recordId : parseInt(recordId as string) || 1,
          title: title,
        },
      })

      // Clean phone number
      let cleanPhone = phone.replace(/[^\d]/g, '')
      if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`

      // Open WhatsApp Web or mobile client
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(finalMsg)}`
      window.open(waUrl, '_blank', 'noopener,noreferrer')

      setFeedback({ type: 'success', message: 'WhatsApp message prepared and delivery logged.' })
    } catch (err: any) {
      console.error('Failed to dispatch WhatsApp:', err)
      setFeedback({ type: 'error', message: 'Failed to process WhatsApp dispatch.' })
    } finally {
      setLoading(false)
    }
  }

  // Email Send
  const handleEmailSend = async () => {
    if (!email || !email.includes('@')) {
      setFeedback({ type: 'error', message: 'Please provide a valid recipient email address.' })
      return
    }

    try {
      setLoading(true)
      const linkSnippet = shareData?.share_url ? `\n\nView Document Online: ${window.location.origin}${shareData.share_url}` : ''
      const finalMsg = `${customMessage}${linkSnippet}\n\n— ${PRINT_SHARE_BRANDING.text}`

      await communicationApi.sendMessage({
        channel: 'EMAIL',
        subject: `Official Document: ${title} - ${branding.appName}`,
        message: finalMsg,
        recipients: [
          {
            recipient_type: 'STUDENT',
            name: name || 'Recipient',
            destination: email,
          },
        ],
        document_attachment: {
          document_type: documentType,
          record_id: typeof recordId === 'number' ? recordId : parseInt(recordId as string) || 1,
          title: title,
        },
      })

      setFeedback({ type: 'success', message: `Email dispatched to ${email}. Delivery logged in Communication Center.` })
    } catch (err: any) {
      console.error('Failed to send email:', err)
      setFeedback({ type: 'error', message: 'Failed to dispatch email.' })
    } finally {
      setLoading(false)
    }
  }

  // SMS Send
  const handleSmsSend = async () => {
    if (!phone) {
      setFeedback({ type: 'error', message: 'Please provide a valid recipient phone number.' })
      return
    }

    try {
      setLoading(true)
      const linkSnippet = shareData?.share_url ? ` Link: ${window.location.origin}${shareData.share_url}` : ''
      const finalMsg = `${customMessage.slice(0, 120)}${linkSnippet}`

      await communicationApi.sendMessage({
        channel: 'SMS',
        message: finalMsg,
        recipients: [
          {
            recipient_type: 'STUDENT',
            name: name || 'Recipient',
            destination: phone,
          },
        ],
      })

      setFeedback({ type: 'success', message: `SMS queued for delivery via DLT header PRATHM.` })
    } catch (err: any) {
      console.error('Failed to send SMS:', err)
      setFeedback({ type: 'error', message: 'Failed to dispatch SMS.' })
    } finally {
      setLoading(false)
    }
  }

  // Native Browser Share (Mobile/Desktop Web Share API)
  const handleNativeShare = async () => {
    if (navigator.share && shareData?.share_url) {
      try {
        await navigator.share({
          title: title,
          text: customMessage,
          url: `${window.location.origin}${shareData.share_url}`,
        })
        setFeedback({ type: 'success', message: 'Shared via device native sharing.' })
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err)
        }
      }
    } else {
      handleCopyLink()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 leading-tight">
                Share Document & Send
              </h3>
              <p className="text-[11px] text-gray-500 truncate max-w-xs">{title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Channel Navigation Pills */}
        <div className="flex border-b border-gray-100 px-6 pt-3 gap-2 bg-white">
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'whatsapp'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'email'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email</span>
          </button>
          <button
            onClick={() => setActiveTab('sms')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'sms'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>SMS</span>
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'link'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>Secure Link</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-6 mt-3 p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <div className="flex-1">{feedback.message}</div>
            <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Recipient Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Recipient Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Student or Parent name"
                className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {activeTab === 'email' ? (
              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  Recipient Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="parent@example.com"
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
            )}
          </div>

          {/* Message Body */}
          {activeTab !== 'link' && (
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Message Body
              </label>
              <textarea
                rows={3}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none text-gray-800"
              />
            </div>
          )}

          {/* Secure Link Tab & Expiration Controls */}
          {activeTab === 'link' && (
            <div className="space-y-3.5">
              <div className="bg-slate-50 border border-gray-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Expiring Document Token Link</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleGenerateShareLink(true)}
                    disabled={loading}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    <span>Regenerate</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={
                      shareData?.share_url
                        ? `${window.location.origin}${shareData.share_url}`
                        : 'Generating secure access token...'
                    }
                    className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-gray-300 rounded-lg text-gray-700"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    disabled={!shareData?.share_url}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1 shadow-2xs flex-shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {shareData?.expires_at && (
                  <div className="text-[11px] text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span>
                      Expires on: {new Date(shareData.expires_at).toLocaleString()} (Auto-destructs)
                    </span>
                  </div>
                )}
              </div>

              {/* Expiry and PIN Protection Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Link Validity Period
                  </label>
                  <select
                    value={expiryHours}
                    onChange={(e) => setExpiryHours(parseInt(e.target.value) || 168)}
                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                  >
                    <option value={24}>24 Hours (1 Day)</option>
                    <option value={72}>72 Hours (3 Days)</option>
                    <option value={168}>7 Days (1 Week - Recommended)</option>
                    <option value={720}>30 Days (1 Month)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-medium text-gray-700">
                      PIN Protection
                    </label>
                    <input
                      type="checkbox"
                      id="pin_protect_toggle"
                      checked={isPinProtected}
                      onChange={(e) => setIsPinProtected(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                  </div>
                  <input
                    type="password"
                    disabled={!isPinProtected}
                    value={accessPin}
                    onChange={(e) => setAccessPin(e.target.value)}
                    placeholder="Enter 4-6 digit PIN"
                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg disabled:bg-gray-100 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Recipient verification security alert */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-[11px] text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Security & Privacy Verification:</span> Please ensure
              the recipient's identity and destination (phone/email) are verified before transmitting
              official academic or fee records.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
          {/* Quick Print & Download buttons */}
          <div className="flex items-center gap-2">
            {onPrint && (
              <button
                type="button"
                onClick={onPrint}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 rounded-lg transition-colors border border-gray-300 bg-white"
                title="Print Document"
              >
                <Printer className="w-4 h-4" />
              </button>
            )}
            {onDownload && (
              <button
                type="button"
                onClick={onDownload}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 rounded-lg transition-colors border border-gray-300 bg-white"
                title="Download PDF"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg flex items-center gap-1 shadow-2xs"
              >
                <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                <span>Share...</span>
              </button>
            )}
          </div>

          {/* Primary Action Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200/50 rounded-lg transition-colors"
            >
              Close
            </button>

            {activeTab === 'whatsapp' && (
              <button
                type="button"
                onClick={handleWhatsAppSend}
                disabled={loading}
                className="px-4 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Send WhatsApp</span>
              </button>
            )}

            {activeTab === 'email' && (
              <button
                type="button"
                onClick={handleEmailSend}
                disabled={loading}
                className="px-4 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 active:bg-blue-800 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Dispatch Email</span>
              </button>
            )}

            {activeTab === 'sms' && (
              <button
                type="button"
                onClick={handleSmsSend}
                disabled={loading}
                className="px-4 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Send SMS</span>
              </button>
            )}

            {activeTab === 'link' && (
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Secure Link</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Print & Share Branding Footer */}
        <div className="px-6 py-2 border-t border-slate-100 bg-slate-50/80">
          <PrintBrandingFooter className="pt-0 mt-0" fixedBottom={false} />
        </div>
      </div>
    </div>
  )
}

