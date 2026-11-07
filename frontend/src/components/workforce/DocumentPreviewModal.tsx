/**
 * @file        DocumentPreviewModal.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.workforce
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-07
 * @updated     2026-11-07
 *
 * @description Official institutional document preview modal rendering dynamic staff documents with Universal Print integration.
 */

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Printer, XCircle, FileText, Loader2, AlertCircle } from 'lucide-react'
import { staffApi } from '../../api/endpoints'
import { useUniversalPrint } from '../printing'

interface DocumentPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  formId: string | null
  userId: number | null
  title?: string
}

export default function DocumentPreviewModal({
  isOpen,
  onClose,
  formId,
  userId,
  title,
}: DocumentPreviewModalProps) {
  const { openPrint, PrintModal } = useUniversalPrint()

  const { data: renderedDoc, isLoading, isError, error } = useQuery({
    queryKey: ['staff-document-render', formId, userId],
    queryFn: () => staffApi.renderDocument(formId!, { user_id: userId! }).then((r) => r.data),
    enabled: isOpen && !!formId && !!userId,
  })

  if (!isOpen) return null

  const handlePrint = () => {
    openPrint({
      targetElementId: 'doc-preview-print-content',
      documentType: (formId as any) || 'official_document',
      documentTitle: title || renderedDoc?.title || 'Official Staff Document',
      initialSettings: {
        paperSize: 'A4',
        orientation: 'portrait',
        confidentiality: 'Official Staff Document',
        documentId: renderedDoc?.reference_number || 'STF-DOC-001',
      },
    })
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 print:hidden">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {title || renderedDoc?.title || 'Official Document Preview'}
                </h3>
                <p className="text-xs text-slate-500">
                  Ref Code: {renderedDoc?.reference_number || 'STF-DOC-PREVIEW'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                disabled={isLoading || isError}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-100/60">
            {isLoading ? (
              <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                <p className="text-xs font-semibold text-slate-500">
                  Generating verified official document snapshot...
                </p>
              </div>
            ) : isError ? (
              <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-bold">Failed to load official document</p>
                  <p className="mt-0.5 text-rose-600">{(error as any)?.response?.data?.detail || (error as any)?.message || 'Unknown error'}</p>
                </div>
              </div>
            ) : (
              <div
                id="doc-preview-print-content"
                className="bg-white shadow-md rounded-xl p-8 border border-slate-200 max-w-3xl mx-auto overflow-hidden print:p-0 print:shadow-none print:border-none"
                dangerouslySetInnerHTML={{
                  __html: renderedDoc?.html_content || '<p className="p-8 text-center text-slate-400">No content generated.</p>',
                }}
              />
            )}
          </div>
        </div>
      </div>
      <PrintModal />
    </>
  )
}
