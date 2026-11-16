/**
 * @file        Modal.test.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.test
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-16
 * @updated     2026-11-17
 *
 * @description Accessibility regression tests for the shared modal dialog.
 */

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Modal from '../components/Modal'

describe('shared modal dialog accessibility', () => {
  it('labels the dialog and contains keyboard focus', () => {
    render(
      <Modal open onClose={vi.fn()} title="Planning item">
        <button type="button">Save</button>
      </Modal>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Planning item' })
    const closeButton = screen.getByRole('button', { name: 'Close dialog' })
    const saveButton = screen.getByRole('button', { name: 'Save' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(document.activeElement).toBe(closeButton)

    saveButton.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(closeButton)
    closeButton.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(saveButton)
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(<Modal open onClose={onClose} title="Planning item">Details</Modal>)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })
})
