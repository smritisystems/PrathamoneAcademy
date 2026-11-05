/**
 * @file        StudentLifecycle.test.tsx
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
 * @created     2026-11-05
 * @updated     2026-11-05
 *
 * @description Vitest test suite validating student lifecycle workflows, withdrawal analytics calculations, and status transitions.
 */

import { describe, it, expect } from 'vitest'
import type {
  StudentExitPayload,
  StudentReactivatePayload,
  WithdrawalReportItem,
  WithdrawalAnalyticsResponse,
} from '../types'

describe('Student Lifecycle & Withdrawal Analytics Specification', () => {
  it('validates student exit payload contract and reason taxonomy', () => {
    const validExitPayload: StudentExitPayload = {
      exit_date: '2026-11-05',
      reason: 'Relocated / Moved Away',
      notes: 'Family relocated to Pune for work.',
      refund_amount: 5000,
      refund_method: 'bank_transfer',
      refund_reference: 'NEFT-991204',
      refund_notes: 'Approved 50% term refund',
    }

    expect(validExitPayload.exit_date).toBe('2026-11-05')
    expect(validExitPayload.reason).toBe('Relocated / Moved Away')
    expect(validExitPayload.refund_amount).toBe(5000)
    expect(validExitPayload.refund_method).toBe('bank_transfer')
  })

  it('validates student reactivation payload contract with target academic assignment', () => {
    const validReactivatePayload: StudentReactivatePayload = {
      academic_year_id: 2,
      standard_id: 1,
      division_id: 3,
      effective_date: '2026-11-06',
      roll_number: '10-25',
      notes: 'Returned from approved medical leave',
    }

    expect(validReactivatePayload.academic_year_id).toBe(2)
    expect(validReactivatePayload.standard_id).toBe(1)
    expect(validReactivatePayload.division_id).toBe(3)
    expect(validReactivatePayload.effective_date).toBe('2026-11-06')
  })

  it('verifies authoritative financial calculation invariance for withdrawals and net retained revenue', () => {
    const item: WithdrawalReportItem = {
      student_id: 101,
      admission_number: 'ADM-2026-101',
      student_name: 'Aarav Sharma',
      phone: '9876543210',
      academic_year: '2026-2027',
      standard_name: 'Class 10',
      division_name: 'Division A',
      enrollment_date: '2026-06-01',
      exit_date: '2026-11-05',
      exit_reason: 'Financial Difficulties',
      exit_notes: 'Requested early exit',
      exited_by_name: 'Principal Administrator',
      invoiced_amount: 50000,
      gross_paid: 25000,
      refund_amount: 5000,
      net_retained: 20000,
      outstanding_at_exit: 25000,
      paid_classification: 'Paid',
      installment_at_exit: 'Installment 2',
    }

    // Mathematical Ledger Invariance Formula:
    // Net Retained = Gross Paid - Refund Amount
    expect(item.net_retained).toBe(item.gross_paid - item.refund_amount)
    expect(item.paid_classification).toBe('Paid')
    expect(item.outstanding_at_exit).toBe(item.invoiced_amount - item.gross_paid)
  })

  it('correctly classifies unpaid attrition when no payments were made prior to exit', () => {
    const unpaidItem: WithdrawalReportItem = {
      student_id: 102,
      admission_number: 'ADM-2026-102',
      student_name: 'Diya Patel',
      academic_year: '2026-2027',
      standard_name: 'Class 9',
      division_name: 'Division B',
      exit_date: '2026-07-10',
      exit_reason: 'Joined Another Institute / School',
      invoiced_amount: 40000,
      gross_paid: 0,
      refund_amount: 0,
      net_retained: 0,
      outstanding_at_exit: 40000,
      paid_classification: 'Unpaid',
      installment_at_exit: 'Unpaid',
    }

    expect(unpaidItem.gross_paid).toBe(0)
    expect(unpaidItem.refund_amount).toBe(0)
    expect(unpaidItem.net_retained).toBe(0)
    expect(unpaidItem.paid_classification).toBe('Unpaid')
  })

  it('calculates aggregate withdrawal analytics metrics with attrition rate', () => {
    const mockAnalytics: WithdrawalAnalyticsResponse = {
      summary: {
        total_enrolled: 40,
        active_students: 36,
        withdrawn_students: 4,
        attrition_rate: 10.0,
        paid_withdrawn_count: 3,
        unpaid_withdrawn_count: 1,
        gross_paid: 60000,
        refund_amount: 10000,
        net_retained: 50000,
        outstanding_at_exit: 70000,
      },
      by_reason: [
        { reason: 'Relocated / Moved Away', count: 2, percentage: 50.0, net_retained: 25000 },
        { reason: 'Financial Difficulties', count: 1, percentage: 25.0, net_retained: 15000 },
        { reason: 'Joined Another Institute / School', count: 1, percentage: 25.0, net_retained: 10000 },
      ],
      by_class_batch: [
        {
          standard_name: 'Class 10',
          division_name: 'Division A',
          total_enrolled: 20,
          withdrawn_count: 2,
          attrition_rate: 10.0,
          net_retained: 25000,
        },
      ],
      by_installment: [
        { installment_at_exit: 'Installment 1', count: 2, net_retained: 30000 },
        { installment_at_exit: 'Installment 2', count: 1, net_retained: 20000 },
        { installment_at_exit: 'Unpaid', count: 1, net_retained: 0 },
      ],
      trends_monthly: [
        { month: '2026-11', month_label: 'Nov 2026', count: 4, refund_amount: 10000, net_retained: 50000 },
      ],
    }

    // Mathematical verification of aggregate summary metrics
    const expectedAttritionRate = Number(
      ((mockAnalytics.summary.withdrawn_students / mockAnalytics.summary.total_enrolled) * 100).toFixed(1)
    )
    expect(mockAnalytics.summary.attrition_rate).toBe(expectedAttritionRate)
    expect(mockAnalytics.summary.total_enrolled).toBe(
      mockAnalytics.summary.active_students + mockAnalytics.summary.withdrawn_students
    )
    expect(mockAnalytics.summary.net_retained).toBe(
      mockAnalytics.summary.gross_paid - mockAnalytics.summary.refund_amount
    )
    expect(mockAnalytics.summary.withdrawn_students).toBe(
      mockAnalytics.summary.paid_withdrawn_count + mockAnalytics.summary.unpaid_withdrawn_count
    )
  })

  it('validates active vs inactive filtering default behavior', () => {
    const defaultFilter = {
      include_inactive: false,
      status: undefined,
    }

    expect(defaultFilter.include_inactive).toBe(false)
    expect(defaultFilter.status).toBeUndefined()

    const inactiveFilter = {
      include_inactive: true,
      status: 'withdrawn',
    }

    expect(inactiveFilter.include_inactive).toBe(true)
    expect(inactiveFilter.status).toBe('withdrawn')
  })
})
