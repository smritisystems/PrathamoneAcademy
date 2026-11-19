/**
 * @file        VideoCanvasPreviewer.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.studio
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
 * @description Real-time 60 FPS HTML5 Canvas video playback engine executing Ken Burns pan/zoom transforms, device mockups, animated cursor ripples, transitions, audio mixing, and subtitles.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Tv,
  Smartphone,
  Square,
  Sparkles,
} from 'lucide-react'
import { useVideoStudioStore } from '../../store/videoStudioStore'
import type { VideoSceneDefinition } from '../../types/videoStudio'

interface VideoCanvasPreviewerProps {
  onToggleFullscreen?: () => void
}

export default function VideoCanvasPreviewer({ onToggleFullscreen }: VideoCanvasPreviewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map())
  const videoCacheRef = useRef<Map<string, HTMLVideoElement>>(new Map())
  const presenterImgCacheRef = useRef<Map<string, HTMLImageElement>>(new Map())
  const animationFrameIdRef = useRef<number | null>(null)

  const {
    currentProject,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    togglePlayPause,
    activeSceneId,
  } = useVideoStudioStore()

  const [isMuted, setIsMuted] = useState(false)
  const [containerAspect, setContainerAspect] = useState<string>('aspect-video')

  // Set aspect ratio container class
  useEffect(() => {
    if (currentProject.aspectRatio === '9:16') {
      setContainerAspect('aspect-[9/16] max-h-[70vh]')
    } else if (currentProject.aspectRatio === '1:1') {
      setContainerAspect('aspect-square max-h-[70vh]')
    } else {
      setContainerAspect('aspect-video max-h-[70vh]')
    }
  }, [currentProject.aspectRatio])

  // Initialize and synchronize audio playback
  useEffect(() => {
    if (!audioRef.current && currentProject.audio.bgmUrl) {
      const audio = new Audio(currentProject.audio.bgmUrl)
      audio.loop = true
      audio.volume = isMuted ? 0 : currentProject.audio.bgmVolume
      audioRef.current = audio
    }

    const audio = audioRef.current
    if (audio) {
      audio.volume = isMuted ? 0 : currentProject.audio.bgmVolume
      if (isPlaying) {
        audio.currentTime = currentTime % (audio.duration || 120)
        audio.play().catch(() => {})
      } else {
        audio.pause()
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [isPlaying, isMuted, currentProject.audio.bgmUrl, currentProject.audio.bgmVolume])

  // Preload all scene images, videos, and presenter avatars into memory cache
  useEffect(() => {
    currentProject.scenes.forEach((sc) => {
      // Images
      if (sc.media.type !== 'video' && sc.media.url && !imageCacheRef.current.has(sc.media.url)) {
        const img = new Image()
        img.src = sc.media.url
        img.onload = () => {
          imageCacheRef.current.set(sc.media.url, img)
        }
      }
      // Videos (actual software demonstration recordings)
      if (sc.media.type === 'video' && sc.media.url && !videoCacheRef.current.has(sc.media.url)) {
        const vid = document.createElement('video')
        vid.src = sc.media.url
        vid.muted = true
        vid.playsInline = true
        vid.preload = 'auto'
        vid.crossOrigin = 'anonymous'
        videoCacheRef.current.set(sc.media.url, vid)
      }
      // Presenter avatars
      if (sc.presenter?.avatarUrl && !presenterImgCacheRef.current.has(sc.presenter.avatarUrl)) {
        const pImg = new Image()
        pImg.src = sc.presenter.avatarUrl
        pImg.onload = () => {
          presenterImgCacheRef.current.set(sc.presenter!.avatarUrl!, pImg)
        }
      }
    })
  }, [currentProject.scenes])

  // Find active scene and local scene progress
  const getSceneAtTime = useCallback(
    (time: number) => {
      let accumulated = 0
      for (let i = 0; i < currentProject.scenes.length; i++) {
        const scene = currentProject.scenes[i]
        const sceneStart = accumulated
        const sceneEnd = accumulated + scene.duration

        if (time >= sceneStart && time <= sceneEnd) {
          const localTime = time - sceneStart
          const progress = Math.max(0, Math.min(localTime / scene.duration, 1))
          const previousScene = i > 0 ? currentProject.scenes[i - 1] : null
          return { scene, localTime, progress, previousScene, sceneIndex: i }
        }
        accumulated += scene.duration
      }

      // Past end
      const last = currentProject.scenes[currentProject.scenes.length - 1]
      return {
        scene: last,
        localTime: last ? last.duration : 0,
        progress: 1,
        previousScene: null,
        sceneIndex: currentProject.scenes.length - 1,
      }
    },
    [currentProject.scenes]
  )

  // 60 FPS Render Loop
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = currentProject.resolution
    canvas.width = width
    canvas.height = height

    const { scene, localTime, progress, previousScene } = getSceneAtTime(currentTime)
    if (!scene) return

    // 1. Draw Master Background (Navy & Prussian Gradient)
    const bgGradient = ctx.createRadialGradient(
      width * 0.5,
      height * 0.45,
      width * 0.1,
      width * 0.5,
      height * 0.5,
      width * 0.8
    )
    bgGradient.addColorStop(0, '#0E2E6E')
    bgGradient.addColorStop(0.6, '#071C44')
    bgGradient.addColorStop(1, '#051535')

    ctx.fillStyle = scene.media.backgroundColor || bgGradient
    ctx.fillRect(0, 0, width, height)

    // 2. Compute Ken Burns Motion Interpolation
    let scale = 1.0
    let transX = 0
    let transY = 0

    if (scene.motion.type !== 'static') {
      const s0 = scene.motion.startScale || 1.0
      const s1 = scene.motion.endScale || 1.15
      scale = s0 + progress * (s1 - s0)

      const x0 = (scene.motion.startXPercent || 50) / 100
      const x1 = (scene.motion.endXPercent || 50) / 100
      const y0 = (scene.motion.startYPercent || 50) / 100
      const y1 = (scene.motion.endYPercent || 50) / 100

      transX = (0.5 - (x0 + progress * (x1 - x0))) * (width * 0.15)
      transY = (0.5 - (y0 + progress * (y1 - y0))) * (height * 0.15)
    }

    // 3. Render Device Mockup & Image/Video Content
    const isVideo = scene.media.type === 'video'
    const vid = isVideo ? videoCacheRef.current.get(scene.media.url) : null
    if (vid) {
      if (Math.abs(vid.currentTime - localTime) > 0.4) {
        vid.currentTime = localTime % (vid.duration || scene.duration || 1)
      }
      if (isPlaying && vid.paused) {
        vid.play().catch(() => {})
      } else if (!isPlaying && !vid.paused) {
        vid.pause()
      }
    }
    const mediaDrawable = isVideo ? vid : imageCacheRef.current.get(scene.media.url)
    const isReady =
      mediaDrawable &&
      (isVideo ? Boolean(vid && vid.readyState >= 2) : Boolean((mediaDrawable as HTMLImageElement).complete))
    const mockup = scene.media.mockupType || 'display'

    ctx.save()

    // Handle Transition Effects at Scene Entrance (first 0.5s)
    const transDur = scene.transitionDuration || 0.5
    if (localTime < transDur && scene.transition !== 'none') {
      const tProgress = localTime / transDur
      if (scene.transition === 'fade') {
        ctx.globalAlpha = tProgress
      } else if (scene.transition === 'slide-left') {
        ctx.translate((1 - tProgress) * (width * 0.3), 0)
        ctx.globalAlpha = Math.min(1, tProgress * 1.5)
      } else if (scene.transition === 'slide-right') {
        ctx.translate(-(1 - tProgress) * (width * 0.3), 0)
        ctx.globalAlpha = Math.min(1, tProgress * 1.5)
      } else if (scene.transition === 'zoom-in') {
        const zScale = 0.85 + tProgress * 0.15
        ctx.translate((width * (1 - zScale)) / 2, (height * (1 - zScale)) / 2)
        ctx.scale(zScale, zScale)
        ctx.globalAlpha = tProgress
      } else if (scene.transition === 'dip-navy') {
        if (tProgress < 0.3) {
          ctx.fillStyle = '#071C44'
          ctx.fillRect(0, 0, width, height)
        }
      }
    }

    // Draw Mockup Frame
    if (mockup === 'display') {
      // Studio Display Monitor Frame
      const monW = width * 0.84
      const monH = height * 0.76
      const monX = (width - monW) / 2 + transX
      const monY = (height - monH) / 2 - height * 0.03 + transY

      // Subtle Outer Glow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
      ctx.shadowBlur = 40
      ctx.shadowOffsetY = 15

      // Stand Neck & Base
      ctx.fillStyle = '#94A3B8'
      ctx.fillRect(width / 2 - 20 + transX, monY + monH, 40, height * 0.12)
      ctx.beginPath()
      ctx.roundRect(width / 2 - 120 + transX, monY + monH + height * 0.1, 240, 14, 6)
      ctx.fill()

      // Monitor Outer Bezel
      ctx.fillStyle = '#0F172A'
      ctx.beginPath()
      ctx.roundRect(monX, monY, monW, monH, 18)
      ctx.fill()

      // Inner Screen Viewport
      const screenPadding = 12
      const scrX = monX + screenPadding
      const scrY = monY + screenPadding
      const scrW = monW - screenPadding * 2
      const scrH = monH - screenPadding * 2

      ctx.save()
      ctx.beginPath()
      ctx.roundRect(scrX, scrY, scrW, scrH, 8)
      ctx.clip()

      if (isReady && mediaDrawable) {
        // Draw image or video with Ken Burns scale inside viewport
        const iw = scrW * scale
        const ih = scrH * scale
        const ix = scrX - (iw - scrW) / 2
        const iy = scrY - (ih - scrH) / 2
        ctx.drawImage(mediaDrawable as CanvasImageSource, ix, iy, iw, ih)
      } else {
        ctx.fillStyle = '#1E293B'
        ctx.fillRect(scrX, scrY, scrW, scrH)
      }
      ctx.restore()

      // Webcam Dot
      ctx.fillStyle = '#334155'
      ctx.beginPath()
      ctx.arc(monX + monW / 2, monY + 6, 3, 0, Math.PI * 2)
      ctx.fill()
    } else if (mockup === 'macbook') {
      // MacBook Pro Laptop Frame
      const mbW = width * 0.82
      const mbH = height * 0.72
      const mbX = (width - mbW) / 2 + transX
      const mbY = (height - mbH) / 2 - height * 0.04 + transY

      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
      ctx.shadowBlur = 35
      ctx.shadowOffsetY = 12

      // Aluminum Lid
      ctx.fillStyle = '#1E293B'
      ctx.beginPath()
      ctx.roundRect(mbX, mbY, mbW, mbH, 14)
      ctx.fill()

      // Screen
      const scrX = mbX + 10
      const scrY = mbY + 10
      const scrW = mbW - 20
      const scrH = mbH - 24

      ctx.save()
      ctx.beginPath()
      ctx.roundRect(scrX, scrY, scrW, scrH, 6)
      ctx.clip()
      if (isReady && mediaDrawable) {
        const iw = scrW * scale
        const ih = scrH * scale
        ctx.drawImage(mediaDrawable as CanvasImageSource, scrX - (iw - scrW) / 2, scrY - (ih - scrH) / 2, iw, ih)
      }
      ctx.restore()

      // Base / Trackpad lip
      ctx.fillStyle = '#94A3B8'
      ctx.beginPath()
      ctx.roundRect(mbX - 35, mbY + mbH, mbW + 70, 12, [0, 0, 10, 10])
      ctx.fill()
      ctx.fillStyle = '#64748B'
      ctx.fillRect(mbX + mbW / 2 - 40, mbY + mbH, 80, 4)
    } else if (mockup === 'floating-card') {
      // Modern Floating Borderless SaaS Card with Glow
      const cardW = width * 0.86
      const cardH = height * 0.8
      const cardX = (width - cardW) / 2 + transX
      const cardY = (height - cardH) / 2 + transY

      ctx.shadowColor = 'rgba(241, 105, 6, 0.25)' // Pratham orange subtle glow
      ctx.shadowBlur = 45
      ctx.shadowOffsetY = 15

      ctx.save()
      ctx.beginPath()
      ctx.roundRect(cardX, cardY, cardW, cardH, 20)
      ctx.clip()

      if (isReady && mediaDrawable) {
        const iw = cardW * scale
        const ih = cardH * scale
        ctx.drawImage(mediaDrawable as CanvasImageSource, cardX - (iw - cardW) / 2, cardY - (ih - cardH) / 2, iw, ih)
      }

      // Elegant glass border outline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.restore()
    } else {
      // Full Bleed Cover
      if (isReady && mediaDrawable) {
        const iw = width * scale
        const ih = height * scale
        ctx.drawImage(mediaDrawable as CanvasImageSource, (width - iw) / 2 + transX, (height - ih) / 2 + transY, iw, ih)
      }
    }
    ctx.restore()

    // 4. Render Animated Callout Pill Badges
    scene.callouts.forEach((c) => {
      if (localTime >= c.delaySeconds) {
        const calloutAge = localTime - c.delaySeconds
        const alpha = Math.min(1, calloutAge * 2.5)
        const bounceY = Math.max(0, (1 - Math.min(1, calloutAge * 2)) * 12)

        const cx = (c.xPercent / 100) * width
        const cy = (c.yPercent / 100) * height - bounceY

        ctx.save()
        ctx.globalAlpha = alpha

        // Badge Pill Styling
        ctx.font = 'bold 18px Inter, sans-serif'
        const metrics = ctx.measureText(c.text)
        const pillW = metrics.width + 44
        const pillH = 38
        const pillX = cx - pillW / 2
        const pillY = cy - pillH / 2

        // Soft Pill Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
        ctx.shadowBlur = 15
        ctx.shadowOffsetY = 4

        // Pill Background
        ctx.fillStyle = '#0F172A'
        ctx.beginPath()
        ctx.roundRect(pillX, pillY, pillW, pillH, 19)
        ctx.fill()

        // Border
        ctx.strokeStyle = c.badgeColor === 'emerald' ? '#10B981' : '#F16906'
        ctx.lineWidth = 2
        ctx.stroke()

        // Accent Indicator Dot
        ctx.fillStyle = c.badgeColor === 'emerald' ? '#10B981' : '#F16906'
        ctx.beginPath()
        ctx.arc(pillX + 18, pillY + 19, 5, 0, Math.PI * 2)
        ctx.fill()

        // Badge Text
        ctx.fillStyle = '#FFFFFF'
        ctx.fillText(c.text, pillX + 32, pillY + 25)

        ctx.restore()
      }
    })

    // 5. Render Animated Simulated Cursor & Click Ripple
    if (scene.cursor.show) {
      const clickTime = scene.cursor.clickTimeSeconds || 2.5
      const startX = ((scene.cursor.startXPercent || 30) / 100) * width
      const startY = ((scene.cursor.startYPercent || 70) / 100) * height
      const targetX = ((scene.cursor.clickXPercent || 50) / 100) * width
      const targetY = ((scene.cursor.clickYPercent || 40) / 100) * height

      let curX = startX
      let curY = startY

      if (localTime < clickTime) {
        const moveProgress = Math.min(1, localTime / clickTime)
        // Smooth cubic ease-out motion
        const ease = 1 - Math.pow(1 - moveProgress, 3)
        curX = startX + ease * (targetX - startX)
        curY = startY + ease * (targetY - startY)
      } else {
        curX = targetX
        curY = targetY

        // Ripple pulse effect upon click
        const timeSinceClick = localTime - clickTime
        if (timeSinceClick < 1.0) {
          const rippleRadius = timeSinceClick * 35
          const rippleAlpha = 1 - timeSinceClick

          ctx.save()
          ctx.strokeStyle = 'rgba(241, 105, 6, ' + rippleAlpha + ')'
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.arc(targetX, targetY, rippleRadius, 0, Math.PI * 2)
          ctx.stroke()
          ctx.restore()
        }
      }

      // Draw Cursor Arrow
      ctx.save()
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)'
      ctx.shadowBlur = 8
      ctx.shadowOffsetY = 2

      ctx.fillStyle = '#FFFFFF'
      ctx.strokeStyle = '#0F172A'
      ctx.lineWidth = 1.5

      ctx.beginPath()
      ctx.moveTo(curX, curY)
      ctx.lineTo(curX + 16, curY + 16)
      ctx.lineTo(curX + 8, curY + 16)
      ctx.lineTo(curX + 5, curY + 23)
      ctx.lineTo(curX, curY + 21)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Cursor Label Badge
      if (scene.cursor.clickLabel && localTime >= clickTime - 0.5) {
        ctx.font = 'bold 12px Inter, sans-serif'
        const tw = ctx.measureText(scene.cursor.clickLabel).width
        ctx.fillStyle = '#F16906'
        ctx.beginPath()
        ctx.roundRect(curX + 18, curY + 5, tw + 16, 22, 6)
        ctx.fill()
        ctx.fillStyle = '#FFFFFF'
        ctx.fillText(scene.cursor.clickLabel, curX + 26, curY + 20)
      }
      ctx.restore()
    }

    // 5.5. Render Virtual Human AI Presenter Layer
    if (scene.presenter && scene.presenter.enabled && scene.presenter.mode !== 'none') {
      const pMode = scene.presenter.mode
      const pImg = presenterImgCacheRef.current.get(scene.presenter.avatarUrl || '')
      const pName =
        scene.presenter.profileId === 'priya-sharma'
          ? 'Priya Sharma'
          : scene.presenter.profileId === 'arjun-mallah'
          ? 'Arjun Mallah'
          : scene.presenter.profileId === 'neha-verma'
          ? 'Neha Verma'
          : 'AI Video Presenter'
      const pRole =
        scene.presenter.profileId === 'priya-sharma'
          ? 'Senior Solutions Specialist'
          : scene.presenter.profileId === 'arjun-mallah'
          ? 'Enterprise Product Architect'
          : scene.presenter.profileId === 'neha-verma'
          ? 'Academic & Pedagogical Consultant'
          : 'PrathamOne EduOS Presenter'

      if (pMode === 'full-screen') {
        ctx.save()
        // Studio backdrop overlay
        const studioGradient = ctx.createRadialGradient(
          width * 0.5,
          height * 0.45,
          width * 0.1,
          width * 0.5,
          height * 0.5,
          width * 0.7
        )
        studioGradient.addColorStop(0, '#13357B')
        studioGradient.addColorStop(0.5, '#071C44')
        studioGradient.addColorStop(1, '#030C20')
        ctx.fillStyle = studioGradient
        ctx.fillRect(0, 0, width, height)

        // Center Presenter Portrait
        const pSize = Math.min(width * 0.42, height * 0.65)
        const pX = (width - pSize) / 2
        const pY = height * 0.12

        // Soft halo
        ctx.shadowColor = 'rgba(241, 105, 6, 0.4)'
        ctx.shadowBlur = 50
        ctx.beginPath()
        ctx.roundRect(pX, pY, pSize, pSize, 28)
        ctx.fillStyle = '#0F172A'
        ctx.fill()

        if (pImg && pImg.complete) {
          ctx.save()
          ctx.beginPath()
          ctx.roundRect(pX, pY, pSize, pSize, 28)
          ctx.clip()
          ctx.drawImage(pImg, pX, pY, pSize, pSize)
          ctx.restore()
        }

        // Presenter Border
        ctx.strokeStyle = '#F16906'
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.roundRect(pX, pY, pSize, pSize, 28)
        ctx.stroke()

        // Lower-Third Corporate Chyron Banner
        const chW = width * 0.7
        const chH = 88
        const chX = (width - chW) / 2
        const chY = height - 150

        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
        ctx.shadowBlur = 30
        ctx.shadowOffsetY = 10

        const chGrad = ctx.createLinearGradient(chX, chY, chX + chW, chY)
        chGrad.addColorStop(0, 'rgba(15, 23, 42, 0.96)')
        chGrad.addColorStop(0.7, 'rgba(7, 28, 68, 0.94)')
        chGrad.addColorStop(1, 'rgba(15, 23, 42, 0.96)')
        ctx.fillStyle = chGrad
        ctx.beginPath()
        ctx.roundRect(chX, chY, chW, chH, 18)
        ctx.fill()

        // Accent indicator bar on left
        ctx.fillStyle = '#F16906'
        ctx.beginPath()
        ctx.roundRect(chX + 16, chY + 16, 6, chH - 32, 3)
        ctx.fill()

        // Name
        ctx.font = 'bold 26px Inter, sans-serif'
        ctx.fillStyle = '#FFFFFF'
        ctx.fillText(pName.toUpperCase(), chX + 38, chY + 38)

        // Role & Organization
        ctx.font = '500 16px Inter, sans-serif'
        ctx.fillStyle = '#94A3B8'
        ctx.fillText(`${pRole} • PrathamOne EduOS`, chX + 38, chY + 65)

        // Equalizer wave
        const eqX = chX + chW - 140
        const eqY = chY + chH / 2
        for (let b = 0; b < 6; b++) {
          const barH = 8 + Math.abs(Math.sin(currentTime * (8 + b * 2) + b)) * 26
          ctx.fillStyle = b % 2 === 0 ? '#F16906' : '#10B981'
          ctx.beginPath()
          ctx.roundRect(eqX + b * 18, eqY - barH / 2, 8, barH, 4)
          ctx.fill()
        }

        ctx.restore()
      } else if (pMode === 'pip') {
        // Floating Picture-in-Picture Badge
        ctx.save()
        const pipW = width * 0.16
        const pipH = pipW * 1.08
        const pos = scene.presenter.position || 'bottom-right'

        let pipX = width - pipW - 48
        let pipY = height - pipH - 100

        if (pos === 'bottom-left') {
          pipX = 48
          pipY = height - pipH - 100
        } else if (pos === 'top-right') {
          pipX = width - pipW - 48
          pipY = 56
        } else if (pos === 'top-left') {
          pipX = 48
          pipY = 56
        }

        // Shadow & Glow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)'
        ctx.shadowBlur = 35
        ctx.shadowOffsetY = 12

        // Card container
        ctx.fillStyle = '#0F172A'
        ctx.beginPath()
        ctx.roundRect(pipX, pipY, pipW, pipH, 20)
        ctx.fill()

        // Presenter Portrait
        if (pImg && pImg.complete) {
          ctx.save()
          ctx.beginPath()
          ctx.roundRect(pipX + 6, pipY + 6, pipW - 12, pipH - 62, 16)
          ctx.clip()
          ctx.drawImage(pImg, pipX + 6, pipY + 6, pipW - 12, pipH - 62)
          ctx.restore()
        }

        // Card Border with subtle glow
        ctx.strokeStyle = '#F16906'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.roundRect(pipX, pipY, pipW, pipH, 20)
        ctx.stroke()

        // Name tag at bottom of card
        ctx.fillStyle = '#0F172A'
        ctx.fillRect(pipX + 8, pipY + pipH - 52, pipW - 16, 44)

        ctx.font = 'bold 13px Inter, sans-serif'
        ctx.fillStyle = '#FFFFFF'
        ctx.fillText(pName, pipX + 16, pipY + pipH - 32)

        ctx.font = '500 10px Inter, sans-serif'
        ctx.fillStyle = '#94A3B8'
        ctx.fillText('AI Solutions Specialist', pipX + 16, pipY + pipH - 16)

        // Equalizer wave inside PIP badge
        const waveX = pipX + pipW - 55
        const waveY = pipY + pipH - 26
        for (let b = 0; b < 4; b++) {
          const barH = 4 + Math.abs(Math.sin(currentTime * (10 + b * 3) + b)) * 14
          ctx.fillStyle = '#10B981'
          ctx.beginPath()
          ctx.roundRect(waveX + b * 10, waveY - barH / 2, 4, barH, 2)
          ctx.fill()
        }

        ctx.restore()
      } else if (pMode === 'split-screen') {
        // Split-Screen Presenter Banner Overlay
        ctx.save()
        const colW = width * 0.3
        const colH = height * 0.8
        const colX = 40
        const colY = (height - colH) / 2

        ctx.fillStyle = 'rgba(15, 23, 42, 0.94)'
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
        ctx.shadowBlur = 30
        ctx.beginPath()
        ctx.roundRect(colX, colY, colW, colH, 20)
        ctx.fill()

        ctx.strokeStyle = '#F16906'
        ctx.lineWidth = 3
        ctx.stroke()

        if (pImg && pImg.complete) {
          ctx.save()
          ctx.beginPath()
          ctx.roundRect(colX + 16, colY + 16, colW - 32, colW - 32, 16)
          ctx.clip()
          ctx.drawImage(pImg, colX + 16, colY + 16, colW - 32, colW - 32)
          ctx.restore()
        }

        ctx.font = 'bold 20px Inter, sans-serif'
        ctx.fillStyle = '#FFFFFF'
        ctx.fillText(pName, colX + 24, colY + colW + 20)

        ctx.font = '500 13px Inter, sans-serif'
        ctx.fillStyle = '#FFA726'
        ctx.fillText(pRole, colX + 24, colY + colW + 42)

        ctx.restore()
      }
    }

    // 6. Render Subtitles / Captions
    if (scene.captions.show && scene.narration.script) {
      const text = scene.narration.script
      ctx.save()

      ctx.font = 'bold 22px Inter, sans-serif'
      const textW = ctx.measureText(text).width
      const capW = Math.min(width * 0.88, textW + 48)
      const capH = 48
      const capX = (width - capW) / 2
      const capY = height - 90

      // Pill Background with gradient
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
      ctx.shadowBlur = 18
      ctx.beginPath()
      ctx.roundRect(capX, capY, capW, capH, 24)
      ctx.fill()

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Subtitle Text
      ctx.fillStyle = '#FFFFFF'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, width / 2, capY + capH / 2, capW - 32)

      ctx.restore()
    }

    // 7. Render PrathamOne Official Watermark
    if (currentProject.theme.watermark) {
      ctx.save()
      const wmX = width - 180
      const wmY = 40

      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)'
      ctx.beginPath()
      ctx.roundRect(wmX - 10, wmY - 14, 160, 32, 16)
      ctx.fill()

      ctx.font = 'bold 12px Inter, sans-serif'
      ctx.fillStyle = '#FFA726'
      ctx.fillText('PrathamOne EduOS', wmX + 6, wmY + 6)
      ctx.restore()
    }
  }, [currentTime, currentProject, getSceneAtTime])

  // Continuous animation frame loop when playing
  useEffect(() => {
    let lastTimestamp = performance.now()

    const loop = (timestamp: number) => {
      const deltaSeconds = (timestamp - lastTimestamp) / 1000
      lastTimestamp = timestamp

      if (isPlaying) {
        const totalDuration = currentProject.scenes.reduce((sum, sc) => sum + sc.duration, 0)
        let nextTime = currentTime + deltaSeconds

        if (nextTime >= totalDuration) {
          nextTime = 0 // Loop or stop
          setIsPlaying(false)
        }
        setCurrentTime(nextTime)
      }

      renderFrame()
      animationFrameIdRef.current = requestAnimationFrame(loop)
    }

    animationFrameIdRef.current = requestAnimationFrame(loop)

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current)
      }
    }
  }, [isPlaying, currentTime, currentProject.scenes, setCurrentTime, setIsPlaying, renderFrame])

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 p-4 select-none overflow-hidden">
      {/* Aspect-Ratio Constrained Canvas Container */}
      <div
        className={`relative ${containerAspect} w-auto max-w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900 flex items-center justify-center`}
      >
        <canvas
          ref={canvasRef}
          onClick={togglePlayPause}
          className="w-full h-full object-contain cursor-pointer"
        />

        {/* Play/Pause Center Indicator overlay when paused */}
        {!isPlaying && (
          <div
            onClick={togglePlayPause}
            className="absolute inset-0 bg-slate-950/30 flex items-center justify-center cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-full bg-amber-500/90 text-slate-950 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
              <Play className="w-8 h-8 fill-current ml-1" />
            </div>
          </div>
        )}

        {/* Top Floating Mini Overlay: Resolution & Aspect Info */}
        <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs border border-slate-700/60 rounded-lg px-2.5 py-1 text-[10px] text-slate-300 font-mono flex items-center gap-2">
          <span className="text-amber-400 font-bold">{currentProject.aspectRatio}</span>
          <span>·</span>
          <span>
            {currentProject.resolution.width} &times; {currentProject.resolution.height}
          </span>
          <span>·</span>
          <span>30 FPS</span>
        </div>

        {/* Floating Quick Action Bar Bottom Right */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-xs border border-slate-700/60 rounded-lg p-1 text-slate-300">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
              title="Fullscreen Theater"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
