/**
 * @file        Communication.test.tsx
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
 * @description Vitest test suite for Communication Center workspace, covering compose & send, templates catalogue, delivery logs, and gateway diagnostics.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Communication from '../pages/Communication'
import { communicationApi } from '../api/endpoints'

vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 1, role: 'admin', username: 'admin', first_name: 'System', last_name: 'Admin' },
    selectedInstitutionId: 1,
  }),
  isUserSysAdmin: () => true,
}))

vi.mock('../config/branding', () => ({
  useBranding: () => ({
    branding: {
      appName: 'PrathamOne Academy',
      shortName: 'PA',
      institutionName: 'PrathamOne Academy',
      supportPhone: '+91 98765 43210',
      supportEmail: 'info@prathamoneacademy.in',
    },
  }),
}))

vi.mock('../api/endpoints', () => ({
  communicationApi: {
    getTemplates: vi.fn(),
    getLogs: vi.fn(),
    getDiagnostics: vi.fn(),
    searchRecipients: vi.fn(),
    sendMessage: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    retryLog: vi.fn(),
    testChannel: vi.fn(),
  },
}))

describe('Communication Center Workspace', () => {
  const mockTemplates = [
    {
      id: 1,
      institution_id: 1,
      name: 'Fee Payment Receipt Notice',
      code: 'PAYMENT_RECEIPT',
      category: 'PAYMENT_RECEIPT',
      channel: 'ALL',
      subject: 'Official Fee Receipt - {{student_name}}',
      body: 'Dear {{parent_name}}, payment of Rs. {{amount_paid}} for {{student_name}} received.',
      is_system: true,
      is_active: true,
      placeholders: ['student_name', 'parent_name', 'amount_paid'],
      created_at: '2026-11-01T10:00:00Z',
      updated_at: '2026-11-01T10:00:00Z',
    },
  ]

  const mockLogs = [
    {
      id: 101,
      institution_id: 1,
      channel: 'WHATSAPP',
      recipient_type: 'PARENT',
      recipient_id: 20,
      recipient_name: 'Puneeta Kulkarni',
      recipient_destination: '+919876543210',
      subject: null,
      message_body: 'Dear Parent, payment of Rs. 7000 received.',
      status: 'SENT',
      error_message: null,
      provider_message_id: 'wa_mock_001',
      retry_count: 0,
      created_at: '2026-11-04T12:00:00Z',
      sent_at: '2026-11-04T12:00:01Z',
    },
  ]

  const mockDiagnostics = {
    status: 'HEALTHY',
    channels: {
      whatsapp: {
        name: 'WhatsApp Integration',
        adapter: 'WhatsApp Web Direct / Meta Cloud API',
        status: 'READY',
        features: ['Instant Direct Send', 'Template Messages', 'PDF Link Attachment'],
      },
      email: {
        name: 'Email (SMTP)',
        adapter: 'SMTP / SendGrid Adapter',
        status: 'READY',
        features: ['Rich HTML Invoices', 'Branded Footers', 'PDF Attachments'],
      },
      sms: {
        name: 'SMS Gateway',
        adapter: 'MSG91 / Fast2SMS Adapter',
        status: 'READY',
        features: ['DLT Principal Entity Header (PRATHM)', 'Transactional SMS Alerts'],
      },
    },
  }

  const mockRecipients = [
    {
      id: 20,
      type: 'STUDENT',
      name: 'Puneeta Kulkarni',
      subtitle: 'Class VIII - Batch A (Roll #12)',
      phone: '+919876543210',
      email: 'puneeta@example.com',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(communicationApi.getTemplates).mockResolvedValue({ data: mockTemplates } as any)
    vi.mocked(communicationApi.getLogs).mockResolvedValue({
      data: { items: mockLogs, total: 1, page: 1, limit: 25, total_pages: 1 },
    } as any)
    vi.mocked(communicationApi.getDiagnostics).mockResolvedValue({ data: mockDiagnostics } as any)
    vi.mocked(communicationApi.searchRecipients).mockResolvedValue({ data: mockRecipients } as any)
  })

  it('renders the header and the four primary navigation tabs', async () => {
    render(<Communication />)

    expect(screen.getByText('Communication Center')).toBeDefined()
    expect(screen.getByRole('button', { name: /Compose & Send/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Templates/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Delivery History/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Diagnostics/i })).toBeDefined()

    await waitFor(() => {
      expect(communicationApi.getTemplates).toHaveBeenCalled()
      expect(communicationApi.getDiagnostics).toHaveBeenCalled()
    })
  })

  it('inserts placeholder tokens into the compose message textarea', async () => {
    render(<Communication />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Type message text or select a template above/i)).toBeDefined()
    })

    const studentNameChip = screen.getByRole('button', { name: /\+?\{student_name\}/i })
    fireEvent.click(studentNameChip)

    const textarea = screen.getByPlaceholderText(/Type message text or select a template above/i) as HTMLTextAreaElement
    expect(textarea.value).toContain('{student_name}')
  })

  it('switches to Message Templates tab and renders pre-seeded templates', async () => {
    render(<Communication />)

    const templatesTab = screen.getByRole('button', { name: /Templates/i })
    fireEvent.click(templatesTab)

    await waitFor(() => {
      expect(screen.getByText('Fee Payment Receipt Notice')).toBeDefined()
      expect(screen.getByText('PAYMENT_RECEIPT')).toBeDefined()
    })
  })

  it('switches to Delivery History & Queue tab and displays logs', async () => {
    render(<Communication />)

    const historyTab = screen.getByRole('button', { name: /Delivery History/i })
    fireEvent.click(historyTab)

    await waitFor(() => {
      expect(screen.getByText('Puneeta Kulkarni')).toBeDefined()
      expect(screen.getByText('SENT')).toBeDefined()
      expect(screen.getByText('+919876543210')).toBeDefined()
    })
  })

  it('switches to Channels & Diagnostics tab and shows channel status cards', async () => {
    render(<Communication />)

    const diagTab = screen.getByRole('button', { name: /Diagnostics/i })
    fireEvent.click(diagTab)

    await waitFor(() => {
      expect(screen.getByText('WhatsApp Integration')).toBeDefined()
      expect(screen.getByText('Email (SMTP)')).toBeDefined()
      expect(screen.getByText('SMS Gateway')).toBeDefined()
    })
  })
})
