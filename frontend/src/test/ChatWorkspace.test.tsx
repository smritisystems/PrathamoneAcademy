/**
 * @file        ChatWorkspace.test.tsx
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
    getMentionableEntities: vi.fn(),
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

const MOCK_MENTION_ENTITIES = [
  {
    id: 'student_14',
    entity_type: 'STUDENT',
    entity_id: 14,
    title: 'Aarav Patel',
    subtitle: 'Adm #2026-014',
    badge: 'Student',
    badge_color: 'emerald',
    view_url: '/students/14',
    download_url: '/api/v1/students/14/id-card',
    chip_text: '@Aarav Patel (Adm #2026-014)',
  },
  {
    id: 'receipt_42',
    entity_type: 'RECEIPT',
    entity_id: 42,
    title: 'Receipt #REC-2026-0042',
    subtitle: '₹12,500 • Cash (2026-11-15)',
    badge: 'Fee Receipt',
    badge_color: 'blue',
    view_url: '/receipts/REC-2026-0042',
    download_url: '/api/v1/payments/receipts/REC-2026-0042/pdf',
    chip_text: '@REC-2026-0042 (₹12,500)',
  },
]

describe('Full Hybrid Chat & Academic Doubt Workspace Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(chatApi.getRooms).mockResolvedValue({ data: MOCK_ROOMS } as any)
    vi.mocked(chatApi.getMessages).mockResolvedValue({ data: MOCK_MESSAGES } as any)
    vi.mocked(chatApi.getMentionableEntities).mockResolvedValue({ data: MOCK_MENTION_ENTITIES } as any)
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

  it('opens mention popover when typing @ and allows record view or insert', async () => {
    render(
      <MemoryRouter>
        <ChatWorkspaceTab />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Type your message/i)).toBeTruthy()
    })

    const input = screen.getByPlaceholderText(/Type your message/i)
    fireEvent.change(input, { target: { value: '@Aarav' } })

    await waitFor(() => {
      expect(screen.getByText('Mention or Quick Access Record')).toBeTruthy()
      expect(screen.getByText('Aarav Patel')).toBeTruthy()
      expect(screen.getByText('Adm #2026-014')).toBeTruthy()
      expect(screen.getByText('Receipt #REC-2026-0042')).toBeTruthy()
    })

    // Test inserting entity
    const insertButtons = screen.getAllByText('Insert')
    fireEvent.click(insertButtons[0])

    // Popover should close
    await waitFor(() => {
      expect(screen.queryByText('Mention or Quick Access Record')).toBeNull()
    })
  })

  it('renders rich interactive entity card with View and Download buttons in chat messages', async () => {
    const messagesWithEntity = [
      {
        id: 103,
        room_id: 1,
        sender_user_id: 1,
        sender_display_name: 'Accountant Staff',
        sender_role: 'ADMIN',
        message_type: 'TEXT',
        content:
          'Please verify payment details [[entity:RECEIPT:42:Receipt%20%23REC-2026-0042:%E2%82%B912%2C500%20%E2%80%A2%20Cash:/receipts/REC-2026-0042:/api/v1/payments/receipts/REC-2026-0042/pdf]] issued today.',
        is_doubt_resolved: false,
        is_quarantined: false,
        created_at: '2026-11-16T09:15:00Z',
      },
    ]

    vi.mocked(chatApi.getMessages).mockResolvedValue({ data: messagesWithEntity } as any)

    render(
      <MemoryRouter>
        <ChatWorkspaceTab />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Please verify payment details/i)).toBeTruthy()
      expect(screen.getByText('Receipt #REC-2026-0042')).toBeTruthy()
      expect(screen.getByText('₹12,500 • Cash')).toBeTruthy()
      expect(screen.getByText('Download PDF')).toBeTruthy()
      expect(screen.getByText('View')).toBeTruthy()
    })
  })
})
