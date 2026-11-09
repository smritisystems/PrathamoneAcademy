/**
 * @file        CommunicationDedicatedSubmenus.test.tsx
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
 * @created     2026-11-09
 * @updated     2026-11-09
 *
 * @description Comprehensive Vitest test suite validating all 8 dedicated submenus of the Communication Center, URL synchronization, Rule 010 View-First lock enforcement, and Training Mode isolation.
 */

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import CommunicationPage from '../pages/Communication'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { useEnvironmentStore } from '../store/environmentStore'

// Mock API endpoints
vi.mock('../api/endpoints', () => ({
  communicationApi: {
    getTemplates: vi.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'Monthly Tuition Fee Due',
          code: 'FEE_DUE_MONTHLY',
          category: 'FEE_REMINDER',
          channel: 'WHATSAPP',
          subject: 'Fee Due Notice',
          body: 'Dear {parent_name}, this is a reminder that fee of {amount} is pending for {student_name}.',
          is_system: true,
          created_at: '2026-11-01T10:00:00Z',
        },
        {
          id: 2,
          name: 'Absence Real-time Alert',
          code: 'STUDENT_ABSENT_ALERT',
          category: 'ATTENDANCE_ALERT',
          channel: 'WHATSAPP',
          subject: 'Attendance Alert',
          body: 'Dear Parent, {student_name} was marked absent today in {class_name}.',
          is_system: true,
          created_at: '2026-11-02T10:00:00Z',
        },
      ],
    }),
    getLogs: vi.fn().mockResolvedValue({
      data: {
        items: [
          {
            id: 101,
            channel: 'WHATSAPP',
            recipient_name: 'Pooja Nair',
            recipient_destination: '+919876543210',
            content: 'Dear Parent, Pooja was marked absent today.',
            status: 'DELIVERED',
            sender_name: 'System Automations',
            created_at: '2026-11-08T09:30:00Z',
          },
          {
            id: 102,
            channel: 'SMS',
            recipient_name: 'Rahul Sharma',
            recipient_destination: '+919123456789',
            content: 'Fee payment receipt generated.',
            status: 'SENT',
            sender_name: 'Accounts Desk',
            created_at: '2026-11-08T10:15:00Z',
          },
        ],
        total: 2,
        page: 1,
        limit: 25,
      },
    }),
    getDiagnostics: vi.fn().mockResolvedValue({
      data: {
        channels: {
          whatsapp: {
            name: 'WhatsApp Business Cloud API',
            status: 'OPERATIONAL',
            adapter: 'Meta Graph API v19.0',
            features: ['High Throughput', 'Template Messages', 'Read Receipts'],
          },
          email: {
            name: 'SMTP Email Gateway',
            status: 'OPERATIONAL',
            adapter: 'Mailgun SMTP Relay',
            features: ['DKIM Validated', 'SPF Protected', 'TLS 1.3'],
          },
          sms: {
            name: 'Telecom SMS DLT Gateway',
            status: 'OPERATIONAL',
            adapter: 'Jio / Airtel DLT Scrubbing',
            features: ['TRAI Compliant', 'Header Verified', 'Flash SMS'],
          },
        },
      },
    }),
    getAutomationRules: vi.fn().mockResolvedValue({
      data: {
        fee_reminders_enabled: true,
        fee_reminder_days_before: 5,
        fee_reminder_frequency_days: 7,
        attendance_alerts_enabled: true,
        receipt_auto_share_enabled: true,
        default_channel: 'WHATSAPP',
        institute_display_name: 'PrathamOne EduOS',
      },
    }),
    previewFeeReminders: vi.fn().mockResolvedValue({
      data: {
        queue: [
          {
            invoice_id: 501,
            invoice_number: 'INV-2026-001',
            student_name: 'Aarav Patel',
            admission_number: 'ADM-2026-101',
            guardian_name: 'Mukesh Patel',
            guardian_relation: 'Father',
            phone: '+919876543210',
            pending_amount: 4500,
            total_amount: 15000,
            due_date: '2026-11-15',
            message: 'Dear Mukesh Patel, fee of Rs 4,500 is due for Aarav Patel.',
            whatsapp_url: 'https://wa.me/919876543210?text=test',
          },
        ],
      },
    }),
    searchRecipients: vi.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          type: 'STUDENT',
          name: 'Aarav Patel',
          subtitle: 'Std 11 - Div A (Roll 101)',
          phone: '+919876543210',
          email: 'aarav@example.com',
        },
      ],
    }),
    sendMessage: vi.fn().mockResolvedValue({
      data: {
        status: 'success',
        dispatched_count: 1,
        whatsapp_links: [],
      },
    }),
    createTemplate: vi.fn().mockResolvedValue({
      data: { status: 'success', message: 'Template created' },
    }),
    updateTemplate: vi.fn().mockResolvedValue({
      data: { status: 'success', message: 'Template updated' },
    }),
    deleteTemplate: vi.fn().mockResolvedValue({
      data: { status: 'success', message: 'Template deleted' },
    }),
    retryLog: vi.fn().mockResolvedValue({
      data: { status: 'success', message: 'Retried successfully' },
    }),
    testChannel: vi.fn().mockResolvedValue({
      data: { status: 'success', channel: 'WHATSAPP', destination: '+919999999999', dispatch_status: 'DELIVERED' },
    }),
    updateAutomationRules: vi.fn().mockResolvedValue({
      data: { status: 'success', message: 'Rules updated' },
    }),
    dispatchFeeReminders: vi.fn().mockResolvedValue({
      data: { status: 'success', count: 1 },
    }),
  },
}))

