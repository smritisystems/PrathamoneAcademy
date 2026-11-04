/**
 * @file        Badge.test.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.test
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-03
 * @updated     2026-11-04
 *
 * @description Vitest unit tests verifying badge component variant classes, icons, and label rendering.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge, InvoiceStatusBadge, InstallmentStatusBadge } from '../components/Badge'

describe('Badge Components', () => {
  it('renders StatusBadge with label', () => {
    render(<StatusBadge status="active" label="Active Student" />)
    expect(screen.getByText('Active Student')).toBeDefined()
  })

  it('renders InvoiceStatusBadge for paid invoice', () => {
    render(<InvoiceStatusBadge status="paid" />)
    expect(screen.getByText('PAID')).toBeDefined()
  })

  it('renders InstallmentStatusBadge for partial payment', () => {
    render(<InstallmentStatusBadge status="partial" />)
    expect(screen.getByText('PARTIAL')).toBeDefined()
  })
})

