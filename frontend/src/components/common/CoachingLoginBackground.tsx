/**
 * @file        CoachingLoginBackground.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.common
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.4.0
 * @created     2026-11-23
 * @updated     2026-11-23
 *
 * @description Master enterprise visual architecture for coaching institute authentication portal. Features the Grand Brand Logo Crown positioned prominently above the Living Academic Command Bento Deck, volumetric Aurora Mesh lighting, high-tech precision dot-matrix grid, interactive constellation laser network, real-time classroom telemetry waveform, and Maharashtra Apex Flagship accreditation with GPU-accelerated 3D parallax physics.
 */

import React, { useEffect, useRef, useMemo, useState } from 'react'

export interface CoachingLoginBackgroundProps {
  className?: string
  parallax?: boolean
  layout?: 'screen' | 'panel'
  instituteName?: string
  instituteState?: string
  logoUrl?: string
  background?: string
  intensity?: number
  logoOpacity?: number
}

const MAX_SHIFT = 16 // px, parallax maximum translation
const DAMPING = 0.05 // smooth spring physics

/* Authentic PrathamOne EduOS logo compound path */
const LOGO_D =
  'm 304.98108,0.00384004 c -3.694,0.0858 -9.1467,1.71053996 -14.6328,3.62303996 -5.4861,1.9125 -11.0006,4.11565 -14.7735,5.36328 -19.2396,6.37986 -38.5187,12.65973 -57.8183,18.84961 -20.2222,6.49068 -40.2615,13.52066 -60.42,20.16016 -2.0114,0.66551 -5.962,1.58865 -9.6582,2.80859 -1.848,0.60997 -3.6333,1.29363 -5.0878,2.0625 -1.4545,0.76888 -2.582,1.61978 -3.1036,2.58985 -0.7502,1.39774 -0.506,2.66227 -0.4961,4.11914 a 0.1250125,0.1250125 0 0 0 0.025,0.0742 c 3.9171,5.29361 12.9545,7.06916 18.8672,9.21289 12.2775,4.44908 24.419,9.29926 36.7422,13.65039 4.57,1.61646 9.1959,3.91179 14.0235,4.5957 a 0.1250125,0.1250125 0 0 0 0.1386,-0.0918 c 0.531,-2.01245 0.9348,-5.79974 1.4532,-9.41796 0.2591,-1.80911 0.5465,-3.57504 0.8886,-5.04688 0.3421,-1.47184 0.7458,-2.65287 1.2071,-3.27344 1.0964,-1.48141 3.2532,-2.58755 5.5664,-3.4707 2.3131,-0.88316 4.7779,-1.5468 6.498,-2.18555 11.2219,-4.14698 22.7744,-7.0854 34.4805,-9.47461 34.94,-7.11593 71.472,-5.64844 105.9648,3.11719 11.5671,2.93673 24.2919,5.59806 34.6387,11.74414 1.1862,6.08995 2.3823,12.17983 3.5684,18.26953 a 0.1250125,0.1250125 0 0 0 0.166,0.0937 c 13.444,-4.87969 26.8976,-9.76079 40.3418,-14.65039 v 11.11914 c -3.2136,3.04906 -4.3222,5.29002 -4.2071,7.64258 0.1154,2.35603 1.4199,4.79949 2.9297,8.31055 -2.9329,8.33204 -4.1231,17.24135 -5.5,25.92187 -0.6016,3.79875 -1.5723,7.67831 -1.4316,11.51368 h 0.2558 25.295 0.2578 c 0.2103,-3.82322 -1.1969,-7.74487 -1.8906,-11.42774 -1.7179,-9.08841 -3.8755,-17.96572 -6.0118,-26.93945 1.8547,-2.59352 2.9933,-5.50788 2.8711,-8.20899 -0.122,-2.69741 -1.5205,-5.16767 -4.6582,-6.83398 V 69.94127 c 3.1533,-1.93319 8.3194,-2.90711 12.7754,-4.5293 2.2391,-0.81513 4.2984,-1.79747 5.832,-3.16602 1.5337,-1.36855 2.5361,-3.13066 2.6426,-5.4707 a 0.1250125,0.1250125 0 0 0 -0.018,-0.0723 c -1.7845,-2.91 -5.0601,-4.58377 -8.6172,-5.8125 -3.557,-1.22872 -7.4056,-2.0148 -10.3554,-3.11914 -1.5844,-0.59043 -2.7298,-1.60989 -3.8653,-2.65039 -1.1354,-1.04049 -2.2602,-2.10273 -3.8007,-2.73828 -4.0982,-1.68986 -8.5298,-0.54485 -12.6797,-1.52539 -8.616,-2.02669 -16.9429,-5.56388 -25.3907,-8.23633 -24.008,-7.58938 -47.8384,-15.77095 -71.7695,-23.61132 -4.1925,-1.36756 -9.8897,-3.66221 -15.5918,-5.59375 -5.702,-1.93154 -11.4051,-3.50281996 -15.6484,-3.41210996 z'

