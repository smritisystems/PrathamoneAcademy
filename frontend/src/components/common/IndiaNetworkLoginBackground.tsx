/**
 * @file        IndiaNetworkLoginBackground.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.common
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-28
 * @updated     2026-11-28
 *
 * @description Interactive dotted India-network canvas backdrop with pulsing coaching city arcs, starfield, formulas, vector science diagrams, and left-aligned hero academy lockup.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  GLYPH_COLORS,
  INDIA_AMBIENT_WORDS,
  INDIA_CITY_HUBS,
  INDIA_FORMULAS,
  INDIA_GLYPH_CAPTIONS,
  INDIA_GLYPH_KINDS,
  INDIA_RINGS,
  LEFT_ALIGNED_CITIES,
  NEIGHBOR_RINGS,
  REGION_LABELS,
} from './indiaNetworkData'
import { splitInstituteTitle } from './DeepSpaceLoginBackground'

export interface IndiaNetworkLoginBackgroundProps {
  instituteName?: string
  instituteCity?: string
  instituteState?: string
  boards?: Array<{ name: string; code: string }>
  classes?: string[]
  subjects?: string[]
}

const FONT =
  "'Segoe UI','Noto Sans','Noto Sans Devanagari','Noto Sans Tamil','Noto Sans Bengali','Noto Sans Gujarati',system-ui,sans-serif"

function seededRand(seed: number, i: number) {
  const x = Math.sin(seed * 97.3 + i * 12.9) * 43758.5
  return x - Math.floor(x)
}

function rnd(a: number, b: number) {
  return a + Math.random() * (b - a)
}

function inRing(ring: number[][], x: number, y: number) {
  let insideFlag = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]
    const b = ring[j]
    if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) {
      insideFlag = !insideFlag
    }
  }
  return insideFlag
}

const DRAWING_FNS: Record<
  string,
  (g: CanvasRenderingContext2D, s: number, t: number, sd: number) => void
> = {
  dna(g, s, t) {
    const n = 40
    for (let k = 0; k < 2; k++) {
      g.beginPath()
      for (let i = 0; i <= n; i++) {
        const y = (i / n - 0.5) * s * 2
        const a = Math.sin(i * 0.35 + t * 0.8 + k * 3.14) * s * 0.3
        if (i) g.lineTo(a, y)
        else g.moveTo(a, y)
      }
      g.stroke()
    }
    g.beginPath()
    for (let i = 0; i <= n; i += 2) {
      const y = (i / n - 0.5) * s * 2
      const a = Math.sin(i * 0.35 + t * 0.8) * s * 0.3
      g.moveTo(a, y)
      g.lineTo(-a, y)
    }
    g.stroke()
  },
  cell(g, s) {
    g.beginPath()
    g.ellipse(0, 0, s * 0.8, s * 0.55, 0.2, 0, 6.3)
    g.stroke()
    g.beginPath()
    g.arc(-s * 0.1, 0, s * 0.22, 0, 6.3)
    g.moveTo(-s * 0.02, -s * 0.05)
    g.arc(-s * 0.1, -s * 0.05, s * 0.08, 0, 6.3)
    g.stroke()
    const organelles: Array<[number, number]> = [
      [0.4, -0.2],
      [0.35, 0.25],
      [-0.5, 0.22],
      [-0.45, -0.25],
    ]
    organelles.forEach((p) => {
      g.beginPath()
      g.ellipse(p[0] * s, p[1] * s, s * 0.12, s * 0.06, p[0], 0, 6.3)
      g.stroke()
    })
  },
  benzene(g, s) {
    g.beginPath()
    for (let i = 0; i < 6; i++) {
      const a = i * 1.047 + 0.52
      if (i) g.lineTo(Math.cos(a) * s * 0.6, Math.sin(a) * s * 0.6)
      else g.moveTo(Math.cos(a) * s * 0.6, Math.sin(a) * s * 0.6)
    }
    g.closePath()
    g.stroke()
    g.beginPath()
    g.arc(0, 0, s * 0.38, 0, 6.3)
    g.stroke()
  },
  atom(g, s, t) {
    for (let k = 0; k < 3; k++) {
      const r = k * 1.047
      g.beginPath()
      g.ellipse(0, 0, s * 0.8, s * 0.28, r, 0, 6.3)
      g.stroke()
      const a = t * 1.6 + k * 2
      const ex = Math.cos(a) * s * 0.8
      const ey = Math.sin(a) * s * 0.28
      g.beginPath()
      g.arc(ex * Math.cos(r) - ey * Math.sin(r), ex * Math.sin(r) + ey * Math.cos(r), 2.2, 0, 6.3)
      g.fill()
    }
    g.beginPath()
    g.arc(0, 0, s * 0.09, 0, 6.3)
    g.fill()
  },
  bars(g, s, _t, sd) {
    g.beginPath()
    g.moveTo(-s, -s * 0.7)
    g.lineTo(-s, s * 0.6)
    g.lineTo(s, s * 0.6)
    g.stroke()
    for (let i = 0; i < 5; i++) {
      const h = (0.25 + 0.7 * seededRand(sd, i)) * s * 1.1
      g.strokeRect(-s * 0.8 + i * s * 0.36, s * 0.6 - h, s * 0.22, h)
    }
  },
  line(g, s, _t, sd) {
    g.beginPath()
    g.moveTo(-s, -s * 0.7)
    g.lineTo(-s, s * 0.6)
    g.lineTo(s, s * 0.6)
    g.stroke()
    g.beginPath()
    for (let i = 0; i < 8; i++) {
      const x = -s * 0.85 + i * s * 0.25
      const y = s * 0.6 - (0.15 + 0.8 * seededRand(sd, i)) * s * 1.2
      if (i) g.lineTo(x, y)
      else g.moveTo(x, y)
    }
    g.stroke()
    for (let i = 0; i < 8; i++) {
      g.beginPath()
      g.arc(-s * 0.85 + i * s * 0.25, s * 0.6 - (0.15 + 0.8 * seededRand(sd, i)) * s * 1.2, 2, 0, 6.3)
      g.stroke()
    }
  },
  pie(g, s, _t, sd) {
    g.beginPath()
    g.arc(0, 0, s * 0.65, 0, 6.3)
    g.stroke()
    const a = seededRand(sd, 1) * 6
    g.beginPath()
    for (let i = 0; i < 3; i++) {
      g.moveTo(0, 0)
      g.lineTo(Math.cos(a + i * 2.1) * s * 0.65, Math.sin(a + i * 2.1) * s * 0.65)
    }
    g.stroke()
    g.beginPath()
    g.moveTo(s * 0.1, -s * 0.1)
    g.arc(s * 0.1, -s * 0.1, s * 0.78, -1.1, -0.3)
    g.closePath()
    g.stroke()
  },
  flow(g, s) {
    for (let i = 0; i < 3; i++) {
      const x = -s + i * s * 0.75
      g.strokeRect(x, -s * 0.22, s * 0.5, s * 0.44)
      if (i < 2) {
        g.beginPath()
        g.moveTo(x + s * 0.5, 0)
        g.lineTo(x + s * 0.75, 0)
        g.lineTo(x + s * 0.68, -s * 0.06)
        g.moveTo(x + s * 0.75, 0)
        g.lineTo(x + s * 0.68, s * 0.06)
        g.stroke()
      }
    }
  },
  parab(g, s) {
    g.beginPath()
    g.moveTo(-s, s * 0.55)
    g.lineTo(s, s * 0.55)
    g.moveTo(-s * 0.9, -s * 0.7)
    g.lineTo(-s * 0.9, s * 0.6)
    g.stroke()
    g.beginPath()
    for (let x = -0.8; x <= 0.85; x += 0.05) {
      const X = x * s
      const Y = s * 0.5 - x * x * s * 1.5
      if (x > -0.8) g.lineTo(X, Y)
      else g.moveTo(X, Y)
    }
    g.stroke()
    g.beginPath()
    g.moveTo(-s * 0.05, s * 0.5)
    g.lineTo(s * 0.7, s * 0.5 - 0.49 * s * 1.5)
    g.stroke()
  },
  neuron(g, s) {
    g.beginPath()
    g.arc(-s * 0.5, 0, s * 0.15, 0, 6.3)
    g.stroke()
    for (let i = 0; i < 5; i++) {
      const a = 2 + i * 0.55
      const x = -s * 0.5 + Math.cos(a) * s * 0.55
      const y = Math.sin(a) * s * 0.55
      g.beginPath()
      g.moveTo(-s * 0.5 + Math.cos(a) * s * 0.15, Math.sin(a) * s * 0.15)
      g.lineTo(x, y)
      g.lineTo(x + Math.cos(a + 0.6) * s * 0.2, y + Math.sin(a + 0.6) * s * 0.2)
      g.moveTo(x, y)
      g.lineTo(x + Math.cos(a - 0.6) * s * 0.2, y + Math.sin(a - 0.6) * s * 0.2)
      g.stroke()
    }
    g.beginPath()
    g.moveTo(-s * 0.35, 0)
    g.lineTo(s * 0.9, 0)
    g.stroke()
    for (let i = 0; i < 3; i++) {
      g.beginPath()
      g.ellipse(-s * 0.1 + i * s * 0.4, 0, s * 0.13, s * 0.07, 0, 0, 6.3)
      g.stroke()
    }
  },
  leaf(g, s) {
    g.beginPath()
    g.moveTo(-s, s * 0.4)
    g.quadraticCurveTo(-s * 0.2, -s * 0.8, s, -s * 0.3)
    g.quadraticCurveTo(s * 0.1, s * 0.8, -s, s * 0.4)
    g.stroke()
    g.beginPath()
    g.moveTo(-s, s * 0.4)
    g.quadraticCurveTo(0, 0, s, -s * 0.3)
    g.stroke()
    for (let i = 1; i < 6; i++) {
      const x = -s + i * s * 0.33
      const y = s * 0.4 - (i / 6) * s * 0.6
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + s * 0.15, y - s * 0.28)
      g.moveTo(x, y)
      g.lineTo(x + s * 0.1, y + s * 0.25)
      g.stroke()
    }
  },
  butterfly(g, s, t) {
    const f = 0.72 + 0.28 * Math.abs(Math.cos(t * 1.3))
    g.save()
    g.scale(f, 1)
    ;[1, -1].forEach((d) => {
      g.beginPath()
      g.moveTo(0, 0)
      g.bezierCurveTo(d * s * 1, -s * 0.95, d * s * 1.15, -s * 0.05, 0, s * 0.05)
      g.moveTo(0, s * 0.05)
      g.bezierCurveTo(d * s * 0.95, s * 0.1, d * s * 0.8, s * 0.85, 0, s * 0.3)
      g.stroke()
      g.beginPath()
      g.arc(d * s * 0.5, -s * 0.3, s * 0.1, 0, 6.3)
      g.stroke()
    })
    g.restore()
    g.beginPath()
    g.moveTo(0, -s * 0.25)
    g.lineTo(0, s * 0.4)
    g.moveTo(0, -s * 0.25)
    g.lineTo(-s * 0.2, -s * 0.55)
    g.moveTo(0, -s * 0.25)
    g.lineTo(s * 0.2, -s * 0.55)
    g.stroke()
  },
  fish(g, s, t) {
    const w = Math.sin(t * 2) * s * 0.08
    g.beginPath()
    g.moveTo(-s, 0)
    g.quadraticCurveTo(-s * 0.2, -s * 0.55, s * 0.6, w * 0.3)
    g.quadraticCurveTo(-s * 0.2, s * 0.55, -s, 0)
    g.stroke()
    g.beginPath()
    g.moveTo(s * 0.6, w * 0.3)
    g.lineTo(s * 1.05, -s * 0.4 + w)
    g.lineTo(s * 1.05, s * 0.4 + w)
    g.closePath()
    g.stroke()
    g.beginPath()
    g.arc(-s * 0.62, -s * 0.08, s * 0.05, 0, 6.3)
    g.moveTo(-s * 0.1, -s * 0.3)
    g.lineTo(s * 0.1, -s * 0.55)
    g.lineTo(s * 0.25, -s * 0.28)
    g.stroke()
  },
  shell(g, s) {
    g.beginPath()
    for (let a = 0; a < 14.5; a += 0.2) {
      const r = s * 0.045 * Math.exp(0.18 * a)
      if (a) g.lineTo(Math.cos(a) * r, Math.sin(a) * r)
      else g.moveTo(r, 0)
    }
    g.stroke()
  },
}

const CSS = `
.inb-root{position:absolute;inset:0;width:100%;height:100%;background:#050816;overflow:hidden;pointer-events:none;user-select:none}
.inb-root canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.inb-t{position:absolute;left:0;top:0;bottom:0;width:48%;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;text-align:left;pointer-events:none;box-sizing:border-box;padding:0 16px 64px clamp(24px,5%,60px);font-family:'Segoe UI','Noto Sans',system-ui,sans-serif;z-index:2}
.inb-t.inb-stacked{width:100%;right:0;bottom:auto;height:38%;align-items:center;text-align:center;justify-content:flex-end;padding:0 16px}
.inb-t small{letter-spacing:.45em;font-size:clamp(10px,1.15vw,15px);color:#cfe0ff;opacity:.85;font-weight:600}
.inb-t h1{margin:.15em 0 .1em;font-size:clamp(26px,3.6vw,58px);line-height:1.04;font-weight:900;letter-spacing:.04em;text-transform:uppercase;background:linear-gradient(100deg,#ffb36b,#ff7ab8 30%,#8a7bff 60%,#4fd8ff);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 22px rgba(120,130,255,.45));animation:inb-rise 1.6s cubic-bezier(.2,.8,.2,1) both}
.inb-t.inb-stacked h1{font-size:clamp(26px,7vw,50px)}
.inb-t p{margin:.4em 0 0;font-size:clamp(10.5px,1.1vw,15px);letter-spacing:.22em;color:#fff;opacity:.9;font-weight:600;text-transform:uppercase;animation:inb-rise 2s .3s cubic-bezier(.2,.8,.2,1) both}
@keyframes inb-rise{from{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.inb-t h1,.inb-t p{animation:none}}
`

export default function IndiaNetworkLoginBackground({
  instituteName,
  instituteCity,
  instituteState,
  boards = [],
  classes = [],
  subjects = [],
}: IndiaNetworkLoginBackgroundProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isCompact, setIsCompact] = useState(false)

  const title = useMemo(() => splitInstituteTitle(instituteName), [instituteName])

  const subtitleText = useMemo(() => {
    const parts: string[] = []
    if (instituteCity?.trim()) parts.push(instituteCity.trim())
    if (instituteState?.trim() && instituteState.trim().toLowerCase() !== instituteCity?.trim().toLowerCase()) {
      parts.push(instituteState.trim())
    }
    if (parts.length === 0) {
      return 'Gorakhpur ✦ Mumbai ✦ Pan-India'
    }
    return `${parts.join(' ✦ ')} ✦ Pan-India`
  }, [instituteCity, instituteState])

  const ambientWordList = useMemo(() => {
    const priority = [
      ...boards.map((b) => (b.code || b.name).trim().toUpperCase()),
      ...classes.map((c) => c.trim().toUpperCase()),
      ...subjects.map((s) => s.trim().toUpperCase()),
    ].filter(Boolean)
    return Array.from(new Set([...priority, ...INDIA_AMBIENT_WORDS]))
  }, [boards, classes, subjects])

  useEffect(() => {
    const root = rootRef.current
    const cv = canvasRef.current
    if (!root || !cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let W = 0
    let H = 0
    let dpr = 1
    let sy = 1
    let sx = 1
    let cx = 0
    let cy = 0
    let dots: HTMLCanvasElement | null = null
    let PR: number[][][] = []
    let PN: number[][][] = []
    let stars: Array<{ x: number; y: number; z: number; tw: number }> = []
    let words: Array<{ t: string; x: number; y: number; z: number; vx: number; vy: number; ph: number; fs: number }> = []
    const cityProj: Array<{ name: string; tier: number; x: number; y: number }> = []
    let arcs: Array<{ a: { x: number; y: number }; b: { x: number; y: number }; cx: number; cy: number; sp: number; ph: number; h: number }> = []
    const glyphs: Array<{
      live: boolean
      x: number
      y: number
      s: number
      k: string
      f: string
      c: string
      d: number
      t0: number
      r: number
      sd: number
    }> = []
    let mx = 0
    let my = 0
    let tx = 0
    let ty = 0
    let lastMove = -9
    let shoot: { x: number; y: number; l: number } | null = null
    let rafId = 0
    let last = 0

    function proj(lon: number, lat: number): [number, number] {
      return [cx + (lon - 79.1) * sx, cy + (18.2 - lat) * sy]
    }

    function inside(x: number, y: number) {
      for (let i = 0; i < PR.length; i++) {
        if (inRing(PR[i], x, y)) return true
      }
      return false
    }

    function spot(s: number): [number, number] | null {
      for (let n = 0; n < 300; n++) {
        const x = rnd(s, Math.max(s + 1, W - s))
        const y = rnd(s + 30, Math.max(s + 31, H - s - 30))
        if (inside(x, y) || inside(x + s * 0.8, y) || inside(x - s * 0.8, y) || inside(x, y + s * 0.8) || inside(x, y - s * 0.8)) {
          continue
        }
        if (W >= 540 ? x < W * 0.48 && y > H * 0.25 && y < H * 0.74 : y < H * 0.38) continue
        let ok = true
        for (let i = 0; i < glyphs.length; i++) {
          const o = glyphs[i]
          if (o.live && Math.hypot(o.x - x, o.y - y) < (o.s + s) * 1.8) {
            ok = false
            break
          }
        }
        if (ok) return [x, y]
      }
      return null
    }

    function spawn(g: (typeof glyphs)[number], t: number, init: boolean) {
      g.live = false
      const s = Math.max(20, Math.min(W, H) * 0.045) * rnd(0.85, 1.35)
      const p = spot(s)
      if (!p) return
      g.x = p[0]
      g.y = p[1]
      g.s = s
      g.k = INDIA_GLYPH_KINDS[(Math.random() * INDIA_GLYPH_KINDS.length) | 0]
      g.f = INDIA_FORMULAS[(Math.random() * INDIA_FORMULAS.length) | 0]
      g.c = GLYPH_COLORS[(Math.random() * GLYPH_COLORS.length) | 0]
      g.d = rnd(11, 18)
      g.t0 = init ? t - rnd(0, g.d * 0.9) : t
      g.r = rnd(-0.2, 0.2)
      g.sd = Math.random() * 100
      g.live = true
    }

    function build() {
      if (!root || !cv) return
      dpr = Math.min(2, window.devicePixelRatio || 1)
      W = Math.max(320, root.clientWidth || 720)
      H = Math.max(320, root.clientHeight || 720)
      cv.width = W * dpr
      cv.height = H * dpr

      const wide = W >= 540
      setIsCompact(!wide)
      sy = wide ? Math.min((H * 0.72) / 38.2, (W * 0.54) / (36.6 * 0.9)) : Math.min((H * 0.56) / 38.2, (W * 0.92) / (36.6 * 0.9))
      sx = sy * 0.9
      cx = wide ? W * 0.68 : W / 2
      cy = wide ? H * 0.47 : H * 0.6

      PR = INDIA_RINGS.map((r) => r.map((p) => proj(p[0], p[1])))
      const o = document.createElement('canvas')
      o.width = W * dpr
      o.height = H * dpr
      const g = o.getContext('2d')
      if (g) {
        g.scale(dpr, dpr)
        PN = NEIGHBOR_RINGS.map((r) => r.map((p) => proj(p[0], p[1])))
        const step = Math.max(6.5, sy * 0.4)
        g.strokeStyle = 'rgba(150,180,235,.32)'
        g.lineWidth = 1
        PN.forEach((P) => {
          g.beginPath()
          P.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])))
          g.closePath()
          g.stroke()
        })
        g.globalCompositeOperation = 'destination-out'
        g.fillStyle = '#000'
        g.beginPath()
        PR.forEach((P) => {
          P.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])))
          g.closePath()
        })
        g.fill()
        g.globalCompositeOperation = 'source-over'
        for (let y = 0; y < H; y += step) {
          for (let x = ((Math.floor(y / step) % 2) * step) / 2; x < W; x += step) {
            if (inside(x, y)) {
              g.fillStyle = 'rgba(120,175,255,.5)'
            } else {
              let n = false
              for (let k = 0; k < PN.length; k++) {
                if (inRing(PN[k], x, y)) {
                  n = true
                  break
                }
              }
              if (!n) continue
              g.fillStyle = 'rgba(150,170,215,.2)'
            }
            g.beginPath()
            g.arc(x, y, step * 0.14, 0, 6.3)
            g.fill()
          }
        }
        g.shadowColor = '#5aa0ff'
        g.shadowBlur = 18
        g.strokeStyle = 'rgba(140,190,255,.55)'
        g.lineWidth = 1.4
        PR.forEach((P) => {
          g.beginPath()
          P.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])))
          g.closePath()
          g.stroke()
        })
      }
      dots = o

      cityProj.length = 0
      INDIA_CITY_HUBS.forEach((c) => {
        const p = proj(c[1], c[2])
        cityProj.push({ name: c[0], tier: c[3], x: p[0], y: p[1] })
      })

      arcs = []
      ;[0, 1].forEach((h) => {
        cityProj.forEach((c, i) => {
          if (i === h || (h === 1 && i === 0)) return
          const a = cityProj[h]
          const dx = c.x - a.x
          const dy = c.y - a.y
          const d = Math.hypot(dx, dy)
          arcs.push({
            a,
            b: c,
            cx: (a.x + c.x) / 2 - dy * 0.22,
            cy: (a.y + c.y) / 2 + dx * 0.22 - d * 0.12,
            sp: rnd(0.12, 0.25),
            ph: Math.random(),
            h,
          })
        })
      })

      stars = []
      const starCount = Math.max(40, Math.floor((W * H) / 5500))
      for (let i = 0; i < starCount; i++) {
        stars.push({ x: Math.random() * W, y: Math.random() * H, z: rnd(0.15, 1), tw: rnd(0, 6.3) })
      }

      words = ambientWordList.slice(0, 42).map((t) => {
        const z = rnd(0.3, 1)
        return {
          t,
          x: Math.random() * W,
          y: Math.random() * H,
          z,
          vx: rnd(-6, 6) * z,
          vy: rnd(-5, -1) * z,
          ph: rnd(0, 6.3),
          fs: rnd(13, 22),
        }
      })

      glyphs.length = 0
      const glyphCount = W < 600 ? 8 : 13
      for (let i = 0; i < glyphCount; i++) {
        const gl = { live: false, x: 0, y: 0, s: 24, k: 'form', f: 'E = mc²', c: COLS_DEFAULT(), d: 14, t0: 0, r: 0, sd: 0 }
        glyphs.push(gl)
        spawn(gl, 0, true)
      }
    }

    function COLS_DEFAULT() {
      return GLYPH_COLORS[0]
    }

    function q(a: number, b: number, c: number, t: number) {
      const u = 1 - t
      return u * u * a + 2 * u * t * b + t * t * c
    }

    function drawWord(w: (typeof words)[number], t: number, base: number) {
      if (!ctx) return
      const sc = 1 + 0.09 * Math.sin(t * 0.6 + w.ph)
      const x = w.x + mx * w.z * 60
      const y = w.y + my * w.z * 45
      ctx.font = `700 ${(w.fs * w.z * sc).toFixed(1)}px ${FONT}`
      ctx.textAlign = 'center'
      ctx.fillStyle = `rgba(215,230,255,${(base * w.z * (0.75 + 0.25 * Math.sin(t * 0.5 + w.ph))).toFixed(3)})`
      ctx.fillText(w.t, x, y)
    }

    function drawGlyphs(t: number) {
      if (!ctx) return
      ctx.save()
      ctx.lineWidth = 1.1
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      glyphs.forEach((g) => {
        if (!g.live) {
          spawn(g, t, false)
          return
        }
        const u = (t - g.t0) / g.d
        if (u >= 1) {
          spawn(g, t, false)
          return
        }
        const a = u < 0.12 ? u / 0.12 : u < 0.3 ? 1 : Math.pow(1 - (u - 0.3) / 0.7, 1.3)
        const gl = u < 0.12 ? u / 0.12 : u < 0.3 ? 1 : Math.pow(1 - (u - 0.3) / 0.7, 2.4)
        const col = g.c
        ctx.strokeStyle = `rgba(${col},${(a * 0.95).toFixed(3)})`
        ctx.fillStyle = `rgba(${col},${(a * 0.95).toFixed(3)})`
        ctx.shadowColor = `rgba(${col},1)`
        ctx.shadowBlur = 2 + 18 * gl
        ctx.save()
        ctx.translate(g.x + mx * g.s * 0.4, g.y + my * g.s * 0.3)
        ctx.rotate(g.r)
        if (g.k === 'form') {
          ctx.font = `500 ${(g.s * (g.f.length > 16 ? 0.26 : 0.36)).toFixed(1)}px 'Cambria Math','STIX Two Math','Times New Roman',serif`
          ctx.fillText(g.f, 0, 0)
        } else {
          DRAWING_FNS[g.k]?.(ctx, g.s, t, g.sd)
          ctx.shadowBlur = 0
          ctx.font = `600 ${Math.max(7, g.s * 0.17).toFixed(1)}px ${FONT}`
          ctx.fillStyle = `rgba(${col},${(a * 0.6).toFixed(3)})`
          ctx.fillText(INDIA_GLYPH_CAPTIONS[g.k] || '', 0, g.s * 1.05)
        }
        ctx.restore()
      })
      ctx.restore()
    }

    function draw(t: number, dt: number) {
      if (!ctx) return
      const auto = t - lastMove > 3
      if (auto) {
        tx = Math.sin(t * 0.25) * 0.6
        ty = Math.cos(t * 0.2) * 0.35
      }
      mx += (tx - mx) * 0.05
      my += (ty - my) * 0.05

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const bgG = ctx.createLinearGradient(0, 0, 0, H)
      bgG.addColorStop(0, '#060a20')
      bgG.addColorStop(1, '#04050f')
      ctx.fillStyle = bgG
      ctx.fillRect(0, 0, W, H)

      const nebSpecs: Array<[number, number, string, number]> = [
        [0.25, 0.3, 'rgba(110,70,220,.22)', 0.5],
        [0.78, 0.7, 'rgba(30,150,220,.18)', 0.7],
      ]
      nebSpecs.forEach((n, i) => {
        const x = W * n[0] + Math.sin(t * 0.07 + i * 2) * 60 + mx * 30
        const y = H * n[1] + Math.cos(t * 0.06 + i) * 40
        const r = Math.max(W, H) * n[3]
        const rg = ctx.createRadialGradient(x, y, 0, x, y, r)
        rg.addColorStop(0, n[2])
        rg.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = rg
        ctx.fillRect(0, 0, W, H)
      })

      stars.forEach((s) => {
        const a = 0.35 + 0.45 * Math.sin(t * 1.3 + s.tw)
        ctx.globalAlpha = Math.max(0.1, a) * s.z
        ctx.fillStyle = '#dfe9ff'
        const x = (s.x + mx * s.z * 26 + W) % W
        const y = (s.y + my * s.z * 20 + H) % H
        ctx.fillRect(x, y, s.z * 1.9, s.z * 1.9)
      })
      ctx.globalAlpha = 1
      ctx.textBaseline = 'middle'

      words.forEach((w) => {
        w.x += w.vx * dt
        w.y += w.vy * dt
        if (w.x < -200) w.x = W + 100
        if (w.x > W + 200) w.x = -100
        if (w.y < -40) w.y = H + 40
        if (w.z < 0.62) drawWord(w, t, 0.55)
      })

      drawGlyphs(t)

      if (dots) {
        ctx.save()
        ctx.translate(mx * 14, my * 10)
        ctx.drawImage(dots, 0, 0, W, H)
        ctx.restore()
      }

      ctx.save()
      ctx.translate(mx * 14, my * 10)
      ctx.font = `600 ${Math.max(8, sy * 0.3)}px ${FONT}`
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(180,200,240,.28)'
      REGION_LABELS.forEach((n) => {
        const p = proj(n[1], n[2])
        ctx.fillText(n[0], p[0], p[1])
      })
      ctx.lineWidth = 1
      arcs.forEach((r) => {
        const col = r.h ? '80,225,255' : '255,160,70'
        ctx.strokeStyle = `rgba(${col},.16)`
        ctx.beginPath()
        ctx.moveTo(r.a.x, r.a.y)
        ctx.quadraticCurveTo(r.cx, r.cy, r.b.x, r.b.y)
        ctx.stroke()
        const u = (t * r.sp + r.ph) % 1
        for (let k = 0; k < 5; k++) {
          const v = u - k * 0.018
          if (v < 0) continue
          const x = q(r.a.x, r.cx, r.b.x, v)
          const y = q(r.a.y, r.cy, r.b.y, v)
          ctx.fillStyle = `rgba(${col},${0.9 - k * 0.17})`
          ctx.beginPath()
          ctx.arc(x, y, 2.4 - k * 0.35, 0, 6.3)
          ctx.fill()
        }
      })
      cityProj.forEach((c, i) => {
        const hub = c.tier < 2
        const col = c.tier === 0 ? '255,150,60' : '90,225,255'
        const pulse = (t * 0.5 + i * 0.37) % 1
        const r = c.tier === 0 ? 7 : c.tier === 1 ? 3.2 : c.tier === 2 ? 3.6 : 2.6
        const rg = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r * 5)
        rg.addColorStop(0, `rgba(${col},.55)`)
        rg.addColorStop(1, `rgba(${col},0)`)
        ctx.fillStyle = rg
        ctx.beginPath()
        ctx.arc(c.x, c.y, r * 5, 0, 6.3)
        ctx.fill()

        ctx.strokeStyle = `rgba(${col},${(1 - pulse) * 0.8})`
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.arc(c.x, c.y, r + pulse * r * (hub ? 7 : 4), 0, 6.3)
        ctx.stroke()

        ctx.fillStyle = `rgb(${col})`
        ctx.beginPath()
        ctx.arc(c.x, c.y, r, 0, 6.3)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(c.x, c.y, r * 0.45, 0, 6.3)
        ctx.fill()

        const fs = [Math.max(16, sy * 0.72), Math.max(8, sy * 0.3), Math.max(10, sy * 0.38), Math.max(8, sy * 0.3)][c.tier]
        ctx.font = `${c.tier < 3 ? '700 ' : '600 '}${fs}px ${FONT}`
        ctx.fillStyle = c.tier === 1 ? 'rgba(190,240,255,.8)' : `rgba(255,255,255,${c.tier === 0 ? 1 : c.tier === 2 ? 0.9 : 0.6})`
        const alignLeft = Boolean(LEFT_ALIGNED_CITIES[c.name])
        ctx.textAlign = alignLeft ? 'right' : 'left'
        if (c.tier === 0) {
          ctx.shadowColor = '#ff8a30'
          ctx.shadowBlur = 14
        }
        if (c.tier < 3 || sy >= 15) {
          ctx.fillText(c.name.toUpperCase(), alignLeft ? c.x - r - 5 : c.x + r + 5, c.y - r * 0.4)
        }
        ctx.shadowBlur = 0
      })
      ctx.restore()

      words.forEach((w) => {
        if (w.z >= 0.62) drawWord(w, t, 0.4)
      })

      if (!shoot && Math.random() < dt * 0.15) {
        shoot = { x: rnd(0, W * 0.7), y: rnd(0, H * 0.35), l: 0 }
      }
      if (shoot) {
        shoot.l += dt * 1.6
        const s = shoot
        const a = Math.sin(Math.min(1, s.l) * 3.14)
        const x = s.x + s.l * 340
        const y = s.y + s.l * 150
        const lg = ctx.createLinearGradient(x, y, x - 120, y - 52)
        lg.addColorStop(0, `rgba(255,255,255,${a})`)
        lg.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.strokeStyle = lg
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x - 120, y - 52)
        ctx.stroke()
        if (s.l > 1) shoot = null
      }
    }

    function loop(ms: number) {
      const t = ms / 1000
      const dt = Math.min(0.05, t - last)
      last = t
      draw(t, dt)
      rafId = requestAnimationFrame(loop)
    }

    function move(clientX: number, clientY: number) {
      if (!root) return
      const rect = root.getBoundingClientRect()
      const relX = clientX - rect.left
      const relY = clientY - rect.top
      tx = (relX / Math.max(1, W) - 0.5) * 2
      ty = (relY / Math.max(1, H) - 0.5) * 2
      lastMove = last
    }

    const onPointer = (e: PointerEvent) => move(e.clientX, e.clientY)
    const onTouch = (e: TouchEvent) => {
      const p = e.touches[0]
      if (p) move(p.clientX, p.clientY)
    }

    build()
    if (reduce) {
      draw(0, 0)
    } else {
      rafId = requestAnimationFrame(loop)
    }

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(build) : null
    ro?.observe(root)
    window.addEventListener('pointermove', onPointer)
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('resize', build)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      ro?.disconnect()
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('resize', build)
    }
  }, [ambientWordList])

  return (
    <div ref={rootRef} className="inb-root" aria-hidden="true">
      <style>{CSS}</style>
      <canvas ref={canvasRef} />
      <div className={`inb-t${isCompact ? ' inb-stacked' : ''}`} aria-label={instituteName || 'Your Academy Name'}>
        <small>WELCOME TO</small>
        <h1>
          {title.topLine ? (
            <>
              {title.topLine}
              <br />
              {title.bottomLine}
            </>
          ) : (
            title.bottomLine
          )}
        </h1>
        <p>{subtitleText}</p>
      </div>
    </div>
  )
}
