/**
 * @file        EduBoardWorkspace.test.tsx
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
 * @created     2026-11-12
 * @updated     2026-11-12
 *
 * @description Vitest test suite for PrathamOne EduBoard workspace, Konva/React-Konva canvas tools, View-First governance, 409 conflict UI, read-only Student view, and scoped IndexedDB crash recovery.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import EduBoardWorkspace from '../pages/EduBoardWorkspace'
import EduBoardCanvas from '../components/eduboard/EduBoardCanvas'
import {
  buildRecoveryScopeKey,
  saveRecoverySnapshot,
  loadRecoverySnapshot,
  clearAllRecoverySnapshots,
} from '../utils/eduboardRecovery'
import { eduboardApi } from '../api/endpoints'

// Mock Konva / React-Konva & PDF.js cleanly for jsdom execution
vi.mock('react-konva', () => ({
  Stage: ({ children, ...props }: any) => (
    <div data-testid="konva-stage" data-width={props.width} data-height={props.height}>
      {children}
    </div>
  ),
  Layer: ({ children }: any) => <div data-testid="konva-layer">{children}</div>,
  Group: ({ children }: any) => <div>{children}</div>,
  Rect: (props: any) => <div data-testid="konva-rect" data-fill={props.fill} />,
  Line: () => <div data-testid="konva-line" />,
  Arrow: () => <div data-testid="konva-arrow" />,
  Ellipse: () => <div data-testid="konva-ellipse" />,
  Text: (props: any) => <span>{props.text}</span>,
  Image: () => <div data-testid="konva-image" />,
  Transformer: () => null,
}))

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(),
}))

const {
  mockAuthState,
  mockDirtyScopes,
  mockSetDirty,
  mockEnableEdit,
  mockDisableEdit,
  mockIsDirty,
  mockResetAll,
  mockEnvState,
} = vi.hoisted(() => {
  const scopes: Record<string, boolean> = {}
  return {
    mockAuthState: {
      user: {
        id: 42,
        role: 'teacher',
        username: 'prof_sharma',
        first_name: 'Rakesh',
        last_name: 'Sharma',
        institution_id: 1,
        permissions: ['eduboard:view', 'eduboard:create', 'eduboard:edit', 'eduboard:publish'],
      },
    },
    mockDirtyScopes: {} as Record<string, boolean>,
    mockSetDirty: vi.fn(),
    mockEnableEdit: vi.fn((scope: string) => {
      scopes[scope] = true
      return { success: true }
    }),
    mockDisableEdit: vi.fn((scope: string) => {
      delete scopes[scope]
    }),
    mockIsDirty: vi.fn(() => false),
    mockResetAll: vi.fn(),
    mockEnvState: { dataEnvironment: 'PRODUCTION' },
  }
})

let mockEditScopes: Record<string, boolean> = {}

vi.mock('../store/authStore', () => ({
  useAuthStore: () => mockAuthState,
  isUserSysAdmin: () => false,
}))

vi.mock('../store/editModeStore', () => ({
  canActivateEditMode: () => ({ allowed: true }),
  useEditModeStore: (selector: any) =>
    selector({
      scopes: mockEditScopes,
      dirtyScopes: mockDirtyScopes,
      enableEditMode: mockEnableEdit,
      disableEditMode: mockDisableEdit,
      setDirty: mockSetDirty,
      isDirty: mockIsDirty,
      resetAll: mockResetAll,
    }),
}))

vi.mock('../store/environmentStore', () => ({
  useEnvironmentStore: (selector: any) => selector(mockEnvState),
}))

vi.mock('../api/endpoints', () => ({
  eduboardApi: {
    getContext: vi.fn(),
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    listBoards: vi.fn(),
    createBoard: vi.fn(),
    getBoard: vi.fn(),
    syncBoard: vi.fn(),
    publishBoard: vi.fn(),
    updateStatus: vi.fn(),
    deleteBoard: vi.fn(),
    getRevisions: vi.fn(),
    restoreRevision: vi.fn(),
    uploadAttachment: vi.fn(),
    fetchAttachmentBlob: vi.fn(),
    fetchRenderedPdfPageBlob: vi.fn(),
    exportBoardPdfBlob: vi.fn(),
    listStudentBoards: vi.fn(),
    getStudentBoardDetail: vi.fn(),
    getReportsSummary: vi.fn(),
  },
  helpApi: {
    contextual: vi.fn().mockRejectedValue(new Error('offline')),
  },
}))

const sampleBoard = {
  id: 101,
  board_code: 'EB-20261112-ABC123',
  institution_id: 1,
  is_demo: false,
  academic_year_id: 1,
  teaching_session_id: 55,
  session_code: 'TS-PHY-01',
  teacher_user_id: 42,
  teacher_name: 'Rakesh Sharma',
  standard_id: 1,
  division_id: 2,
  division_name: 'JEE Batch A',
  subject_id: 3,
  subject_name: 'Physics',
  title: 'Wave Optics Interference',
  topic: 'Young Double Slit',
  board_mode_default: 'classic' as const,
  status: 'draft' as const,
  is_template: false,
  collaboration_enabled: false,
  latest_revision_no: 2,
  page_count: 1,
  pages: [
    {
      id: 1,
      page_uid: 'pg_01',
      page_order: 1,
      title: 'Page 1',
      mode: 'classic' as const,
      background_style: 'blackboard' as const,
      scene_json: JSON.stringify({
        schemaVersion: 1,
        elements: [{ id: 't1', type: 'text', x: 50, y: 60, text: 'd sin(theta) = n lambda', color: '#ffffff' }],
      }),
      version: 1,
    },
  ],
  attachments: [],
}

describe('PrathamOne EduBoard Suite', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockEditScopes = {}
    await clearAllRecoverySnapshots()
    ;(eduboardApi.getContext as any).mockResolvedValue({
      data: { academic_years: [], divisions: [], subjects: [], teaching_sessions: [], templates: [] },
    })
    ;(eduboardApi.getSettings as any).mockResolvedValue({
      data: {
        max_file_size_mb: 25,
        allowed_extensions: ['pdf', 'png', 'jpg', 'jpeg', 'webp'],
        autosave_interval_ms: 3500,
        pptx_conversion_enabled: false,
        default_board_mode: 'whiteboard',
        notify_students_on_publish: true,
      },
    })
    ;(eduboardApi.listBoards as any).mockResolvedValue({ data: { items: [sampleBoard], total: 1 } })
    ;(eduboardApi.getBoard as any).mockResolvedValue({ data: sampleBoard })
  })

  it('scopes IndexedDB recovery strictly by institution, env, user, board, session and wipes on logout', async () => {
    const scopeA = { institutionId: 1, dataEnvironment: 'PRODUCTION', userId: 42, boardId: 101, teachingSessionId: 55 }
    const scopeOtherUser = { institutionId: 1, dataEnvironment: 'PRODUCTION', userId: 99, boardId: 101, teachingSessionId: 55 }
    const scopeTraining = { institutionId: 1, dataEnvironment: 'TRAINING', userId: 42, boardId: 101, teachingSessionId: 55 }

    expect(buildRecoveryScopeKey(scopeA)).not.toBe(buildRecoveryScopeKey(scopeOtherUser))
    expect(buildRecoveryScopeKey(scopeA)).not.toBe(buildRecoveryScopeKey(scopeTraining))

    await saveRecoverySnapshot(scopeA, {
      revisionNo: 2,
      title: 'Wave Optics',
      pages: sampleBoard.pages,
      dirty: true,
    })

    expect(await loadRecoverySnapshot(scopeA)).not.toBeNull()
    expect(await loadRecoverySnapshot(scopeOtherUser)).toBeNull()
    expect(await loadRecoverySnapshot(scopeTraining)).toBeNull()

    window.dispatchEvent(new CustomEvent('prashant-logout'))
    await waitFor(async () => {
      expect(await loadRecoverySnapshot(scopeA)).toBeNull()
    })
  })

  it('renders Student Read-Only canvas without mutable drawing tools', () => {
    render(<EduBoardCanvas page={sampleBoard.pages[0]} readOnly={true} />)
    expect(screen.getByText('Read-Only Student Lecture View')).toBeTruthy()
    expect(screen.queryByLabelText('Chalk')).toBeNull()
    expect(screen.queryByLabelText('Eraser')).toBeNull()
    expect(screen.getByText('d sin(theta) = n lambda')).toBeTruthy()
  })

  it('enforces Rule 010 View-First lock until Edit Mode is enabled and supports multi-page addition', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const firstRender = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/eduboard/101']}>
          <EduBoardWorkspace />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Wave Optics Interference' })).toBeTruthy()
    })

    // In default View Mode, Save & Publish & Add Page are disabled
    expect((screen.getByRole('button', { name: /Publish/i }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: /Add/i }) as HTMLButtonElement).disabled).toBe(true)

    firstRender.unmount()

    // Now render in active Edit Mode
    mockEditScopes['eduboard:workspace'] = true
    const qc2 = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc2}>
        <MemoryRouter initialEntries={['/eduboard/101']}>
          <EduBoardWorkspace />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect((screen.getByRole('button', { name: /Add/i }) as HTMLButtonElement).disabled).toBe(false)
    })

    fireEvent.click(screen.getByRole('button', { name: /Add/i }))

    await waitFor(() => {
      expect(screen.getByText('2. Page 2')).toBeTruthy()
    })
  })

  it('surfaces local crash recovery draft banner and resolves 409 conflict cleanly', async () => {
    mockEditScopes['eduboard:workspace'] = true
    await saveRecoverySnapshot(
      { institutionId: 1, dataEnvironment: 'PRODUCTION', userId: 42, boardId: 101, teachingSessionId: 55 },
      {
        revisionNo: 2,
        title: 'Wave Optics Interference',
        pages: [
          ...sampleBoard.pages,
          {
            page_uid: 'pg_recovered',
            page_order: 2,
            title: 'Recovered Slide',
            mode: 'whiteboard',
            background_style: 'grid',
            scene_json: JSON.stringify({ schemaVersion: 1, elements: [] }),
            version: 1,
          },
        ],
        dirty: true,
      },
    )

    ;(eduboardApi.syncBoard as any).mockRejectedValue({
      response: {
        status: 409,
        data: { detail: { code: 'REVISION_CONFLICT', latest_revision_no: 4, message: 'Modified elsewhere' } },
      },
    })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/eduboard/101']}>
          <EduBoardWorkspace />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Unsaved local classroom draft recovered/i)).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: /Restore Local Work/i }))
    await waitFor(() => {
      expect(screen.getByText('2. Recovered Slide')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }))
    await waitFor(() => {
      expect(screen.getByText(/Revision Conflict Detected \(409\)/i)).toBeTruthy()
    })
  })
})