const STARS = [
  [14, 8], [32, 14], [8, 22], [48, 6], [62, 12], [88, 10], [94, 25],
  [6, 48], [12, 72], [28, 92], [45, 95], [68, 88], [85, 82], [96, 75],
  [22, 38], [78, 28], [82, 64], [18, 84]
].map(([x, y], i) => ({
  x, y,
  s: 1.5 + (i % 3) * 0.8,
  d: 3.5 + (i % 4) * 1.2,
  delay: -((i * 1.8) % 7)
}))

/* Constellation Nodes around the Central Bento Hub */
const CONSTELLATION_NODES = [
  { id: 'n-math', x: 14, y: 22, label: 'CALCULUS', sub: '∫ tⁿ dt', icon: '∑', k: 0.6 },
  { id: 'n-phys', x: 86, y: 16, label: 'PHYSICS', sub: 'QUANTUM', icon: '⚛', k: 0.8 },
  { id: 'n-chem', x: 88, y: 78, label: 'CHEMISTRY', sub: 'ORGANIC', icon: '⬡', k: 0.7 },
  { id: 'n-bio', x: 12, y: 80, label: 'GENETICS', sub: 'CELLULAR', icon: '🧬', k: 0.9 },
  { id: 'n-cbse', x: 26, y: 12, label: 'CBSE • ICSE', sub: 'BOARD APEX', icon: '★', k: 0.5 },
  { id: 'n-jee', x: 74, y: 88, label: 'JEE • NEET', sub: 'SUPER-60', icon: '🎯', k: 0.6 }
]

