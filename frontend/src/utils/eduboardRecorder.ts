/**
 * @file        eduboardRecorder.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.src.utils
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
 * @description High-fidelity Native In-App Canvas & WebRTC Audio Auto-Tuning lecture recording pipeline with IndexedDB crash recovery and decoupled OBS Studio WebSocket v5 bridge for hybrid pro classrooms.
 */

/* ==========================================================================
   SECTION 1: TYPES & INTERFACES
   ========================================================================== */

export type RecorderState = 'inactive' | 'recording' | 'paused'

export interface EduBoardAudioOptions {
  enabled: boolean
  echoCancellation?: boolean
  noiseSuppression?: boolean
  autoGainControl?: boolean
  highPassFilterCutoffHz?: number
  compressorEnabled?: boolean
}

export interface EduBoardVideoOptions {
  fps?: number
  webcamEnabled?: boolean
  webcamPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  webcamWidth?: number
  webcamHeight?: number
}

export interface EduBoardRecordingMetadata {
  boardId: number
  title: string
  academicYearId?: number
  standardId?: number
  divisionId?: number
  subjectId?: number
  timetableEntryId?: number
  teacherUserId?: number
}

export interface EduBoardRecordingProgress {
  state: RecorderState
  durationSeconds: number
  bytesRecorded: number
  chunksCount: number
}

export interface ObsBridgeConfig {
  host?: string
  port?: number
  password?: string
  autoReconnect?: boolean
}

export interface ObsStatus {
  connected: boolean
  recording: boolean
  streaming: boolean
  recordTimecode?: string
  streamTimecode?: string
  cpuUsage?: number
  memoryUsageMb?: number
  fps?: number
  errorMessage?: string
}

/* ==========================================================================
   SECTION 2: INDEXEDDB CRASH-RESILIENT CHUNK STORE
   ========================================================================== */

const CHUNKS_DB_NAME = 'prathamone_recorder_chunks_v1'
const CHUNKS_STORE_NAME = 'recording_slices'
const CHUNKS_DB_VERSION = 1

function openChunksDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      return resolve(null)
    }
    const req = indexedDB.open(CHUNKS_DB_NAME, CHUNKS_DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(CHUNKS_STORE_NAME)) {
        const store = db.createObjectStore(CHUNKS_STORE_NAME, { keyPath: 'id', autoIncrement: true })
        store.createIndex('by_board', 'boardId', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
  })
}

async function persistChunk(boardId: number, chunkIndex: number, blob: Blob): Promise<void> {
  try {
    const db = await openChunksDb()
    if (!db) return
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CHUNKS_STORE_NAME, 'readwrite')
      const store = tx.objectStore(CHUNKS_STORE_NAME)
      store.add({
        boardId,
        chunkIndex,
        blob,
        timestamp: Date.now(),
      })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.warn('[EduBoardRecorder] Failed to persist chunk to IndexedDB:', err)
  }
}

async function clearBoardChunks(boardId: number): Promise<void> {
  try {
    const db = await openChunksDb()
    if (!db) return
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CHUNKS_STORE_NAME, 'readwrite')
      const store = tx.objectStore(CHUNKS_STORE_NAME)
      const index = store.index('by_board')
      const request = index.openCursor(IDBKeyRange.only(boardId))
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          resolve()
        }
      }
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn('[EduBoardRecorder] Failed to clear chunks from IndexedDB:', err)
  }
}

/* ==========================================================================
   SECTION 3: NATIVE IN-APP CANVAS & AUDIO RECORDER
   ========================================================================== */

