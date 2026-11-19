/**
 * @file        videoStudio.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.types
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.141.0
 * @created     2026-11-19
 * @updated     2026-11-19
 *
 * @description Master TypeScript interfaces, schemas, and type definitions for PrathamOne Video Studio, AI Director, and Timeline Editor.
 */

export type AspectRatio = '16:9' | '9:16' | '1:1'

export type TransitionType =
  | 'none'
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'zoom-in'
  | 'zoom-out'
  | 'dip-black'
  | 'dip-navy'

export type MockupType = 'none' | 'macbook' | 'display' | 'ipad' | 'floating-card'

export type PresenterMode = 'none' | 'full-screen' | 'pip' | 'split-screen'

export type PresenterPosition =
  | 'bottom-right'
  | 'bottom-left'
  | 'top-right'
  | 'top-left'
  | 'split-left'
  | 'split-right'

export interface PresenterProfile {
  id: string
  name: string
  role: string
  accent: string
  avatarUrl: string
  videoPreviewUrl?: string
  voiceName: string
  sampleAudioUrl?: string
  gender: 'female' | 'male' | 'custom'
  style: 'executive' | 'consultant' | 'technical' | 'custom'
  badge: string
  description: string
  recommendedModules: string[]
}

export interface ScenePresenterConfig {
  enabled: boolean
  profileId: string
  mode: PresenterMode
  position: PresenterPosition
  videoUrl?: string
  avatarUrl?: string
  speechScript?: string
  voiceId?: string
  scale?: number // e.g. 0.28 (28% of canvas width in PIP mode)
  showBorder?: boolean
  borderColor?: string
}

export interface SceneCallout {
  id: string
  text: string
  subtext?: string
  xPercent: number // 0-100%
  yPercent: number // 0-100%
  delaySeconds: number
  badgeColor?: 'orange' | 'navy' | 'emerald' | 'amber' | 'blue'
  iconName?: string
}

export interface SceneCursor {
  show: boolean
  startXPercent: number
  startYPercent: number
  clickXPercent: number
  clickYPercent: number
  clickTimeSeconds: number // within scene
  clickLabel?: string
}

export interface SceneNarration {
  script: string
  voiceId?: string
  rate: number // 0.8 - 1.2
  pitch: number // 0.8 - 1.2
  volume: number // 0 - 1
  audioUrl?: string
  durationEstimate?: number
}

export interface SceneCaptions {
  show: boolean
  customText?: string
  style: 'bottom-pill' | 'highlight-word' | 'centered-banner' | 'clean-sub'
  fontSize?: number
}

export interface SceneMotion {
  type: 'static' | 'ken-burns' | 'pan-left' | 'pan-right' | 'zoom-in' | 'zoom-out'
  startScale: number // e.g. 1.0
  endScale: number // e.g. 1.15
  startXPercent: number // 50 (center)
  startYPercent: number // 50 (center)
  endXPercent: number
  endYPercent: number
  easing?: 'linear' | 'ease-in-out' | 'ease-out'
}

export interface SceneMedia {
  type: 'image' | 'video' | 'color' | 'gradient'
  url: string
  thumbnailUrl?: string
  fit: 'cover' | 'contain' | 'mockup'
  mockupType?: MockupType
  backgroundColor?: string
  blurBackground?: boolean
}

export interface VideoSceneDefinition {
  id: string
  order: number
  title: string
  subtitle: string
  duration: number // in seconds
  transition: TransitionType
  transitionDuration: number // in seconds (e.g. 0.6)
  media: SceneMedia
  motion: SceneMotion
  callouts: SceneCallout[]
  cursor: SceneCursor
  narration: SceneNarration
  captions: SceneCaptions
  presenter?: ScenePresenterConfig
}

export interface ProjectAudioConfig {
  bgmUrl?: string
  bgmVolume: number // 0.0 - 1.0
  bgmDucking: boolean
  duckingVolume: number // e.g. 0.15
  masterVolume: number
  narrationVolume: number
}

export interface VideoStudioProject {
  id: string
  name: string
  description?: string
  aspectRatio: AspectRatio
  fps: number // 30 or 60
  targetDuration: number // in seconds, e.g. 120, 60, 30
  resolution: { width: number; height: number }
  theme: {
    primaryColor: string
    accentColor: string
    watermark: boolean
    watermarkPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    tagline: string
  }
  audio: ProjectAudioConfig
  scenes: VideoSceneDefinition[]
  createdAt: string
  updatedAt: string
}

export interface VerifiedAssetItem {
  id: string
  title: string
  category: 'dashboard' | 'students' | 'fees' | 'academics' | 'eduboard' | 'planning' | 'attendance' | 'exams' | 'payroll' | 'communication' | 'branding' | 'recording'
  moduleName: string
  url: string
  mediaType?: 'image' | 'video'
  thumbnailUrl?: string
  aspectRatio: string
  recommendedDuration: number
  defaultHeadline: string
  defaultSubtitle: string
  defaultScript: string
  suggestedCallouts?: Array<{ text: string; x: number; y: number }>
}

export type DirectorPresetId =
  | 'master-120'
  | 'executive-60'
  | 'social-30'
  | 'fees-45'
  | 'eduboard-45'
  | 'students-45'
  | 'whatsapp-45'
  | 'custom'

export interface AiDirectorPreset {
  id: DirectorPresetId
  title: string
  subtitle: string
  targetDuration: number
  aspectRatio: AspectRatio
  iconName: string
  description: string
  badgeText: string
  scenesCount: number
  recommendedTarget: string
}

export interface VideoExportOptions {
  resolution: { width: number; height: number }
  fps: number
  aspectRatio: AspectRatio
  format: 'mp4' | 'webm'
  quality: 'high' | 'standard' | 'draft'
  bitrateKbps: number
  includeAudio: boolean
  includeSubtitles: boolean
  includeWatermark: boolean
  burnInCaptions: boolean
}

export interface VideoExportProgress {
  status: 'idle' | 'preparing' | 'rendering' | 'encoding' | 'completed' | 'error'
  currentFrame: number
  totalFrames: number
  progressPercent: number
  elapsedSeconds: number
  estimatedRemainingSeconds: number
  downloadUrl?: string
  errorMessage?: string
}