export default function CoachingLoginBackground({
  className = '',
  parallax = true,
  layout = 'panel',
  instituteName = 'MY NO.1 ACADEMY',
  instituteState = 'MAHARASHTRA',
  logoUrl,
  background,
  intensity = 1.0,
}: CoachingLoginBackgroundProps) {
  const isPanel = layout === 'panel'
  const rootRef = useRef<HTMLDivElement>(null)
  const deckRef = useRef<HTMLDivElement>(null)

  const activeName = (instituteName || 'MY NO.1 ACADEMY').trim()
  const activeState = (instituteState || 'MAHARASHTRA').trim().toUpperCase()

  // Dynamic Audio/Classroom Equalizer Waveform Heights
  const [waveHeights, setWaveHeights] = useState<number[]>([
    45, 75, 90, 60, 35, 85, 100, 70, 50, 80, 95, 65, 40, 70, 85, 55
  ])

  useEffect(() => {
    const timer = setInterval(() => {
      setWaveHeights(prev =>
        prev.map(() => Math.floor(25 + Math.random() * 75))
      )
    }, 1400)
    return () => clearInterval(timer)
  }, [])

  // GPU-Accelerated Mouse Parallax and 3D Card Tilt
  useEffect(() => {
    if (!parallax || typeof window === 'undefined') return
    const root = rootRef.current
    const deck = deckRef.current
    if (!root) return

    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0
    const layers = Array.from(root.querySelectorAll<HTMLElement>('[data-k]'))

    const tick = () => {
      cx += (tx - cx) * DAMPING
      cy += (ty - cy) * DAMPING

      // Multi-layer parallax shift
      for (const el of layers) {
        const k = +(el.dataset.k || '1')
        el.style.transform = `translate3d(${(cx * k).toFixed(2)}px, ${(cy * k).toFixed(2)}px, 0)`
      }

      // Subtle 3D Card Tilt on Hero Bento Deck
      if (deck) {
        const rotX = -(cy * 0.35).toFixed(2)
        const rotY = (cx * 0.35).toFixed(2)
        deck.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translate3d(${(cx * 0.35).toFixed(2)}px, ${(cy * 0.35).toFixed(2)}px, 0)`
      }

      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.04 ? requestAnimationFrame(tick) : 0
    }

    const onMove = (e: MouseEvent) => {
      tx = -((e.clientX / window.innerWidth) * 2 - 1) * MAX_SHIFT
      ty = -((e.clientY / window.innerHeight) * 2 - 1) * MAX_SHIFT
      if (!raf) raf = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [parallax])

  return (
    <div
      ref={rootRef}
      className={`clb-root ${isPanel ? 'clb-panel' : ''} ${className}`}
      style={{ background: background || 'transparent' }}
      aria-hidden="true"
    >
      <style>{CSS}</style>

      {/* 1. ATMOSPHERIC AURORA MESH VOLUMETRIC LIGHTING */}
      <div className="clb-aurora-layer pointer-events-none select-none">
        {/* Electric Cyan Radial Flare (Top Left) */}
        <div className="clb-orb clb-orb-cyan" />
        {/* Royal Indigo / Sapphire Core (Center Right) */}
        <div className="clb-orb clb-orb-indigo" />
        {/* Saffron / Amber Radiant Aura (Bottom Left Maharashtra Tribute) */}
        <div className="clb-orb clb-orb-saffron" />
      </div>

      {/* 2. HIGH-TECH PRECISION DOT-MATRIX ENGINEERING GRID */}
      <div className="clb-tech-grid pointer-events-none select-none" />

      {/* 3. SUBTLE TWINKLING CELESTIAL STARDUST */}
      {STARS.map((s, i) => (
        <span
          key={i}
          className="clb-star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.s}px`,
            height: `${s.s}px`,
            animationDuration: `${s.d}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}

      {/* 4. CONSTELLATION LASER WEB & HARMONIC ORBITAL NODES */}
      <svg className="clb-constellation-lines pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="clb-laser-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#818cf8" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <line x1="14" y1="22" x2="50" y2="45" stroke="url(#clb-laser-1)" strokeWidth="0.2" strokeDasharray="1, 1.5" />
        <line x1="86" y1="16" x2="50" y2="45" stroke="url(#clb-laser-1)" strokeWidth="0.2" strokeDasharray="1, 1.5" />
        <line x1="88" y1="78" x2="50" y2="55" stroke="url(#clb-laser-1)" strokeWidth="0.2" strokeDasharray="1, 1.5" />
        <line x1="12" y1="80" x2="50" y2="55" stroke="url(#clb-laser-1)" strokeWidth="0.2" strokeDasharray="1, 1.5" />
        <line x1="26" y1="12" x2="50" y2="30" stroke="url(#clb-laser-1)" strokeWidth="0.18" />
        <line x1="74" y1="88" x2="50" y2="70" stroke="url(#clb-laser-1)" strokeWidth="0.18" />
      </svg>

      {/* Parallax Floating Discipline Orbit Chips */}
      {CONSTELLATION_NODES.map((node) => (
        <div
          key={node.id}
          data-k={node.k}
          className="clb-node-pos hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md shadow-xs select-none"
          style={{ left: `${node.x}%`, top: `${node.y}%` }}
        >
          <span className="text-[12px] text-cyan-400 font-mono">{node.icon}</span>
          <div className="flex flex-col leading-none">
            <span className="text-[9.5px] font-mono tracking-wider text-slate-200 font-semibold uppercase">{node.label}</span>
            <span className="text-[8px] font-mono text-cyan-300/70">{node.sub}</span>
          </div>
        </div>
      ))}

      {/* 5. THE CENTERPIECE: BRAND CROWN + LIVING ACADEMIC COMMAND BENTO DECK */}
      <div className="clb-bento-anchor">
        <div ref={deckRef} className="clb-hero-stack">

          {/* SECTION A: GRAND BRAND LOGO CROWN (PROUDLY ELEVATED ABOVE THE BOX) */}
          <div className="flex flex-col items-center text-center mb-3.5 select-none">
            {/* Illuminated Brand Logo Crest Plate */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/[0.1] border border-white/25 p-2 sm:p-2.5 flex items-center justify-center shrink-0 shadow-2xl shadow-cyan-950/80 backdrop-blur-md relative overflow-hidden group mb-2.5">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={activeName}
                  className="w-full h-full object-contain filter drop-shadow(0 4px 10px rgba(0,0,0,0.6))"
                />
              ) : (
                <svg viewBox="0 0 610.17 305.69" className="w-full h-full text-cyan-300 fill-current" fillRule="evenodd">
                  <path d={LOGO_D} />
                </svg>
              )}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent pointer-events-none" />
            </div>

            {/* Prominent Institute Title */}
            <h1 className="text-xl sm:text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-200 bg-clip-text text-transparent font-sans">
              {activeName}
            </h1>

            {/* Official Maharashtra Accreditation Beacon */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 font-mono text-[10.5px] font-bold tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>{activeState} APEX CAMPUS • STATE RANK #1</span>
            </div>
          </div>

          {/* SECTION B: THE COMMAND BENTO BOX */}
          <div className="clb-bento-deck">
            {/* Shimmering Top Laser Prism Edge */}
            <div className="clb-deck-prism" />

            {/* TIER 1: LIVE OPERATIONS HEADER */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-mono font-semibold text-slate-200 tracking-wide uppercase">
                  Academic Command Deck
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-mono text-[10px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>OPERATIONAL</span>
              </div>
            </div>

            {/* TIER 2: REAL-TIME CLASSROOM VITALITY WAVEFORM */}
            <div className="my-3 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-mono text-cyan-300 font-bold uppercase tracking-wider">
                    Campus Vitality Spectrum
                  </span>
                  <span className="text-[11.5px] text-slate-300 font-sans truncate font-medium">
                    14 Batches in Session • Term-2 & Pre-Board Acceleration
                  </span>
                </div>
              </div>

              {/* Harmonic Visualizer Bars */}
              <div className="flex items-end gap-1 h-6 shrink-0" title="Live Academic Activity Pulse">
                {waveHeights.map((h, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full transition-all duration-700 ease-out"
                    style={{
                      height: `${h}%`,
                      background: i % 3 === 0
                        ? 'linear-gradient(to top, #0ea5e9, #38bdf8)'
                        : i % 2 === 0
                        ? 'linear-gradient(to top, #10b981, #34d399)'
                        : 'linear-gradient(to top, #f59e0b, #fbbf24)',
                      opacity: 0.75 + (h / 100) * 0.25
                    }}
                  />
                ))}
              </div>
            </div>

            {/* TIER 3: TRIPLE BENTO METRICS GRID */}
            <div className="grid grid-cols-3 gap-2.5">
              {/* Tile 1: Board Mastery */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 transition-colors flex flex-col justify-between">
                <div className="text-cyan-300 font-mono text-lg sm:text-xl font-extrabold tracking-tight">
                  99.4%
                </div>
                <div className="mt-1">
                  <div className="text-[10.5px] font-sans font-semibold text-slate-200 leading-tight">Board Mastery</div>
                  <div className="text-[9px] font-mono text-slate-400 mt-0.5 truncate">Class 10 & 12 Pass</div>
                </div>
                <div className="w-full bg-white/10 h-1 rounded-full mt-2 overflow-hidden">
                  <div className="bg-cyan-400 h-full rounded-full" style={{ width: '99.4%' }} />
                </div>
              </div>

              {/* Tile 2: Active Scholars */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 transition-colors flex flex-col justify-between">
                <div className="text-emerald-400 font-mono text-lg sm:text-xl font-extrabold tracking-tight">
                  1,250+
                </div>
                <div className="mt-1">
                  <div className="text-[10.5px] font-sans font-semibold text-slate-200 leading-tight">Scholars Enrolled</div>
                  <div className="text-[9px] font-mono text-slate-400 mt-0.5 truncate">NEET & JEE Super-60</div>
                </div>
                <div className="w-full bg-white/10 h-1 rounded-full mt-2 overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: '92%' }} />
                </div>
              </div>

              {/* Tile 3: Maharashtra Flagship */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-amber-400/25 transition-colors flex flex-col justify-between">
                <div className="text-amber-300 font-mono text-lg sm:text-xl font-extrabold tracking-tight truncate">
                  APEX
                </div>
                <div className="mt-1">
                  <div className="text-[10.5px] font-sans font-semibold text-amber-200 leading-tight truncate">
                    {activeState}
                  </div>
                  <div className="text-[9px] font-mono text-amber-400/80 mt-0.5 truncate">Pinnacle Centre</div>
                </div>
                <div className="w-full bg-white/10 h-1 rounded-full mt-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-400 to-orange-400 h-full rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
            </div>

            {/* TIER 4: CULTURAL ANCHOR & CITATION */}
            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10.5px] font-mono text-slate-400 select-none">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="text-amber-400">⚡</span>
                <span>Autonomous Education Operating System</span>
              </span>
              <span className="text-cyan-300/80 font-semibold tracking-wider">
                PRATHAMONE EduOS
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const CSS = `
.clb-root {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  user-select: none;
  contain: strict;
  background: radial-gradient(circle at 50% 40%, #081736 0%, #040c1d 60%, #020610 100%);
}
.clb-panel {
  position: absolute;
}
.clb-aurora-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.clb-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  will-change: transform, opacity;
}
.clb-orb-cyan {
  top: -10%;
  left: 15%;
  width: 32rem;
  height: 32rem;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.35) 0%, rgba(14, 165, 233, 0.15) 50%, transparent 80%);
  animation: clb-drift-cyan 18s ease-in-out infinite alternate;
}
.clb-orb-indigo {
  top: 35%;
  right: 5%;
  width: 34rem;
  height: 34rem;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.28) 0%, rgba(79, 70, 229, 0.12) 60%, transparent 80%);
  animation: clb-drift-indigo 22s ease-in-out infinite alternate;
}
.clb-orb-saffron {
  bottom: -5%;
  left: 5%;
  width: 28rem;
  height: 28rem;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.22) 0%, rgba(217, 119, 6, 0.08) 55%, transparent 75%);
  animation: clb-drift-saffron 20s ease-in-out infinite alternate;
}
@keyframes clb-drift-cyan {
  0% { transform: translate3d(0, 0, 0) scale(1); }
  100% { transform: translate3d(40px, 30px, 0) scale(1.08); }
}
@keyframes clb-drift-indigo {
  0% { transform: translate3d(0, 0, 0) scale(1); }
  100% { transform: translate3d(-35px, -25px, 0) scale(1.06); }
}
@keyframes clb-drift-saffron {
  0% { transform: translate3d(0, 0, 0) scale(1); }
  100% { transform: translate3d(25px, -30px, 0) scale(1.1); }
}
.clb-tech-grid {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.09) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: radial-gradient(circle at 45% 50%, black 50%, transparent 95%);
  -webkit-mask-image: radial-gradient(circle at 45% 50%, black 50%, transparent 95%);
  opacity: 0.85;
}
.clb-star {
  position: absolute;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 0 6px 1px rgba(224, 242, 254, 0.7);
  animation: clb-star-twinkle 6s ease-in-out infinite;
}
@keyframes clb-star-twinkle {
  0%, 100% { opacity: 0.15; transform: scale(0.8); }
  50% { opacity: 0.8; transform: scale(1.3); }
}
.clb-constellation-lines {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.55;
}
.clb-node-pos {
  position: absolute;
  translate: -50% -50%;
  will-change: transform;
  z-index: 5;
}
.clb-bento-anchor {
  position: absolute;
  left: 48%;
  top: 50%;
  translate: -50% -50%;
  width: min(92%, 530px);
  z-index: 10;
}
.clb-hero-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  transition: transform 0.15s ease-out;
  will-change: transform;
}
.clb-bento-deck {
  position: relative;
  width: 100%;
  background: rgba(10, 22, 48, 0.78);
  backdrop-filter: blur(24px) saturate(200%);
  -webkit-backdrop-filter: blur(24px) saturate(200%);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow:
    0 30px 60px -15px rgba(0, 0, 0, 0.7),
    0 0 50px rgba(56, 189, 248, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
  border-radius: 24px;
  padding: 20px;
}
.clb-deck-prism {
  position: absolute;
  top: 0;
  left: 10%;
  right: 10%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.8), rgba(245, 158, 11, 0.8), transparent);
  border-radius: 2px;
}
@media (max-width: 640px) {
  .clb-bento-anchor {
    left: 50%;
    width: 95%;
  }
  .clb-bento-deck {
    padding: 16px;
    border-radius: 18px;
  }
}
`

export { CoachingLoginBackground }