describe('Communication Center Dedicated Submenus & Workspaces Suite', () => {
  beforeEach(() => {
    localStorage.clear()

    useAuthStore.setState({
      user: {
        id: 1,
        username: 'admin',
        email: 'admin@prashantacademy.edu.in',
        role: 'superadmin',
        first_name: 'Jawahar',
        last_name: 'Mallah',
      },
      token: 'fake-jwt-token',
      selectedInstitutionId: 1,
      selectedAcademicYearId: 1,
    })

    useEditModeStore.setState({
      scopes: {},
    })

    useEnvironmentStore.setState({
      isTrainingMode: false,
    })
  })

  const renderWithRouter = (initialPath = '/communication/overview') => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/communication" element={<CommunicationPage />} />
          <Route path="/communication/overview" element={<CommunicationPage />} />
          <Route path="/communication/broadcasts" element={<CommunicationPage />} />
          <Route path="/communication/compose" element={<CommunicationPage />} />
          <Route path="/communication/whatsapp" element={<CommunicationPage />} />
          <Route path="/communication/templates" element={<CommunicationPage />} />
          <Route path="/communication/history" element={<CommunicationPage />} />
          <Route path="/communication/automations" element={<CommunicationPage />} />
          <Route path="/communication/gateways" element={<CommunicationPage />} />
          <Route path="/communication/diagnostics" element={<CommunicationPage />} />
          <Route path="/communication/settings" element={<CommunicationPage />} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('1. Renders overview with all 8 dedicated submenus and KPI metrics', async () => {
    renderWithRouter('/communication/overview')

    expect(await screen.findByText('Communication Center')).toBeDefined()
    expect(screen.getByText('Multichannel Hub')).toBeDefined()

    // 8 Submenu navigation buttons
    expect(screen.getByRole('button', { name: /overview/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /broadcast composer/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /whatsapp stream/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /message templates/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /dispatch logs/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /reminder queues/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /gateway diagnostics/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /channel settings/i })).toBeDefined()

    // KPI Cards
    expect(screen.getByText('Total Dispatched')).toBeDefined()
    expect(screen.getByText('Delivery Rate')).toBeDefined()
    expect(screen.getByText('Active Gateways')).toBeDefined()
    expect(screen.getByText('Overdue Reminders')).toBeDefined()
    expect(screen.getByText('Saved Templates')).toBeDefined()
  })

  it('2. Navigates to Broadcast Composer workspace and displays channel selections', async () => {
    renderWithRouter('/communication/broadcasts')

    expect(await screen.findByText('Message Composer')).toBeDefined()
    expect(screen.getByText('Dispatch Channel')).toBeDefined()
    expect(screen.getByRole('button', { name: /^whatsapp$/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /^email$/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /^sms$/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /all channels/i })).toBeDefined()
    expect(screen.getByText('Recipient Selection')).toBeDefined()
  })

  it('3. Enforces Rule 010 View-First lock on message dispatch button in view mode', async () => {
    renderWithRouter('/communication/broadcasts')

    expect(await screen.findByText('Message Composer')).toBeDefined()
    expect(screen.getByText('Locked in View Mode')).toBeDefined()
    const lockedBtn = screen.getByTitle(/locked in view mode/i) as HTMLButtonElement
    expect(lockedBtn.disabled).toBe(true)
  })

  it('4. Unlocks message dispatch button when Edit Mode is active', async () => {
    act(() => {
      useEditModeStore.setState({
        scopes: { 'communication:broadcasts': true },
      })
    })

    renderWithRouter('/communication/broadcasts')

    expect(await screen.findByText('Message Composer')).toBeDefined()
    expect(screen.getByText(/dispatch to 0 recipient\(s\)/i)).toBeDefined()
  })

  it('5. Navigates to WhatsApp Stream workspace with direct launcher and mobile mockup', async () => {
    renderWithRouter('/communication/whatsapp')

    expect(await screen.findByText('Direct WhatsApp Chat Launcher')).toBeDefined()
    expect(screen.getByText('Destination WhatsApp Number')).toBeDefined()
    expect(screen.getByText('Custom WhatsApp Message')).toBeDefined()
    expect(screen.getByText('Live WhatsApp render preview simulation')).toBeDefined()
    expect(screen.getByText('Official Institute Account')).toBeDefined()
  })

  it('6. Navigates to Message Templates workspace with category filter and create button', async () => {
    renderWithRouter('/communication/templates')

    expect(await screen.findByText('Monthly Tuition Fee Due')).toBeDefined()
    expect(screen.getByText('Absence Real-time Alert')).toBeDefined()
    expect(screen.getByText('Create New Template')).toBeDefined()
    expect(screen.getByRole('combobox')).toBeDefined()
  })

  it('7. Navigates to Dispatch Logs workspace with historical audited items', async () => {
    renderWithRouter('/communication/history')

    expect(await screen.findByText('Pooja Nair')).toBeDefined()
    expect(screen.getByText('Rahul Sharma')).toBeDefined()
    expect(screen.getByText('+919876543210')).toBeDefined()
    expect(screen.getByText('+919123456789')).toBeDefined()
    expect(screen.getByText('DELIVERED')).toBeDefined()
    expect(screen.getByText('SENT')).toBeDefined()
  })

  it('8. Navigates to Reminder Queues workspace and shows overdue queue items', async () => {
    renderWithRouter('/communication/automations')

    expect(await screen.findByText('Pending Fee Reminder Dispatch Queue')).toBeDefined()
    expect(screen.getByText('Aarav Patel')).toBeDefined()
    expect(screen.getByText('ADM-2026-101')).toBeDefined()
    expect(screen.getByText('Mukesh Patel')).toBeDefined()
    expect(screen.getByText(/₹4,500/i)).toBeDefined()
    expect(screen.getByText('Overdue Fee Reminders')).toBeDefined()
    expect(screen.getAllByTitle(/locked in view mode/i).length).toBeGreaterThan(0)
  })

  it('9. Navigates to Gateway Diagnostics workspace with operational channels and ping tool', async () => {
    renderWithRouter('/communication/gateways')

    expect(await screen.findByText('Run Connection Test & Carrier Diagnostics Ping')).toBeDefined()
    expect(screen.getByText('WhatsApp Business Cloud API')).toBeDefined()
    expect(screen.getByText('SMTP Email Gateway')).toBeDefined()
    expect(screen.getByText('Telecom SMS DLT Gateway')).toBeDefined()
    expect(screen.getByText('Sub-second routing')).toBeDefined()
    expect(screen.getByText('TRAI compliance active')).toBeDefined()
  })

  it('10. Navigates to Channel Settings workspace with DLT, WhatsApp Cloud API, and quiet hours', async () => {
    renderWithRouter('/communication/settings')

    expect(await screen.findByText('Channel Configuration & Regulatory Policies')).toBeDefined()
    expect(screen.getByText('TRAI DLT Commercial Telecom Settings')).toBeDefined()
    expect(screen.getByText('WhatsApp Business Cloud API Credentials')).toBeDefined()
    expect(screen.getByText('Quiet Hours & Throttle Limits')).toBeDefined()
    expect(screen.getByText(/Digital Personal Data Protection/i)).toBeDefined()
    expect(screen.getByTitle(/locked in view mode/i)).toBeDefined()
  })

  it('11. Renders amber Training Mode indicator when training mode is active', async () => {
    act(() => {
      useEnvironmentStore.setState({
        isTrainingMode: true,
      })
    })

    renderWithRouter('/communication/overview')

    expect(await screen.findByText('TRAINING MODE ACTIVE')).toBeDefined()
    expect(screen.getByText(/sandbox mock mode without incurring carrier charges/i)).toBeDefined()
    expect(screen.getByText('Mock Gateway Sandbox')).toBeDefined()
  })

  it('12. Direct URL deep-link synchronization loads corresponding workspace tab', async () => {
    renderWithRouter('/communication/compose')

    expect(await screen.findByText('Message Composer')).toBeDefined()
    expect(screen.getByText('Recipient Selection')).toBeDefined()
  })
})
