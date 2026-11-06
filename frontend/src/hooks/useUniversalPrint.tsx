/**
 * @file        useUniversalPrint.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.hooks
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
 * @description Hook providing universal print modal invocation and direct print execution.
 */

import React, { useState, useCallback } from 'react'
import type {
  DocumentType,
  PrintSettings,
} from '../types/printing'
import UniversalPrintModal, {
  UniversalPrintModalProps,
} from '../components/printing/UniversalPrintModal'

export interface OpenPrintModalOptions {
  targetElementId?: string
  targetElement?: HTMLElement | null
  documentType?: DocumentType
  documentTitle?: string
  initialSettings?: Partial<PrintSettings>
  onAfterPrint?: () => void
}

export function useUniversalPrint() {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [modalProps, setModalProps] = useState<OpenPrintModalOptions>({})

  const openPrint = useCallback((options: OpenPrintModalOptions = {}) => {
    setModalProps(options)
    setIsOpen(true)
  }, [])

  const closePrint = useCallback(() => {
    setIsOpen(false)
  }, [])

  /**
   * Helper component to render inside the invoking parent tree.
   */
  const PrintModal = useCallback(() => {
    if (!isOpen) return null

    return (
      <UniversalPrintModal
        isOpen={isOpen}
        onClose={closePrint}
        targetElementId={modalProps.targetElementId}
        targetElement={modalProps.targetElement}
        documentType={modalProps.documentType}
        documentTitle={modalProps.documentTitle}
        initialSettings={modalProps.initialSettings}
        onAfterPrint={() => {
          modalProps.onAfterPrint?.()
          closePrint()
        }}
      />
    )
  }, [isOpen, closePrint, modalProps])

  return {
    openPrint,
    closePrint,
    isPrintModalOpen: isOpen,
    PrintModal,
  }
}

