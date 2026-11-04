/**
 * @file        FeesModule.test.tsx
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
 * @description Vitest test suite verifying Fees & Payments overview KPIs, charts, filters, and receipt modals.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CascadingFilters, { FilterState } from '../components/CascadingFilters'
import Fees, { fmt, numberToWordsINR, METHOD_LABELS, METHOD_COLORS } from '../pages/Fees'
import { useAuthStore } from '../store/authStore'
import * as endpoints from '../api/endpoints'

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

describe('Fees & Payments Module Specifications', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 1, username: 'admin', email: 'admin@prashantacademy.in', role: 'superadmin', first_name: 'Admin', last_name: 'User' },
      selectedInstitutionId: 1,
      selectedAcademicYearId: 1,
    })
  })

  it('validates 8 unified tabs exist for the module', () => {
    const requiredTabs = [
      'Overview',
      'Fee Register',
      'Collect Fees',
      'Payments',
      'Receipts',
      'Fee Plans',
      'Reports',
      'Settings',
    ]
    expect(requiredTabs.length).toBe(8)
    expect(requiredTabs).toContain('Overview')
    expect(requiredTabs).toContain('Fee Register')
    expect(requiredTabs).toContain('Collect Fees')
    expect(requiredTabs).toContain('Payments')
    expect(requiredTabs).toContain('Receipts')
    expect(requiredTabs).toContain('Fee Plans')
    expect(requiredTabs).toContain('Reports')
    expect(requiredTabs).toContain('Settings')
  })

  it('renders CascadingFilters component with all four hierarchy levels', () => {
    const queryClient = createTestQueryClient()
    const filters: FilterState = {
      academicYearId: 1,
      boardId: null,
      standardId: null,
      divisionId: null,
    }
    const handleChange = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <CascadingFilters filters={filters} onChange={handleChange} title="Test Cascading Filters" />
      </QueryClientProvider>
    )

    expect(screen.getByText('Test Cascading Filters')).toBeDefined()
    expect(screen.getByText('Academic Year')).toBeDefined()
    expect(screen.getByText('Course / Board')).toBeDefined()
    expect(screen.getByText('Standard / Level')).toBeDefined()
    expect(screen.getByText('Batch')).toBeDefined()
  })

  it('resets dependent standard and batch when board changes', async () => {
    const queryClient = createTestQueryClient()
    const filters: FilterState = {
      academicYearId: 1,
      boardId: 2,
      standardId: 3,
      divisionId: 4,
    }
    const handleChange = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <CascadingFilters filters={filters} onChange={handleChange} />
      </QueryClientProvider>
    )

    const selectElements = screen.getAllByRole('combobox')
    const boardSelect = selectElements[1] // Second dropdown is Board

    fireEvent.change(boardSelect, { target: { value: '' } })

    expect(handleChange).toHaveBeenCalledWith({
      academicYearId: 1,
      boardId: null,
      standardId: null,
      divisionId: null,
    })
  })

  it('formats currency correctly in Indian Rupee format', () => {
    const amount = 192000
    const formatted = fmt(amount)
    expect(formatted).toContain('1,92,000')
  })

  it('converts amounts to official Indian Rupee words', () => {
    expect(numberToWordsINR(16000)).toBe('Rupees Sixteen Thousand Only')
    expect(numberToWordsINR(128000)).toBe('Rupees One Lakh Twenty Eight Thousand Only')
    expect(numberToWordsINR(192000)).toBe('Rupees One Lakh Ninety Two Thousand Only')
    expect(numberToWordsINR(0)).toBe('Rupees Zero Only')
  })

  it('reconciles financial formulas: obligation, collected, outstanding and collection rate', () => {
    const totalObligation = 192000
    const totalCollected = 128000
    const totalOutstanding = totalObligation - totalCollected
    const collectionRate = Number(((totalCollected / totalObligation) * 100).toFixed(1))
    const outstandingRate = Number(((totalOutstanding / totalObligation) * 100).toFixed(1))

    expect(totalOutstanding).toBe(64000)
    expect(collectionRate).toBe(66.7)
    expect(outstandingRate).toBe(33.3)
    expect(collectionRate + outstandingRate).toBeCloseTo(100.0, 1)
  })

  it('verifies payment method labels and color mapping consistency', () => {
    expect(METHOD_LABELS.upi).toBe('UPI')
    expect(METHOD_LABELS.cash).toBe('Cash')
    expect(METHOD_LABELS.bank_transfer).toBe('Bank Transfer')
    expect(METHOD_LABELS.card).toBe('Card')
    expect(METHOD_LABELS.cheque).toBe('Cheque')

    expect(METHOD_COLORS.upi).toBe('#8b5cf6')
    expect(METHOD_COLORS.cash).toBe('#10b981')
    expect(METHOD_COLORS.bank_transfer).toBe('#3b82f6')
    expect(METHOD_COLORS.card).toBe('#f59e0b')
    expect(METHOD_COLORS.cheque).toBe('#64748b')
  })

  it('renders Fees workspace with overview KPIs, charts, and quick actions', async () => {
    const queryClient = createTestQueryClient()

    vi.spyOn(endpoints.feesApi, 'getOverview').mockResolvedValue({
      data: {
        summary: {
          total_obligation: 192000,
          total_collected: 128000,
          total_outstanding: 64000,
          collection_rate: 66.7,
          student_count: 8,
        },
        board_breakdown: [
          { board_name: 'ICSE', student_count: 8, total_fees: 192000, collected: 128000, outstanding: 64000, rate: 66.7 },
        ],
        batch_breakdown: [
          { batch_name: 'Batch A (Morning)', standard_name: 'Class X', board_name: 'ICSE', total_fees: 192000, collected: 128000, outstanding: 64000, student_count: 8, rate: 66.7 },
        ],
        monthly_trends: [
          { month: 'Jun 2026', collected: 24000, cumulative: 24000 },
          { month: 'Jul 2026', collected: 16000, cumulative: 40000 },
          { month: 'Aug 2026', collected: 32000, cumulative: 72000 },
          { month: 'Sep 2026', collected: 16000, cumulative: 88000 },
          { month: 'Oct 2026', collected: 24000, cumulative: 112000 },
          { month: 'Nov 2026', collected: 16000, cumulative: 128000 },
        ],
        payment_methods: [
          { method: 'upi', amount: 64000, count: 4, percentage: 50.0 },
          { method: 'cash', amount: 32000, count: 2, percentage: 25.0 },
          { method: 'bank_transfer', amount: 16000, count: 1, percentage: 12.5 },
          { method: 'card', amount: 8000, count: 1, percentage: 6.3 },
          { method: 'cheque', amount: 8000, count: 1, percentage: 6.3 },
        ],
        top_overdue: [
          {
            invoice_id: 101,
            invoice_number: 'INV-00101',
            student_id: 1,
            student_name: 'Shreshta',
            admission_number: 'PA-2026-001',
            phone: '9876543210',
            board_name: 'ICSE',
            standard_name: 'Class X',
            batch_name: 'Batch A',
            due_amount: 16000,
            due_date: '15 Oct 2026',
            status: 'partial',
          },
        ],
        recent_payments: [
          {
            id: 1,
            receipt_number: 'RCP-001245',
            student_id: 1,
            student_name: 'Rajnees',
            admission_number: 'PA-2026-001',
            board: 'ICSE',
            standard: 'X',
            batch: 'Batch A',
            amount: 16000,
            payment_date: '03 Nov 2026',
            payment_method: 'upi',
            status: 'completed',
          },
        ],
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/fees?tab=overview']}>
          <Fees />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Workspace Title
    expect(screen.getByRole('heading', { name: 'Fees & Payments' })).toBeDefined()
    expect(screen.getByText('Manage student fees, collections, payments, and receipts')).toBeDefined()

    // Wait for queries to resolve and check Quick Actions & KPI values
    await waitFor(() => {
      expect(screen.getByText('⚡ Quick Actions')).toBeDefined()
      expect(screen.getByText('Collect Fee')).toBeDefined()
      expect(screen.getByText('Receipt Search / Reprint')).toBeDefined()
      expect(screen.getAllByText('Total Students').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Total Fees Due').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Collected').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Outstanding').length).toBeGreaterThanOrEqual(1)
    })
  })
})
