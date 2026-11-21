/**
 * @file        FlexibleStudentMatrix.test.tsx
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
 * @created     2026-11-21
 * @updated     2026-11-21
 *
 * @description Unit tests for FlexibleFilterBuilder and FlexibleStudentCharts components.
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FlexibleFilterBuilder, { FilterRule, FieldDefinition } from '../components/reports/FlexibleFilterBuilder'
import FlexibleStudentCharts from '../components/reports/FlexibleStudentCharts'

describe('FlexibleFilterBuilder Component', () => {
  const mockFields: FieldDefinition[] = [
    { id: 'board_name', label: 'Board', type: 'text' },
    { id: 'standard_name', label: 'Standard', type: 'text' },
    { id: 'attendance_percentage', label: 'Attendance %', type: 'percentage' },
    { id: 'balance_fees', label: 'Outstanding Balance', type: 'currency' },
  ]

  it('renders filter builder toggle button with counts and preset triggers', () => {
    const handleAdd = vi.fn()
    const handleRemove = vi.fn()
    const handleClear = vi.fn()

    render(
      <FlexibleFilterBuilder
        fields={mockFields}
        rules={[]}
        onAddRule={handleAdd}
        onRemoveRule={handleRemove}
        onClearAll={handleClear}
        dataCount={25}
        totalCount={30}
      />
    )

    expect(screen.getByRole('button', { name: /Filter Builder/i })).toBeDefined()
    expect(screen.getByText(/Matching/i)).toBeDefined()
    expect(screen.getByText('25')).toBeDefined()
    expect(screen.getByText('30')).toBeDefined()
    expect(screen.getByRole('button', { name: /Attendance < 75%/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Outstanding > ₹0/i })).toBeDefined()
  })

  it('triggers quick preset filters correctly', () => {
    const handleAdd = vi.fn()
    render(
      <FlexibleFilterBuilder
        fields={mockFields}
        rules={[]}
        onAddRule={handleAdd}
        onRemoveRule={vi.fn()}
        onClearAll={vi.fn()}
        dataCount={10}
        totalCount={10}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Attendance < 75%/i }))
    expect(handleAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        fieldId: 'attendance_percentage',
        operator: 'less_than',
        value: 75,
      })
    )
  })

  it('displays active filter chips and allows removing them', () => {
    const activeRules: FilterRule[] = [
      { id: 'rule-1', fieldId: 'board_name', operator: 'equals', value: 'CBSE' },
      { id: 'rule-2', fieldId: 'attendance_percentage', operator: 'less_than', value: 75 },
    ]
    const handleRemove = vi.fn()

    render(
      <FlexibleFilterBuilder
        fields={mockFields}
        rules={activeRules}
        onAddRule={vi.fn()}
        onRemoveRule={handleRemove}
        onClearAll={vi.fn()}
        dataCount={5}
        totalCount={50}
      />
    )

    expect(screen.getByText('Active Rules:')).toBeDefined()
    expect(screen.getByText('CBSE')).toBeDefined()
    expect(screen.getByText('75')).toBeDefined()

    const removeButtons = screen.getAllByTitle('Remove rule')
    expect(removeButtons.length).toBe(2)
    fireEvent.click(removeButtons[0])
    expect(handleRemove).toHaveBeenCalledWith('rule-1')
  })
})

describe('FlexibleStudentCharts Component', () => {
  const sampleData = [
    {
      id: 1,
      student_name: 'Aarav Patel',
      board_name: 'CBSE',
      standard_name: '10th',
      division_name: 'Batch Alpha',
      attendance_percentage: 92.0,
      total_sessions: 50,
      total_fees: 30000,
      paid_fees: 30000,
      balance_fees: 0,
      exam_percentage: 88.5,
    },
    {
      id: 2,
      student_name: 'Pooja Nair',
      board_name: 'ICSE',
      standard_name: '10th',
      division_name: 'Batch Beta',
      attendance_percentage: 70.0,
      total_sessions: 50,
      total_fees: 35000,
      paid_fees: 20000,
      balance_fees: 15000,
      exam_percentage: 74.0,
    },
  ]

  it('computes and displays KPI cards accurately', () => {
    render(<FlexibleStudentCharts data={sampleData} />)

    expect(screen.getByText('Visual Insights & Analytical Charts')).toBeDefined()
    expect(screen.getByText('2')).toBeDefined() // Total students
    expect(screen.getByText('81%')).toBeDefined() // Avg attendance: (92 + 70)/2 = 81
    expect(screen.getByText('₹15,000')).toBeDefined() // Total outstanding
    expect(screen.getByText('1')).toBeDefined() // Defaulters (<75%)
  })

  it('allows collapsing and expanding the charts container', () => {
    render(<FlexibleStudentCharts data={sampleData} />)

    const toggleBtn = screen.getByRole('button', { name: /Collapse Charts/i })
    expect(toggleBtn).toBeDefined()

    fireEvent.click(toggleBtn)
    expect(screen.getByRole('button', { name: /Expand Charts/i })).toBeDefined()
  })
})
