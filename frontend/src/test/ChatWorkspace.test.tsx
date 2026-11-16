/**
 * @file        ChatWorkspace.test.tsx
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
 * @created     2026-11-16
 * @updated     2026-11-16
 *
 * @description Frontend test suite for Full Hybrid Chat & Academic Doubt Resolution Workspace.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ChatWorkspaceTab } from '../components/communication/ChatWorkspaceTab'
import { chatApi } from '../api/endpoints'

vi.mock('../api/endpoints', () => ({
  chatApi: {
    getRooms: vi.fn(),
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
    resolveDoubt: vi.fn(),
    createRoom: vi.fn(),
  },
}))

vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 1, role: 'admin', username: 'admin', full_name: 'Super Admin' },
  }),
  isUserSysAdmin: () => true,
}))

const MOCK_ROOMS = [
  {
    id: 1,
    name: 'Staff General',
    code: 'staff_general',
    room_type: 'STAFF_GENERAL',
    description: 'All-staff coordination',
    is_curfew_enabled: false,
    is_curfew_active: false,
    user_room_role: 'MODERATOR',
    unresolved_doubts_count: 0,
  },
  {
    id: 2,
    name: 'Std 10 — Division A Doubts',
    code: 'batch_doubt_div_1',
    room_type: 'BATCH_DOUBT',
    description: 'Academic doubts for 10-A',
    is_curfew_enabled: true,
    curfew_start_time: '20:30',
    curfew_end_time: '08:00',
    is_curfew_active: false,
    user_room_role: 'TEACHER',
    unresolved_doubts_count: 1,
  },
]

const MOCK_MESSAGES = [
  {
    id: 101,
    room_id: 1,
    sender_user_id: 1,
    sender_display_name: 'Super Admin',
    sender_role: 'ADMIN',
    message_type: 'TEXT',
    content: 'Good morning staff, faculty meeting at 3 PM today.',
    is_doubt_resolved: false,
    is_quarantined: false,
    created_at: '2026-11-16T09:00:00Z',
  },
  {
    id: 102,
    room_id: 1,
    sender_user_id: 2,
    sender_display_name: 'Rohan Sharma',
    sender_role: 'STUDENT',
    message_type: 'DOUBT_QUESTION',
    content: 'Please explain the steps for solving quadratic equations via completing the square.',
    is_doubt_resolved: false,
    is_quarantined: false,
    created_at: '2026-11-16T09:05:00Z',
  },
]

describe('Full Hybrid Chat & Academic Doubt Workspace Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(chatApi.getRooms).mockResolvedValue({ data: MOCK_ROOMS } as any)
    vi.mocked(chatApi.getMessages).mockResolvedValue({ data: MOCK_MESSAGES } as any)
  })

  it('renders channels explorer and displays accessible rooms', async () => {
    render(
      <MemoryRouter>
        <ChatWorkspaceTab />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Communication Desks')).toBeTruthy()
      expect(screen.getAllByText('Staff General').length).toBeGreaterThan(0)
      expect(screen.getByText('Std 10 — Division A Doubts')).toBeTruthy()
    })
  })

  it('renders active message feed with roles and doubt question card', async () => {
    render(
      <MemoryRouter>
        <ChatWorkspaceTab />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Good morning staff, faculty meeting at 3 PM today.')).toBeTruthy()
      expect(screen.getByText('ACADEMIC DOUBT')).toBeTruthy()
      expect(screen.getByText(/quadratic equations/i)).toBeTruthy()
      expect(screen.getByText('Mark as Resolved')).toBeTruthy()
    })
  })

  it('allows teacher or admin to mark doubt as resolved', async () => {
    vi.mocked(chatApi.resolveDoubt).mockResolvedValue({
      data: { id: 102, is_doubt_resolved: true, resolved_at: '2026-11-16T09:10:00Z' },
    } as any)

    render(
      <MemoryRouter>
        <ChatWorkspaceTab />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Mark as Resolved')).toBeTruthy()
    })

    const resolveBtn = screen.getByText('Mark as Resolved')
    fireEvent.click(resolveBtn)

    await waitFor(() => {
      expect(chatApi.resolveDoubt).toHaveBeenCalledWith(102)
    })
  })
})
