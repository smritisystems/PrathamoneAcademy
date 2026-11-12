/**
 * @file        EduBoardDisplayAndPopout.test.tsx
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
 * @description Vitest test suite for EduBoard Standard/Focus/Fullscreen modes, collapsible panels & drawers, Greenboard/Blackboard chalk palette & toolbar states, scoped Pop-Out launcher (6 modes + popup-blocker fallback), detached EduBoardWindowPage sync/read-only enforcement, and display preference inheritance.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import EduBoardWorkspace from '../pages/EduBoardWorkspace'
import EduBoardCanvas from '../components/eduboard/EduBoardCanvas'
import EduBoardPopoutMenu from '../components/eduboard/EduBoardPopoutMenu'
import EduBoardWindowPage from '../pages/EduBoardWindowPage'
import { useEduBoardDisplayStore } from '../store/eduboardDisplayStore'
import { clearAllRecoverySnapshots } from '../utils/eduboardRecovery'
import { eduboardApi } from '../api/endpoints'

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

const { mockEditState } = vi.hoisted(() => ({
  mockEditState: {
    scopes: { eduboard: true } as Record<string, boolean>,
    dirtyScopes: {} as Record<string, boolean>,
    enableEditMode: vi.fn(() => ({ success: true })),
    disableEditMode: vi.fn(),
    setDirty: vi.fn(),
    isDirty: vi.fn(() => false),
    resetAll: vi.fn(),
  },
}))

vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({
    user: {
      id: 10,
      role: 'teacher',
      username: 'prof_desai',
      first_name: 'Rahul',
      last_name: 'Desai',
      institution_id: 1,
      permissions: ['eduboard:view', 'eduboard:create', 'eduboard:edit', 'eduboard:publish', 'eduboard:collaborate'],
    },
  }),
  isUserSysAdmin: () => false,
}))

vi.mock('../store/environmentStore', () => ({
  useEnvironmentStore: (selector: any) => selector({ dataEnvironment: 'PRODUCTION' }),
}))

vi.mock('../store/editModeStore', () => ({
  canActivateEditMode: () => ({ allowed: true }),
  useEditModeStore: (selector: any) => selector(mockEditState),
}))

vi.mock('../api/endpoints', () => ({
  eduboardApi: {
    getContext: vi.fn(),
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    getPreferences: vi.fn(),
    updatePreferences: vi.fn(),
    resetPreferences: vi.fn(),
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
    createPopoutSession: vi.fn(),
    resolvePopoutSession: vi.fn(),
    getWsTicket: vi.fn(),
  },
  helpApi: {
    contextual: vi.fn().mockRejectedValue(new Error('offline')),
  },
}))

const sampleBoard = {
  id: 501,
  board_code: 'EB-20261112-501',
  institution_id: 1,
  is_demo: false,
  academic_year_id: 1,
  teaching_session_id: 11,
  session_code: 'TS-011',
  teacher_user_id: 10,
  teacher_name: 'Rahul Desai',
  standard_id: 1,
  division_id: 1,
  division_name: 'Batch A',
  subject_id: 1,
  subject_name: 'Physics',
  title: 'Wave Optics Lecture',
  topic: 'Interference',
  board_mode_default: 'classic' as const,
  status: 'draft' as const,
  is_template: false,
  collaboration_enabled: true,
  latest_revision_no: 1,
  page_count: 1,
  pages: [
    {
      id: 1,
      page_uid: 'pg_main_1',
      page_order: 1,
      title: 'Page 1',
      mode: 'classic' as const,
      background_style: 'greenboard' as const,
      scene_json: JSON.stringify({ schemaVersion: 1, elements: [] }),
      version: 1,
    },
  ],
  attachments: [],
}

function renderWithQuery(ui: React.ReactElement, route = '/eduboard') {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('EduBoard Display Modes, Greenboard & Pop-Out Sync Suite', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await clearAllRecoverySnapshots()
    useEduBoardDisplayStore.getState().applyResolvedPreferences({
      default_workspace_mode: 'standard',
      default_board_appearance: 'greenboard',
      toolbar_state: 'expanded',
      toolbar_position: 'top',
      pages_panel_open: true,
      saved_boards_panel_open: true,
      hide_app_header: false,
      hide_status_bar: false,
    })
    useEduBoardDisplayStore.getState().setActiveTool('pen')
    useEduBoardDisplayStore.getState().setActiveColor('#111827')

    vi.mocked(eduboardApi.getContext).mockResolvedValue({
      data: {
        academic_years: [],
        divisions: [],
        subjects: [],
        teaching_sessions: [
          {
            id: 11,
            session_code: 'TS-011',
            session_date: '2026-11-12',
            topic_taught: 'Wave Optics',
            academic_year_id: 1,
            standard_id: 1,
            division_id: 1,
            division_name: 'Batch A',
            subject_id: 1,
            subject_name: 'Physics',
          },
        ],
        templates: [],
      },
    } as any)

    vi.mocked(eduboardApi.getSettings).mockResolvedValue({
      data: {
        max_file_size_mb: 25,
        allowed_extensions: ['pdf', 'png', 'jpg', 'jpeg', 'webp'],
        autosave_interval_ms: 10000,
        pptx_conversion_enabled: false,
        default_board_mode: 'classic',
        notify_students_on_publish: true,
        default_workspace_mode: 'standard',
        default_board_appearance: 'greenboard',
        toolbar_state: 'expanded',
        toolbar_position: 'top',
        allow_user_display_overrides: true,
        allow_collaborator_mode: true,
        allow_popout_window: true,
      },
    } as any)

    vi.mocked(eduboardApi.getPreferences).mockResolvedValue({
      data: {
        effective: {
          default_workspace_mode: 'standard',
          default_board_appearance: 'greenboard',
          toolbar_state: 'expanded',
          toolbar_position: 'top',
          pages_panel_open: true,
          saved_boards_panel_open: true,
          sidebar_collapsed: false,
          hide_app_header: false,
          hide_status_bar: false,
        },
        institution_defaults: {
          default_workspace_mode: 'standard',
          default_board_appearance: 'greenboard',
          toolbar_state: 'expanded',
          toolbar_position: 'top',
          pages_panel_open: true,
          saved_boards_panel_open: true,
          sidebar_collapsed: false,
          hide_app_header: false,
          hide_status_bar: false,
        },
        user_overrides: {},
        locked_by_institution: false,
        allow_collaborator_mode: true,
        allow_popout_window: true,
      },
    } as any)

    vi.mocked(eduboardApi.listBoards).mockResolvedValue({
      data: { items: [sampleBoard], total: 1 },
    } as any)
    vi.mocked(eduboardApi.getBoard).mockResolvedValue({ data: sampleBoard } as any)
    vi.mocked(eduboardApi.getRevisions).mockResolvedValue({ data: [] } as any)
    vi.mocked(eduboardApi.getWsTicket).mockResolvedValue({
      data: { ws_token: 'ws_tok_123', room_id: 'eduboard:1:PROD:501' },
    } as any)
  })

  it('switches Greenboard/Blackboard surface with chalk auto-contrast and collapsible toolbar states', () => {
    const onModeBg = vi.fn()
    render(
      <EduBoardCanvas
        page={{
          page_uid: 'pg_c1',
          page_order: 1,
          title: 'Chalk Page',
          mode: 'classic',
          background_style: 'white',
          scene_json: JSON.stringify({ schemaVersion: 1, elements: [] }),
          version: 1,
        }}
        onSceneChange={vi.fn()}
        onModeOrBackgroundChange={onModeBg}
      />,
    )

    const bgSelect = screen.getByLabelText('Board Surface Appearance') as HTMLSelectElement
    fireEvent.change(bgSelect, { target: { value: 'greenboard' } })
    expect(onModeBg).toHaveBeenCalledWith('classic', 'greenboard')

    const tb = screen.getByTestId('eduboard-toolbar')
    expect(tb.getAttribute('data-toolbar-state')).toBe('expanded')
    fireEvent.click(screen.getByLabelText('Compact Toolbar'))
    expect(screen.getByTestId('eduboard-toolbar').getAttribute('data-toolbar-state')).toBe('compact')

    fireEvent.click(screen.getByLabelText('Hide Toolbar'))
    expect(screen.getByRole('button', { name: /Show Tools/i })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Show Tools/i }))
    expect(screen.getByTestId('eduboard-toolbar').getAttribute('data-toolbar-state')).toBe('compact')
    fireEvent.click(screen.getByLabelText('Expand Toolbar'))
    expect(screen.getByTestId('eduboard-toolbar').getAttribute('data-toolbar-state')).toBe('expanded')

    fireEvent.click(screen.getByLabelText('Toolbar Position'))
    fireEvent.click(screen.getByText('Dock Left'))
    expect(screen.getByTestId('eduboard-toolbar').getAttribute('data-toolbar-position')).toBe('left')
  })

  it('preserves active tool when switching Standard -> Focus -> Exit Focus and collapses Pages panel', async () => {
    renderWithQuery(<EduBoardWorkspace />)
    await waitFor(() => expect(screen.getByLabelText('Collapse Pages Panel')).toBeTruthy())

    useEduBoardDisplayStore.getState().setActiveTool('chalk')
    useEduBoardDisplayStore.getState().setActiveColor('#fde047')

    fireEvent.click(screen.getByLabelText('Collapse Pages Panel'))
    await waitFor(() => expect(screen.getByRole('button', { name: /Show Pages/i })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Show Pages/i }))

    fireEvent.click(screen.getByTitle(/Focus Mode/i))
    await waitFor(() => expect(screen.getByRole('button', { name: /Exit Focus/i })).toBeTruthy())
    expect(useEduBoardDisplayStore.getState().activeTool).toBe('chalk')
    expect(useEduBoardDisplayStore.getState().activeColor).toBe('#fde047')

    fireEvent.click(screen.getByRole('button', { name: /Exit Focus/i }))
    await waitFor(() => expect(useEduBoardDisplayStore.getState().workspaceMode).toBe('standard'))
  })

  it('renders all 6 Pop Out actions, creates scoped session, and handles popup blocker fallback', async () => {
    const blockedCb = vi.fn()
    const launchedCb = vi.fn()
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
    vi.mocked(eduboardApi.createPopoutSession).mockResolvedValue({
      data: {
        launch_token: 'scoped_launch_tok',
        launch_url: '/eduboard/window?launch=scoped_launch_tok',
        effective_mode: 'teacher_edit',
        expires_in_seconds: 900,
      },
    } as any)

    render(
      <EduBoardPopoutMenu
        boardId={501}
        canEdit={true}
        canCollaborate={true}
        allowCollaboratorPolicy={true}
        allowPopoutPolicy={true}
        collaborationEnabled={true}
        onLaunchBlockedFallback={blockedCb}
        onError={vi.fn()}
        onLaunched={launchedCb}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Pop Out/i }))
    expect(screen.getByText('Pop Out Current Board')).toBeTruthy()
    expect(screen.getByText('Open Greenboard in New Tab')).toBeTruthy()
    expect(screen.getByText('Open Blackboard in New Tab')).toBeTruthy()
    expect(screen.getByText('Open Whiteboard in New Tab')).toBeTruthy()
    expect(screen.getByText('Open Presentation / Projector View')).toBeTruthy()
    expect(screen.getByText('Open Detached Teaching Board with Compact Tools')).toBeTruthy()

    fireEvent.click(screen.getByText('Open Greenboard in New Tab'))
    await waitFor(() => {
      expect(eduboardApi.createPopoutSession).toHaveBeenCalledWith(501, {
        launch_mode: 'teacher_edit',
        surface: 'greenboard',
        compact_tools: true,
        show_branding: true,
        hide_toolbar: false,
      })
      expect(openSpy).toHaveBeenCalled()
      expect(blockedCb).toHaveBeenCalledWith('/eduboard/window?launch=scoped_launch_tok', 'Open Greenboard in New Tab')
      expect(launchedCb).toHaveBeenCalledWith('teacher_edit')
    })
    openSpy.mockRestore()
  })

  it('renders detached EduBoardWindowPage in Read-Only Presentation mode without editing toolbar', async () => {
    vi.mocked(eduboardApi.resolvePopoutSession).mockResolvedValue({
      data: {
        board: sampleBoard,
        effective_mode: 'presentation',
        permissions: { can_edit: false, can_export: false },
        institution_name: 'Prashant Academy',
        teacher_name: 'Rahul Desai',
        ui_config: {
          surface: 'greenboard',
          compact_tools: false,
          show_branding: true,
          hide_toolbar: true,
        },
        ws_token: 'ws_pres_tok',
      },
    } as any)

    renderWithQuery(<EduBoardWindowPage />, '/eduboard/window?launch=tok_pres_1')

    await waitFor(() => expect(screen.getByText('Presentation Mode (Read-Only)')).toBeTruthy())
    expect(screen.getByText('Wave Optics Lecture')).toBeTruthy()
    expect(screen.getByText('Prashant Academy')).toBeTruthy()
    expect(screen.queryByTestId('eduboard-toolbar')).toBeNull()
  })

  it('saves personal display preferences via API when unlocked', async () => {
    vi.mocked(eduboardApi.updatePreferences).mockResolvedValue({
      data: {
        effective: {
          default_workspace_mode: 'focus',
          default_board_appearance: 'greenboard',
          toolbar_state: 'compact',
          toolbar_position: 'left',
          pages_panel_open: false,
          saved_boards_panel_open: true,
          sidebar_collapsed: false,
          hide_app_header: false,
          hide_status_bar: false,
        },
        institution_defaults: {},
        user_overrides: { default_workspace_mode: 'focus' },
        locked_by_institution: false,
        allow_collaborator_mode: true,
        allow_popout_window: true,
      },
    } as any)

    renderWithQuery(<EduBoardWorkspace />)
    await waitFor(() => expect(screen.getAllByText('Wave Optics Lecture').length).toBeGreaterThan(0))

    fireEvent.click(screen.getByRole('button', { name: /Display Prefs/i }))
    await waitFor(() => expect(screen.getByText('Save My Preferences')).toBeTruthy())
    fireEvent.click(screen.getByText('Save My Preferences'))
    await waitFor(() => expect(eduboardApi.updatePreferences).toHaveBeenCalled())
  })
})
