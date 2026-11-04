/**
 * @file        Badge.tsx
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
 * @created     2026-11-03
 * @updated     2026-11-04
 *
 * @description Reusable status badge and pill components with unified semantic color themes.
 */

import type { FeeInvoice, FeeInstallment } from '../types'

interface BadgeProps {
  status: string
  label?: string
}

export function StatusBadge({ status, label }: BadgeProps) {
  const classes: Record<string, string> = {
    paid: 'badge-paid',
    partial: 'badge-partial',
    unpaid: 'badge-unpaid',
    overdue: 'badge-overdue',
    active: 'badge-active',
    reversed: 'badge-reversed',
    completed: 'badge-paid',
    failed: 'badge-unpaid',
    cancelled: 'badge-reversed',
    inactive: 'badge-unpaid',
    pending: 'badge-partial',
  }
  const labels: Record<string, string> = {
    paid: 'Paid',
    partial: 'Partial',
    unpaid: 'Unpaid',
    overdue: 'Overdue',
    active: 'Active',
    reversed: 'Reversed',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
    inactive: 'Inactive',
    pending: 'Pending',
  }
  const cls = classes[status] ?? 'badge-unpaid'
  return <span className={cls}>{label ?? labels[status] ?? status}</span>
}

export function InvoiceStatusBadge({ invoice, status }: { invoice?: FeeInvoice; status?: string }) {
  const st = status || invoice?.status || 'unpaid'
  return <StatusBadge status={st} label={st.toUpperCase()} />
}

export function InstallmentStatusBadge({ installment, status }: { installment?: FeeInstallment; status?: string }) {
  const st = status || installment?.status || 'unpaid'
  return <StatusBadge status={st} label={st.toUpperCase()} />
}
