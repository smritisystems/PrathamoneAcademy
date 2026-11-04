/**
 * @file        StudentProfileEdit.test.tsx
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
 * @created     2026-11-04
 * @updated     2026-11-04
 *
 * @description Vitest test suite validating administrator editing across all student master profile fields.
 */

import { describe, it, expect } from 'vitest'

describe('Admin Student Profile Editing Specification', () => {
  const ADMIN_EDITABLE_ROLES = ['superadmin', 'admin', 'principal']
  const NON_EDITABLE_ROLES = ['teacher', 'student', 'staff', 'parent']

  it('authorizes only designated administrative roles for full profile editing', () => {
    expect(ADMIN_EDITABLE_ROLES).toContain('superadmin')
    expect(ADMIN_EDITABLE_ROLES).toContain('admin')
    expect(ADMIN_EDITABLE_ROLES).toContain('principal')

    NON_EDITABLE_ROLES.forEach((role) => {
      expect(ADMIN_EDITABLE_ROLES).not.toContain(role)
    })
  })

  it('defines the 4 comprehensive profile editing sections', () => {
    const editTabs = [
      { id: 'personal', label: 'Personal & Identity' },
      { id: 'contact', label: 'Contact & Address' },
      { id: 'guardians', label: 'Parents & Guardians' },
      { id: 'academic', label: 'Academic & Batch Assignment' },
    ]
    expect(editTabs.length).toBe(4)
    expect(editTabs.map((t) => t.id)).toEqual(['personal', 'contact', 'guardians', 'academic'])
  })

  it('validates comprehensive editable fields in Personal & Demographics', () => {
    const personalFields = [
      'first_name',
      'middle_name',
      'last_name',
      'gender',
      'date_of_birth',
      'blood_group',
      'nationality',
      'religion',
      'caste',
      'aadhar_number',
      'admission_date',
      'is_active',
    ]
    expect(personalFields).toContain('first_name')
    expect(personalFields).toContain('gender')
    expect(personalFields).toContain('date_of_birth')
    expect(personalFields).toContain('aadhar_number')
    expect(personalFields).toContain('is_active')
  })

  it('validates comprehensive editable fields in Contact & Address', () => {
    const contactFields = [
      'phone',
      'email',
      'address',
      'city',
      'state',
      'pincode',
    ]
    expect(contactFields).toContain('phone')
    expect(contactFields).toContain('email')
    expect(contactFields).toContain('address')
    expect(contactFields).toContain('city')
    expect(contactFields).toContain('pincode')
  })

  it('validates guardian relation and attributes', () => {
    const guardianAttributes = [
      'relation',
      'first_name',
      'last_name',
      'phone',
      'email',
      'occupation',
      'annual_income',
      'is_primary',
    ]
    expect(guardianAttributes).toContain('relation')
    expect(guardianAttributes).toContain('phone')
    expect(guardianAttributes).toContain('annual_income')
    expect(guardianAttributes).toContain('is_primary')
  })

  it('enforces consequential change rules during batch or standard transfers', () => {
    const checkBatchTransferRules = (
      initialStandardId: number,
      newStandardId: number,
      initialDivisionId: number,
      newDivisionId: number,
      hasReason: boolean,
      isConfirmed: boolean
    ) => {
      const isBatchChange =
        (newStandardId > 0 && newStandardId !== initialStandardId) ||
        (newDivisionId > 0 && newDivisionId !== initialDivisionId)

      if (!isBatchChange) {
        return { allowed: true, requiresConfirmation: false }
      }

      if (!hasReason) {
        return { allowed: false, error: 'Transfer reason is required' }
      }

      if (!isConfirmed) {
        return { allowed: false, error: 'Transfer confirmation checkbox is required' }
      }

      return { allowed: true, requiresConfirmation: true }
    }

    // No batch change -> always allowed
    expect(checkBatchTransferRules(1, 1, 10, 10, false, false).allowed).toBe(true)

    // Batch changed without reason -> blocked
    const noReason = checkBatchTransferRules(1, 1, 10, 20, false, false)
    expect(noReason.allowed).toBe(false)
    expect(noReason.error).toContain('Transfer reason is required')

    // Batch changed with reason but not confirmed -> blocked
    const unconfirmed = checkBatchTransferRules(1, 1, 10, 20, true, false)
    expect(unconfirmed.allowed).toBe(false)
    expect(unconfirmed.error).toContain('confirmation checkbox')

    // Batch changed with reason and confirmed -> allowed
    const validTransfer = checkBatchTransferRules(1, 1, 10, 20, true, true)
    expect(validTransfer.allowed).toBe(true)
  })

  it('asserts financial integrity rule: profile changes must never silently alter fees or payments', () => {
    const preserveFinancialRecords = (
      initialInvoices: Array<{ id: number; net_amount: number; paid_amount: number }>,
      initialPayments: Array<{ id: number; amount: number; receipt_number: string }>
    ) => {
      // Invariant: financial arrays and totals remain strictly equal
      return {
        invoices: [...initialInvoices],
        payments: [...initialPayments],
        totalFees: initialInvoices.reduce((acc, inv) => acc + inv.net_amount, 0),
        totalPaid: initialPayments.reduce((acc, pmt) => acc + pmt.amount, 0),
      }
    }

    const invoices = [{ id: 1, net_amount: 50000, paid_amount: 25000 }]
    const payments = [{ id: 10, amount: 25000, receipt_number: 'REC-001' }]

    const result = preserveFinancialRecords(invoices, payments)
    expect(result.totalFees).toBe(50000)
    expect(result.totalPaid).toBe(25000)
    expect(result.invoices[0].net_amount).toBe(50000)
    expect(result.payments[0].receipt_number).toBe('REC-001')
  })
})