export class EduBoardCanvasRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private combinedStream: MediaStream | null = null
  private micStream: MediaStream | null = null
  private webcamStream: MediaStream | null = null
  private webcamVideo: HTMLVideoElement | null = null
  private compositeAnimationId: number | null = null
  private audioCtx: AudioContext | null = null
  private recordedChunks: Blob[] = []
  private state: RecorderState = 'inactive'
  private startTime = 0
  private timerInterval: any = null
  private totalBytesRecorded = 0
  private chunkIndex = 0
  private metadata: EduBoardRecordingMetadata | null = null

  public onProgress?: (progress: EduBoardRecordingProgress) => void
  public onError?: (error: Error) => void
  public onStateChange?: (state: RecorderState) => void

  public getState(): RecorderState {
    return this.state
  }

  /**
   * Start recording the HTML5 canvas with WebRTC acoustic auto-tuning and optional Webcam PiP.
   */
  public async start(
    canvasElement: HTMLCanvasElement,
    metadata: EduBoardRecordingMetadata,
    audioOptions: EduBoardAudioOptions = { enabled: true },
    videoOptions: EduBoardVideoOptions | number = 30
  ): Promise<void> {
    if (this.state !== 'inactive') {
      throw new Error(`Recorder already running (state: ${this.state})`)
    }

    const opts: EduBoardVideoOptions =
      typeof videoOptions === 'number' ? { fps: videoOptions, webcamEnabled: false } : videoOptions
    const targetFps = opts.fps || 30

    this.metadata = metadata
    this.recordedChunks = []
    this.totalBytesRecorded = 0
    this.chunkIndex = 0
    await clearBoardChunks(metadata.boardId)

    try {
      // 1. Acquire optional teacher webcam for Facecam Picture-in-Picture (PiP)
      if (opts.webcamEnabled && typeof navigator !== 'undefined' && navigator.mediaDevices) {
        try {
          const camStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: 'user',
            },
          })
          this.webcamStream = camStream
          const v = document.createElement('video')
          v.srcObject = camStream
          v.muted = true
          v.playsInline = true
          await v.play().catch(() => {})
          this.webcamVideo = v
        } catch (camErr) {
          console.warn('[EduBoardRecorder] Webcam acquisition failed, proceeding canvas-only:', camErr)
        }
      }

      // 2. Capture video stream (Composite with Webcam PiP or direct GPU Canvas capture)
      if (this.webcamVideo) {
        const compCanvas = document.createElement('canvas')
        compCanvas.width = canvasElement.width || 1920
        compCanvas.height = canvasElement.height || 1080
        const ctx = compCanvas.getContext('2d')
        const pipW = opts.webcamWidth || 320
        const pipH = opts.webcamHeight || 240
        const margin = 24
        let pipX = compCanvas.width - pipW - margin
        let pipY = compCanvas.height - pipH - margin
        if (opts.webcamPosition === 'bottom-left') {
          pipX = margin
          pipY = compCanvas.height - pipH - margin
        } else if (opts.webcamPosition === 'top-right') {
          pipX = compCanvas.width - pipW - margin
          pipY = margin
        } else if (opts.webcamPosition === 'top-left') {
          pipX = margin
          pipY = margin
        }

        const renderLoop = () => {
          if (this.state === 'inactive') return
          if (ctx) {
            ctx.drawImage(canvasElement, 0, 0, compCanvas.width, compCanvas.height)
            if (this.webcamVideo && this.webcamVideo.readyState >= 2) {
              ctx.save()
              ctx.lineWidth = 4
              ctx.strokeStyle = '#ffffff'
              ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
              ctx.shadowBlur = 12
              ctx.beginPath()
              if (typeof (ctx as any).roundRect === 'function') {
                ;(ctx as any).roundRect(pipX, pipY, pipW, pipH, 12)
              } else {
                ctx.rect(pipX, pipY, pipW, pipH)
              }
              ctx.stroke()
              ctx.clip()
              ctx.drawImage(this.webcamVideo, pipX, pipY, pipW, pipH)
              ctx.restore()
            }
          }
          this.compositeAnimationId = requestAnimationFrame(renderLoop)
        }
        renderLoop()

        const canvasStream = compCanvas.captureStream(targetFps)
        const videoTrack = canvasStream.getVideoTracks()[0]
        if (!videoTrack) {
          throw new Error('Composite canvas produced no video tracks')
        }
        this.combinedStream = new MediaStream([videoTrack])
      } else {
        const canvasStream = canvasElement.captureStream(targetFps)
        const videoTrack = canvasStream.getVideoTracks()[0]
        if (!videoTrack) {
          throw new Error('Canvas captureStream produced no video tracks')
        }
        this.combinedStream = new MediaStream([videoTrack])
      }

      // 3. Setup WebRTC Microphone with Automatic Gain Control & Noise Cancellation
      if (audioOptions.enabled && typeof navigator !== 'undefined' && navigator.mediaDevices) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: audioOptions.echoCancellation ?? true,
              noiseSuppression: audioOptions.noiseSuppression ?? true,
              autoGainControl: audioOptions.autoGainControl ?? true,
              channelCount: 1,
              sampleRate: 48000,
            },
          })
          this.micStream = micStream

          // 4. Web Audio Auto-Tuning (High-pass filter for table thumps + broadcast dynamics compressor)
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
          if (AudioContextClass) {
            this.audioCtx = new AudioContextClass()
            const source = this.audioCtx.createMediaStreamSource(micStream)

            // High-pass filter (80Hz) eliminates room rumble, AC hum, and table bumps
            const hpFilter = this.audioCtx.createBiquadFilter()
            hpFilter.type = 'highpass'
            hpFilter.frequency.setValueAtTime(audioOptions.highPassFilterCutoffHz ?? 80, this.audioCtx.currentTime)
            hpFilter.Q.setValueAtTime(0.707, this.audioCtx.currentTime)

            // Dynamics compressor gives steady broadcast vocals without clipping
            const compressor = this.audioCtx.createDynamicsCompressor()
            compressor.threshold.setValueAtTime(-18, this.audioCtx.currentTime)
            compressor.knee.setValueAtTime(20, this.audioCtx.currentTime)
            compressor.ratio.setValueAtTime(3, this.audioCtx.currentTime)
            compressor.attack.setValueAtTime(0.005, this.audioCtx.currentTime)
            compressor.release.setValueAtTime(0.080, this.audioCtx.currentTime)

            const destination = this.audioCtx.createMediaStreamDestination()

            if (audioOptions.compressorEnabled !== false) {
              source.connect(hpFilter)
              hpFilter.connect(compressor)
              compressor.connect(destination)
            } else {
              source.connect(hpFilter)
              hpFilter.connect(destination)
            }

            const processedAudioTrack = destination.stream.getAudioTracks()[0]
            if (processedAudioTrack) {
              this.combinedStream.addTrack(processedAudioTrack)
            }
          } else {
            // Fallback: direct mic track
            const rawAudioTrack = micStream.getAudioTracks()[0]
            if (rawAudioTrack) {
              this.combinedStream.addTrack(rawAudioTrack)
            }
          }
        } catch (audioErr) {
          console.warn('[EduBoardRecorder] Microphone acquisition failed, continuing video-only:', audioErr)
        }
      }

      // 4. Determine optimal supported codec (VP9/VP8/H.264 WebM or MP4)
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4;codecs=avc1,mp4a',
      ]
      let selectedMime = ''
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime
          break
        }
      }

      // 5. Initialize MediaRecorder with 1200 kbps educational VBR
      this.mediaRecorder = new MediaRecorder(
        this.combinedStream,
        selectedMime ? { mimeType: selectedMime, videoBitsPerSecond: 1200000 } : undefined
      )

      this.mediaRecorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data)
          this.totalBytesRecorded += e.data.size
          const idx = ++this.chunkIndex
          if (this.metadata) {
            await persistChunk(this.metadata.boardId, idx, e.data)
          }
          this.emitProgress()
        }
      }

      this.mediaRecorder.onstop = () => {
        this.teardownStreams()
      }

      this.mediaRecorder.onerror = (e: any) => {
        const error = new Error(`MediaRecorder error: ${e.error?.message || 'Unknown'}`)
        if (this.onError) this.onError(error)
      }

      // Emit slices every 2000ms for IndexedDB crash persistence
      this.mediaRecorder.start(2000)
      this.startTime = Date.now()
      this.state = 'recording'
      if (this.onStateChange) this.onStateChange(this.state)

      this.timerInterval = setInterval(() => {
        this.emitProgress()
      }, 1000)
    } catch (err: any) {
      this.teardownStreams()
      throw err
    }
  }

  public pause(): void {
    if (this.mediaRecorder && this.state === 'recording') {
      this.mediaRecorder.pause()
      this.state = 'paused'
      if (this.onStateChange) this.onStateChange(this.state)
    }
  }

  public resume(): void {
    if (this.mediaRecorder && this.state === 'paused') {
      this.mediaRecorder.resume()
      this.state = 'recording'
      if (this.onStateChange) this.onStateChange(this.state)
    }
  }

  /**
   * Stop recording and return compiled Blob.
   */
  public async stop(): Promise<{ blob: Blob; mimeType: string; durationSeconds: number }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.state === 'inactive') {
        return reject(new Error('Recorder not active'))
      }

      const durationSeconds = Math.max(1, Math.round((Date.now() - this.startTime) / 1000))
      const mime = this.mediaRecorder.mimeType || 'video/webm'

      this.mediaRecorder.onstop = async () => {
        try {
          const finalBlob = new Blob(this.recordedChunks, { type: mime })
          if (this.metadata) {
            await clearBoardChunks(this.metadata.boardId)
          }
          this.teardownStreams()
          resolve({ blob: finalBlob, mimeType: mime, durationSeconds })
        } catch (err) {
          this.teardownStreams()
          reject(err)
        }
      }

      try {
        this.mediaRecorder.stop()
      } catch (err) {
        this.teardownStreams()
        reject(err)
      }
    })
  }

  private emitProgress(): void {
    if (!this.onProgress) return
    const duration = this.startTime ? Math.round((Date.now() - this.startTime) / 1000) : 0
    this.onProgress({
      state: this.state,
      durationSeconds: duration,
      bytesRecorded: this.totalBytesRecorded,
      chunksCount: this.recordedChunks.length,
    })
  }

  private teardownStreams(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
    if (this.compositeAnimationId !== null) {
      cancelAnimationFrame(this.compositeAnimationId)
      this.compositeAnimationId = null
    }
    if (this.webcamStream) {
      this.webcamStream.getTracks().forEach((t) => t.stop())
      this.webcamStream = null
    }
    if (this.webcamVideo) {
      this.webcamVideo.pause()
      this.webcamVideo.srcObject = null
      this.webcamVideo = null
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop())
      this.micStream = null
    }
    if (this.combinedStream) {
      this.combinedStream.getTracks().forEach((t) => t.stop())
      this.combinedStream = null
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {})
      this.audioCtx = null
    }
    this.state = 'inactive'
    if (this.onStateChange) this.onStateChange(this.state)
  }
}

