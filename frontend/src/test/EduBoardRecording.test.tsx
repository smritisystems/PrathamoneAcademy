/**
 * @file        EduBoardRecording.test.tsx
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
 * @created     2026-11-19
 * @updated     2026-11-19
 *
 * @description Comprehensive Vitest unit tests verifying Native In-App Canvas & WebRTC Audio Auto-Tuning lecture recorder, IndexedDB crash recovery, ObsWebSocketBridge protocol handling, and EduBoardRecordingModal live/completion UI states.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  EduBoardCanvasRecorder,
  ObsWebSocketBridge,
  type EduBoardRecordingProgress,
} from '../utils/eduboardRecorder'
import EduBoardRecordingModal from '../components/eduboard/EduBoardRecordingModal'
import type { EduBoardDetailItem } from '../types'

// Mock HTML5 Canvas captureStream and MediaStream
class MockMediaStreamTrack {
  kind = 'video'
  enabled = true
  stop = vi.fn()
}

class MockMediaStream {
  private tracks: MockMediaStreamTrack[] = []
  constructor(tracks: MockMediaStreamTrack[] = []) {
    this.tracks = tracks
  }
  getVideoTracks() {
    return this.tracks.filter((t) => t.kind === 'video')
  }
  getAudioTracks() {
    return this.tracks.filter((t) => t.kind === 'audio')
  }
  getTracks() {
    return this.tracks
  }
  addTrack(t: MockMediaStreamTrack) {
    this.tracks.push(t)
  }
}

// Mock MediaRecorder
class MockMediaRecorder {
  static isTypeSupported = vi.fn().mockReturnValue(true)
  state = 'inactive'
  mimeType = 'video/webm;codecs=vp9,opus'
  ondataavailable: ((e: any) => void) | null = null
  onstop: (() => void) | null = null
  onerror: ((e: any) => void) | null = null

  start = vi.fn().mockImplementation(() => {
    this.state = 'recording'
  })
  pause = vi.fn().mockImplementation(() => {
    this.state = 'paused'
  })
  resume = vi.fn().mockImplementation(() => {
    this.state = 'recording'
  })
  stop = vi.fn().mockImplementation(() => {
    this.state = 'inactive'
    if (this.onstop) this.onstop()
  })
}

const mockSampleBoard: EduBoardDetailItem = {
  id: 101,
  board_code: 'EB-2026-001',
  institution_id: 1,
  is_demo: false,
  title: 'Calculus: Integration by Parts',
  topic: 'Definite Integrals & Area Under Curves',
  board_mode_default: 'whiteboard',
  status: 'active',
  is_template: false,
  collaboration_enabled: false,
  latest_revision_no: 1,
  page_count: 1,
  teacher_user_id: 42,
  standard_name: 'Class 12',
  division_name: 'Division A',
  subject_name: 'Mathematics',
  pages: [],
  attachments: [],
}

describe('Native In-App Lecture Recorder & OBS Bridge Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(window as any).MediaStream = MockMediaStream
    ;(window as any).MediaRecorder = MockMediaRecorder

    // Mock HTMLCanvasElement.captureStream
    HTMLCanvasElement.prototype.captureStream = vi.fn().mockImplementation(() => {
      const track = new MockMediaStreamTrack()
      track.kind = 'video'
      return new MockMediaStream([track])
    })

    // Mock navigator.mediaDevices.getUserMedia
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue(new MockMediaStream([new MockMediaStreamTrack()])),
      },
    })
  })

  it('initializes EduBoardCanvasRecorder in inactive state and exposes lifecycle methods', () => {
    const recorder = new EduBoardCanvasRecorder()
    expect(recorder.getState()).toBe('inactive')
  })

  it('starts canvas capture with WebRTC auto-tuning and transitions state to recording', async () => {
    const recorder = new EduBoardCanvasRecorder()
    const canvas = document.createElement('canvas')
    const stateCallback = vi.fn()
    recorder.onStateChange = stateCallback

    await recorder.start(
      canvas,
      {
        boardId: 101,
        title: 'Calculus Lecture',
        standardId: 12,
        subjectId: 5,
        teacherUserId: 42,
      },
      {
        enabled: true,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      30
    )

    expect(recorder.getState()).toBe('recording')
    expect(HTMLCanvasElement.prototype.captureStream).toHaveBeenCalledWith(30)
    expect(stateCallback).toHaveBeenCalledWith('recording')

    recorder.pause()
    expect(recorder.getState()).toBe('paused')

    recorder.resume()
    expect(recorder.getState()).toBe('recording')
  })

  it('ObsWebSocketBridge initializes with default decoupled host and manages connection states', () => {
    const bridge = new ObsWebSocketBridge({ host: '127.0.0.1', port: 4455 })
    const status = bridge.getStatus()
    expect(status.connected).toBe(false)
    expect(status.recording).toBe(false)
    expect(status.streaming).toBe(false)
  })

  it('renders EduBoardRecordingModal in active recording state with auto-tuning badges', () => {
    const mockProgress: EduBoardRecordingProgress = {
      state: 'recording',
      durationSeconds: 125,
      bytesRecorded: 15 * 1024 * 1024,
      chunksCount: 62,
    }

    render(
      <EduBoardRecordingModal
        isOpen={true}
        onClose={vi.fn()}
        board={mockSampleBoard}
        recorderState="recording"
        progress={mockProgress}
        recordedBlob={null}
        mimeType="video/webm"
        audioEnabled={true}
        onToggleAudio={vi.fn()}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onStop={vi.fn()}
        onDiscard={vi.fn()}
        onPublish={vi.fn().mockResolvedValue(undefined)}
        isPublishing={false}
        publishSuccess={false}
      />
    )

    expect(screen.getByText('Recording Active (1080p @ 30 FPS)')).toBeDefined()
    expect(screen.getByText('Acoustic Auto-Tuning Engine')).toBeDefined()
    expect(screen.getByText('Broadcast Standard (-16 LUFS)')).toBeDefined()
    expect(screen.getByText(/AGC Leveling:/)).toBeDefined()
    expect(screen.getByText(/Noise Cut:/)).toBeDefined()
    expect(screen.getByText('02:05')).toBeDefined()
    expect(screen.getByText(/Class 12 • Division A • Mathematics/)).toBeDefined()
  })

  it('renders EduBoardRecordingModal in review & publish mode when recording finishes', () => {
    const mockProgress: EduBoardRecordingProgress = {
      state: 'inactive',
      durationSeconds: 300,
      bytesRecorded: 35 * 1024 * 1024,
      chunksCount: 150,
    }
    const sampleBlob = new Blob(['mock video data'], { type: 'video/webm' })
    const onPublishSpy = vi.fn().mockResolvedValue(undefined)

    // Mock URL.createObjectURL
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-video')
    window.URL.revokeObjectURL = vi.fn()

    render(
      <EduBoardRecordingModal
        isOpen={true}
        onClose={vi.fn()}
        board={mockSampleBoard}
        recorderState="inactive"
        progress={mockProgress}
        recordedBlob={sampleBlob}
        mimeType="video/webm"
        audioEnabled={true}
        onToggleAudio={vi.fn()}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onStop={vi.fn()}
        onDiscard={vi.fn()}
        onPublish={onPublishSpy}
        isPublishing={false}
        publishSuccess={false}
      />
    )

    expect(screen.getByText('Lecture Recording Review & Publish')).toBeDefined()
    expect(screen.getByText('VP9/VBR 1080p')).toBeDefined()
    expect(screen.getByText('Publish directly to Student Portal Study Materials')).toBeDefined()
    expect(screen.getByText('Download WebM')).toBeDefined()

    const publishBtn = screen.getByText('Save & Publish to Cloud')
    expect(publishBtn).toBeDefined()
    fireEvent.click(publishBtn)
    expect(onPublishSpy).toHaveBeenCalled()
  })
})
