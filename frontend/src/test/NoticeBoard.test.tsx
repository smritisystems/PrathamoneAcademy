/**
 * @file        NoticeBoard.test.tsx
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
 * @updated     2026-11-16
 *
 * @description Unit test suite for Notice Board management tab, cohort targeting, pinning, and Rule 010 View-First governance.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NoticeBoardTab } from '../components/communication/NoticeBoardTab'
import { communicationApi, standardsApi, divisionsApi } from '../api/endpoints'

vi.mock('../api/endpoints', () => ({
  communicationApi: {
    getNotices: vi.fn(),
    createNotice: vi.fn(),
    updateNotice: vi.fn(),
    togglePinNotice: vi.fn(),
    deleteNotice: vi.fn(),
  },
  standardsApi: {
    list: vi.fn(),
  },
  divisionsApi: {
    list: vi.fn(),
  },
}))

const mockNotices = [
  {
    id: 1,
    institution_id: 1,
    title: 'Term Examination Schedule Announced',
    content: 'Term 1 examinations will commence from next Monday.',
    category: 'examination',
    is_pinned: true,
    publish_date: '2026-11-10',
    created_at: '2026-11-10T10:00:00Z',
    standard_id: 1,
    division_id: null,
    standard_name: 'Standard 10',
    division_name: null,
    target_label: 'Standard 10',
  },
  {
    id: 2,
    institution_id: 1,
    title: 'Diwali Break Holidays Declaration',
    content: 'The academy will observe holidays from Oct 30 to Nov 5.',
    category: 'holiday',
    is_pinned: false,
    publish_date: '2026-11-05',
    created_at: '2026-11-05T09:00:00Z',
    standard_id: null,
    division_id: null,
    standard_name: null,
    division_name: null,
    target_label: 'All Academy Students (Global)',
  },
]

describe('Notice Board Management Suite', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    vi.mocked(communicationApi.getNotices).mockResolvedValue({
      data: { data: mockNotices, total: 2 },
    } as any)
    vi.mocked(standardsApi.list).mockResolvedValue({
      data: [{ id: 1, name: 'Standard 10' }],
    } as any)
    vi.mocked(divisionsApi.list).mockResolvedValue({
      data: [{ id: 1, name: 'A' }],
    } as any)
  })

  it('1. renders Notice Board workspace with overview stat cards and notices list', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <NoticeBoardTab isEditMode={false} />
      </QueryClientProvider>
    )

    expect(screen.getByTestId('notice-board-workspace')).toBeDefined()
    expect(screen.getByText('Digital Notice Board & Circulars Register')).toBeDefined()

    await waitFor(() => {
      expect(screen.getAllByText('Term Examination Schedule Announced').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Diwali Break Holidays Declaration').length).toBeGreaterThan(0)
    })

    expect(screen.getByText('Total Notices')).toBeDefined()
    expect(screen.getByText('Pinned Notices')).toBeDefined()
    expect(screen.getByText('Exam Circulars')).toBeDefined()
    expect(screen.getByText('Holiday Breaks')).toBeDefined()
  })

  it('2. enforces Rule 010 View-First safety lock on Post New Notice in View Mode', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <NoticeBoardTab isEditMode={false} />
      </QueryClientProvider>
    )

    const postBtn = screen.getByTestId('post-new-notice-btn')
    expect(postBtn).toBeDefined()
    expect(postBtn.className).toContain('cursor-not-allowed')
  })

  it('3. unlocks Post New Notice modal when Edit Mode is active', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <NoticeBoardTab isEditMode={true} />
      </QueryClientProvider>
    )

    const postBtn = screen.getByTestId('post-new-notice-btn')
    expect(postBtn.className).not.toContain('cursor-not-allowed')

    fireEvent.click(postBtn)

    await waitFor(() => {
      expect(screen.getByText('Post New Notice to Board')).toBeDefined()
      expect(screen.getByPlaceholderText(/e\.g\. Annual Term Examination Schedule Announced/i)).toBeDefined()
    })
  })

  it('4. calls togglePinNotice API when pin button is clicked in Edit Mode', async () => {
    vi.mocked(communicationApi.togglePinNotice).mockResolvedValue({
      data: { status: 'success', message: 'Notice pinned to top', is_pinned: true },
    } as any)

    render(
      <QueryClientProvider client={queryClient}>
        <NoticeBoardTab isEditMode={true} />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getAllByText('Term Examination Schedule Announced').length).toBeGreaterThan(0)
    })

    const pinBtn = screen.getByTestId('toggle-pin-btn-1')
    fireEvent.click(pinBtn)

    await waitFor(() => {
      expect(communicationApi.togglePinNotice).toHaveBeenCalledWith(1)
    })
  })

  it('5. filters notices by keyword search input', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <NoticeBoardTab isEditMode={false} />
      </QueryClientProvider>
    )

    const searchInput = screen.getByPlaceholderText(/Search notices by keyword or title/i)
    fireEvent.change(searchInput, { target: { value: 'Examination' } })

    await waitFor(() => {
      expect(communicationApi.getNotices).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Examination' })
      )
    })
  })
})
