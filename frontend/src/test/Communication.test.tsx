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
 * @updated     2026-11-06
 *
 * @description Vitest test suite for Communication Center workspace, covering compose & send, templates catalogue, delivery logs, diagnostics, and automated outbound triggers.
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
      appName: 'PrathamOne EduOS',
      shortName: 'PA',
      institutionName: 'Prashant Academy',
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
    getAutomationRules: vi.fn(),
    updateAutomationRules: vi.fn(),
    previewFeeReminders: vi.fn(),
    dispatchFeeReminders: vi.fn(),
    dispatchAttendanceAlert: vi.fn(),
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

  const mockAutomationRules = {
    fee_reminders_enabled: true,
    fee_reminder_days_before: 5,
    fee_reminder_frequency_days: 7,
    attendance_alerts_enabled: true,
    receipt_auto_share_enabled: true,
    default_channel: 'WHATSAPP',
    institute_display_name: 'PrathamOne EduOS',
  }

  const mockFeeQueue = [
    {
      invoice_id: 501,
      invoice_number: 'INV-2026-001',
      student_id: 10,
      student_name: 'Rohan Sharma',
      admission_number: 'ADM-0010',
      guardian_name: 'Rajesh Sharma',
      guardian_relation: 'Father',
      phone: '+919811122233',
      pending_amount: 15000,
      total_amount: 35000,
      paid_amount: 20000,
      due_date: '2026-11-15',
      message: 'Dear Rajesh Sharma, pending fee balance is Rs. 15,000 for Rohan Sharma.',
      whatsapp_url: 'https://wa.me/919811122233?text=Dear%20Rajesh',
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
    vi.mocked(communicationApi.getAutomationRules).mockResolvedValue({ data: mockAutomationRules } as any)
    vi.mocked(communicationApi.previewFeeReminders).mockResolvedValue({
      data: { count: 1, min_balance: 500, queue: mockFeeQueue },
    } as any)
    vi.mocked(communicationApi.dispatchFeeReminders).mockResolvedValue({
      data: { status: 'success', message: 'Dispatched 1 fee reminder(s)', count: 1, results: [] },
    } as any)
  })

  it('renders the header and the five primary navigation tabs', async () => {
    render(<Communication />)

    expect(screen.getByText('Communication Center')).toBeDefined()
    expect(screen.getByRole('button', { name: /Compose & Send/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Templates/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Delivery History/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Diagnostics/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Automations & Queues/i })).toBeDefined()

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

  it('switches to Automations & Queues tab and displays automation rules and pending reminders queue', async () => {
    render(<Communication />)

    const automationTab = screen.getByRole('button', { name: /Automations & Queues/i })
    fireEvent.click(automationTab)

    await waitFor(() => {
      expect(communicationApi.getAutomationRules).toHaveBeenCalled()
      expect(communicationApi.previewFeeReminders).toHaveBeenCalled()
      expect(screen.getByText('Automated Outbound Rules & Real-Time Triggers')).toBeDefined()
      expect(screen.getByText('Pending Fee Reminder Dispatch Queue')).toBeDefined()
      expect(screen.getByText('Rohan Sharma')).toBeDefined()
      expect(screen.getByText('Rajesh Sharma')).toBeDefined()
      expect(screen.getByText('₹15,000.00')).toBeDefined()
    })
  })

  it('allows batch dispatching fee reminders from the automated queue', async () => {
    render(<Communication />)

    const automationTab = screen.getByRole('button', { name: /Automations & Queues/i })
    fireEvent.click(automationTab)

    await waitFor(() => {
      expect(screen.getByText('Rohan Sharma')).toBeDefined()
    })

    // Find and check the row checkbox
    const checkboxes = screen.getAllByRole('checkbox')
    // Select the second checkbox (first is header select all, second is item)
    fireEvent.click(checkboxes[checkboxes.length - 1])

    const dispatchBtn = screen.getByRole('button', { name: /Dispatch Reminders/i })
    fireEvent.click(dispatchBtn)

    await waitFor(() => {
      expect(communicationApi.dispatchFeeReminders).toHaveBeenCalled()
    })
  })
})