/* ==========================================================================
   SECTION 4: DECOUPLED OBS STUDIO WEBSOCKET V5 BRIDGE
   ========================================================================== */

export class ObsWebSocketBridge {
  private ws: WebSocket | null = null
  private config: ObsBridgeConfig
  private status: ObsStatus = {
    connected: false,
    recording: false,
    streaming: false,
  }
  private pendingRequests = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>()
  private requestIdCounter = 0

  public onStatusChange?: (status: ObsStatus) => void

  constructor(config: ObsBridgeConfig = {}) {
    this.config = {
      host: config.host || '127.0.0.1',
      port: config.port || 4455,
      password: config.password || '',
      autoReconnect: config.autoReconnect ?? false,
    }
  }

  public getStatus(): ObsStatus {
    return { ...this.status }
  }

  public connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const url = `ws://${this.config.host}:${this.config.port}`
      try {
        this.ws = new WebSocket(url)
      } catch (err) {
        this.status.connected = false
        this.status.errorMessage = (err as any)?.message || 'WebSocket creation failed'
        this.notify()
        return reject(err)
      }

      this.ws.onopen = () => {
        // Wait for OBS Hello (OpCode 0)
      }

      this.ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data)
          await this.handleMessage(msg, resolve, reject)
        } catch (err) {
          console.error('[ObsWebSocketBridge] Failed to parse message:', err)
        }
      }

      this.ws.onerror = (e) => {
        this.status.connected = false
        this.status.errorMessage = 'Connection error'
        this.notify()
        reject(new Error('OBS WebSocket error'))
      }

      this.ws.onclose = () => {
        this.status.connected = false
        this.status.recording = false
        this.status.streaming = false
        this.notify()
      }
    })
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.status.connected = false
    this.notify()
  }

  public async startRecording(): Promise<void> {
    await this.call('StartRecord')
    this.status.recording = true
    this.notify()
  }

  public async stopRecording(): Promise<string | undefined> {
    const res = await this.call('StopRecord')
    this.status.recording = false
    this.notify()
    return res?.outputPath
  }

  public async toggleRecording(): Promise<boolean> {
    const res = await this.call('ToggleRecord')
    this.status.recording = !!res?.outputActive
    this.notify()
    return this.status.recording
  }

  public async startStreaming(): Promise<void> {
    await this.call('StartStream')
    this.status.streaming = true
    this.notify()
  }

  public async stopStreaming(): Promise<void> {
    await this.call('StopStream')
    this.status.streaming = false
    this.notify()
  }

  private call(requestType: string, requestData?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return reject(new Error('OBS Studio bridge not connected'))
      }
      const requestId = `req_${++this.requestIdCounter}_${Date.now()}`
      this.pendingRequests.set(requestId, { resolve, reject })
      this.ws.send(
        JSON.stringify({
          op: 6, // Request
          d: {
            requestType,
            requestId,
            requestData: requestData || {},
          },
        })
      )
    })
  }

  private async handleMessage(
    msg: any,
    connectResolve?: (v: boolean) => void,
    connectReject?: (e: any) => void
  ): Promise<void> {
    const { op, d } = msg

    // OpCode 0: Hello from OBS
    if (op === 0) {
      let authResponse: string | undefined
      if (d.authentication && this.config.password) {
        authResponse = await this.computeAuthHash(
          this.config.password,
          d.authentication.salt,
          d.authentication.challenge
        )
      }

      // Send Identify (OpCode 1)
      this.ws?.send(
        JSON.stringify({
          op: 1,
          d: {
            rpcVersion: 1,
            authentication: authResponse,
            eventSubscriptions: 33, // General + Outputs
          },
        })
      )
    }

    // OpCode 2: Identified (Connection Authenticated)
    if (op === 2) {
      this.status.connected = true
      this.status.errorMessage = undefined
      this.notify()
      if (connectResolve) connectResolve(true)

      // Query current state
      try {
        const recStatus = await this.call('GetRecordStatus')
        this.status.recording = !!recStatus?.outputActive
        const streamStatus = await this.call('GetStreamStatus')
        this.status.streaming = !!streamStatus?.outputActive
        this.notify()
      } catch {
        // ignore
      }
    }

    // OpCode 5: Event
    if (op === 5) {
      const eventType = d.eventType
      if (eventType === 'RecordStateChanged') {
        this.status.recording = d.eventData?.outputActive ?? false
        this.notify()
      } else if (eventType === 'StreamStateChanged') {
        this.status.streaming = d.eventData?.outputActive ?? false
        this.notify()
      }
    }

    // OpCode 7: RequestResponse
    if (op === 7) {
      const requestId = d.requestId
      const pending = this.pendingRequests.get(requestId)
      if (pending) {
        this.pendingRequests.delete(requestId)
        if (d.requestStatus?.result) {
          pending.resolve(d.responseData)
        } else {
          pending.reject(new Error(d.requestStatus?.comment || 'OBS request failed'))
        }
      }
    }
  }

  private async computeAuthHash(password: string, salt: string, challenge: string): Promise<string> {
    const encoder = new TextEncoder()

    // Step 1: base64(sha256(password + salt))
    const passSaltBytes = encoder.encode(password + salt)
    const passHashBuf = await crypto.subtle.digest('SHA-256', passSaltBytes)
    const passHashBase64 = btoa(String.fromCharCode(...new Uint8Array(passHashBuf)))

    // Step 2: base64(sha256(passHashBase64 + challenge))
    const authBytes = encoder.encode(passHashBase64 + challenge)
    const authBuf = await crypto.subtle.digest('SHA-256', authBytes)
    return btoa(String.fromCharCode(...new Uint8Array(authBuf)))
  }

  private notify(): void {
    if (this.onStatusChange) {
      this.onStatusChange(this.getStatus())
    }
  }
}
