/**
 * @file        GlobalTableSort.test.tsx
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
 * @created     2026-11-10
 * @updated     2026-11-10
 *
 * @description Unit and integration tests for universal table sorting hook and components.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react'
import React from 'react'
import { useTableSort } from '../hooks/useTableSort'
import { SortableHeader } from '../components/common/SortableHeader'
import { TableSortSelect } from '../components/common/TableSortSelect'

interface SampleStudent {
  id: number
  admission_number: string
  name: string
  score: number
  dob: string
  parent?: {
    name: string
  }
}

const mockStudents: SampleStudent[] = [
  { id: 1, admission_number: 'ADM-10', name: 'Zoya Khan', score: 85, dob: '2008-05-12', parent: { name: 'Imran' } },
  { id: 2, admission_number: 'ADM-2', name: 'Aarav Sharma', score: 92, dob: '2009-01-20', parent: { name: 'Rajesh' } },
  { id: 3, admission_number: 'ADM-100', name: 'Bhavna Patel', score: 78, dob: '2007-11-04' }, // no parent
  { id: 4, admission_number: 'ADM-5', name: 'Aarav Gupta', score: 92, dob: '2008-09-15', parent: { name: 'Manoj' } },
]

describe('useTableSort Hook', () => {
  it('returns data in initial order when unsorted', () => {
    const { result } = renderHook(() => useTableSort(mockStudents))
    expect(result.current.sortKey).toBeNull()
    expect(result.current.sortDirection).toBeNull()
    expect(result.current.sortedData.map((s) => s.id)).toEqual([1, 2, 3, 4])
  })

  it('sorts strings ascending and descending with alphanumeric collation', () => {
    const { result } = renderHook(() => useTableSort(mockStudents))

    // Sort by admission_number asc: ADM-2, ADM-5, ADM-10, ADM-100
    act(() => {
      result.current.requestSort('admission_number')
    })
    expect(result.current.sortKey).toBe('admission_number')
    expect(result.current.sortDirection).toBe('asc')
    expect(result.current.sortedData.map((s) => s.admission_number)).toEqual([
      'ADM-2',
      'ADM-5',
      'ADM-10',
      'ADM-100',
    ])

    // Toggle to desc: ADM-100, ADM-10, ADM-5, ADM-2
    act(() => {
      result.current.requestSort('admission_number')
    })
    expect(result.current.sortDirection).toBe('desc')
    expect(result.current.sortedData.map((s) => s.admission_number)).toEqual([
      'ADM-100',
      'ADM-10',
      'ADM-5',
      'ADM-2',
    ])

    // Toggle again with triState=true resets to null
    act(() => {
      result.current.requestSort('admission_number')
    })
    expect(result.current.sortKey).toBeNull()
    expect(result.current.sortDirection).toBeNull()
    expect(result.current.sortedData.map((s) => s.id)).toEqual([1, 2, 3, 4])
  })

  it('sorts numeric fields correctly in asc and desc', () => {
    const { result } = renderHook(() =>
      useTableSort(mockStudents, { initialKey: 'score', initialDirection: 'asc', initialType: 'number' })
    )
    expect(result.current.sortedData.map((s) => s.score)).toEqual([78, 85, 92, 92])

    act(() => {
      result.current.requestSort('score', undefined, 'number')
    })
    expect(result.current.sortedData.map((s) => s.score)).toEqual([92, 92, 85, 78])
  })

  it('sorts dates correctly', () => {
    const { result } = renderHook(() => useTableSort(mockStudents))

    act(() => {
      result.current.requestSort('dob', undefined, 'date')
    })
    expect(result.current.sortedData.map((s) => s.dob)).toEqual([
      '2007-11-04',
      '2008-05-12',
      '2008-09-15',
      '2009-01-20',
    ])

    act(() => {
      result.current.requestSort('dob', undefined, 'date')
    })
    expect(result.current.sortedData.map((s) => s.dob)).toEqual([
      '2009-01-20',
      '2008-09-15',
      '2008-05-12',
      '2007-11-04',
    ])
  })

  it('handles nested properties and puts empty/undefined values at the bottom', () => {
    const { result } = renderHook(() => useTableSort(mockStudents))

    act(() => {
      result.current.requestSort('parent.name')
    })
    const parentsAsc = result.current.sortedData.map((s) => s.parent?.name)
    // Imran, Manoj, Rajesh, then undefined at the bottom
    expect(parentsAsc.slice(0, 3)).toEqual(['Imran', 'Manoj', 'Rajesh'])
    expect(parentsAsc[3]).toBeUndefined()
  })

  it('supports explicit setSort and clearSort', () => {
    const { result } = renderHook(() => useTableSort(mockStudents))

    act(() => {
      result.current.setSort('name', 'desc')
    })
    expect(result.current.sortKey).toBe('name')
    expect(result.current.sortDirection).toBe('desc')
    expect(result.current.sortedData[0].name).toBe('Zoya Khan')

    act(() => {
      result.current.clearSort()
    })
    expect(result.current.sortKey).toBeNull()
  })
})

describe('SortableHeader Component', () => {
  it('renders correctly and handles sort click', () => {
    const onSort = vi.fn()
    render(
      <table>
        <thead>
          <tr>
            <SortableHeader
              columnKey="student_name"
              label="Student Name"
              currentSortKey={null}
              currentDirection={null}
              onSort={onSort}
            />
          </tr>
        </thead>
      </table>
    )

    const button = screen.getByRole('button', { name: /student name/i })
    expect(button).toBeDefined()

    fireEvent.click(button)
    expect(onSort).toHaveBeenCalledWith('student_name', undefined, 'auto')
  })

  it('displays aria-sort and active indicators when sorted', () => {
    render(
      <table>
        <thead>
          <tr>
            <SortableHeader
              columnKey="score"
              label="Score"
              currentSortKey="score"
              currentDirection="desc"
              onSort={vi.fn()}
            />
          </tr>
        </thead>
      </table>
    )

    const th = screen.getByRole('columnheader')
    expect(th.getAttribute('aria-sort')).toBe('descending')
  })

  it('triggers sort on Enter key press', () => {
    const onSort = vi.fn()
    render(
      <table>
        <thead>
          <tr>
            <SortableHeader
              columnKey="admission_number"
              label="Admission #"
              currentSortKey="name"
              currentDirection="asc"
              onSort={onSort}
            />
          </tr>
        </thead>
      </table>
    )

    const button = screen.getByRole('button', { name: /admission #/i })
    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' })
    expect(onSort).toHaveBeenCalledWith('admission_number', undefined, 'auto')
  })
})

describe('TableSortSelect Component', () => {
  const options = [
    { key: 'name', label: 'Student Name' },
    { key: 'admission_number', label: 'Admission Number' },
    { key: 'score', label: 'Exam Score' },
  ]

  it('renders select with options and handles selection change', () => {
    const onSortChange = vi.fn()
    render(
      <TableSortSelect
        options={options}
        currentSortKey={null}
        currentDirection={null}
        onSortChange={onSortChange}
      />
    )

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'admission_number' } })
    expect(onSortChange).toHaveBeenCalledWith('admission_number', 'asc')
  })

  it('toggles direction between ASC and DESC', () => {
    const onSortChange = vi.fn()
    render(
      <TableSortSelect
        options={options}
        currentSortKey="name"
        currentDirection="asc"
        onSortChange={onSortChange}
      />
    )

    const toggleButton = screen.getByRole('button', { name: /asc/i })
    expect(toggleButton).toBeDefined()

    fireEvent.click(toggleButton)
    expect(onSortChange).toHaveBeenCalledWith('name', 'desc')
  })

  it('triggers onClear when clear button is clicked', () => {
    const onClear = vi.fn()
    render(
      <TableSortSelect
        options={options}
        currentSortKey="score"
        currentDirection="desc"
        onSortChange={vi.fn()}
        onClear={onClear}
      />
    )

    const clearButton = screen.getByTitle(/clear sorting/i)
    fireEvent.click(clearButton)
    expect(onClear).toHaveBeenCalled()
  })
})
