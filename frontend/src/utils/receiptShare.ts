/**
 * @file        receiptShare.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.utils
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-09
 * @updated     2026-11-09
 *
 * @description Direct file attachment sharing and secure fallback utility for fee receipt PDFs.
 */

import { paymentsApi } from '../api/endpoints'

export interface ShareReceiptResult {
  success: boolean
  shared: boolean
  downloaded: boolean
  filename: string
  message: string
}

export interface ShareNotification {
  type: 'success' | 'warning' | 'info' | 'error'
  title: string
  message: string
}

/**
 * Generates sanitized filename following strict convention:
 * StudentName_ReceiptNo.pdf (e.g. Aarav_Sharma_RCP-2026-0001.pdf)
 */
export function sanitizeReceiptFilename(studentName?: string, receiptNumber?: string): string {
  const cleanName = (studentName || 'Student')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '') || 'Student'
  const cleanRec = (receiptNumber || 'Receipt')
    .replace(/[^\w-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'Receipt'
  return `${cleanName}_${cleanRec}.pdf`
}

/**
 * Triggers native browser download for a Blob.
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const createObjectURL = window.URL?.createObjectURL || ((_b: Blob) => '')
  const revokeObjectURL = window.URL?.revokeObjectURL || ((_u: string) => {})
  const url = createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  setTimeout(() => {
    if (link.parentNode) {
      link.parentNode.removeChild(link)
    }
    revokeObjectURL(url)
  }, 400)
}

/**
 * Shares an actual PDF file attachment directly via Web Share API Level 2 (files support).
 * If unsupported, downloads the PDF file and provides explicit manual attachment instructions.
 * Strictly NEVER generates web URLs or cloud links.
 */
export async function shareOrDownloadReceiptPdf(
  receiptNumber: string,
  studentName?: string,
  onNotify?: (notification: ShareNotification) => void
): Promise<ShareReceiptResult> {
  const filename = sanitizeReceiptFilename(studentName, receiptNumber)

  try {
    const res = await paymentsApi.downloadReceiptPdf(receiptNumber)
    const blob = new Blob([res.data], { type: 'application/pdf' })

    // Check if navigator.share supports file sharing
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      const file = new File([blob], filename, { type: 'application/pdf' })
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Fee Receipt · ${receiptNumber}`,
            text: `Official Fee Payment Receipt for ${studentName || 'Student'} (${receiptNumber}).`,
          })
          const msg = `Receipt PDF (${filename}) shared directly via device share.`
          onNotify?.({
            type: 'success',
            title: 'Receipt Shared Directly',
            message: msg,
          })
          return {
            success: true,
            shared: true,
            downloaded: false,
            filename,
            message: msg,
          }
        } catch (err: any) {
          // If user aborted / cancelled share dialog, don't force fallback unless error
          if (err?.name === 'AbortError') {
            return {
              success: true,
              shared: false,
              downloaded: false,
              filename,
              message: 'Share dialog cancelled by user.',
            }
          }
          // Other share errors fall through to download fallback
        }
      }
    }

    // Direct browser file attachment sharing is unsupported on this platform:
    // Trigger download of actual PDF file and inform user with clear instructions
    triggerBlobDownload(blob, filename)
    const fallbackMsg = `Direct browser file attachment sharing is unsupported on this device. The PDF has been downloaded to your device as "${filename}". Please attach this file directly in WhatsApp or your email client.`
    onNotify?.({
      type: 'warning',
      title: 'Direct Share Fallback — File Downloaded',
      message: fallbackMsg,
    })

    return {
      success: true,
      shared: false,
      downloaded: true,
      filename,
      message: fallbackMsg,
    }
  } catch (err: any) {
    const errorMsg = err?.response?.data?.detail || err?.message || 'Failed to fetch receipt PDF from server.'
    onNotify?.({
      type: 'error',
      title: 'PDF Generation Failed',
      message: errorMsg,
    })
    return {
      success: false,
      shared: false,
      downloaded: false,
      filename,
      message: errorMsg,
    }
  }
}
