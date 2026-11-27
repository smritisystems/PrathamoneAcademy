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
 * @version     2.0.0
 * @created     2026-11-23
 * @updated     2026-11-28
 *
 * @description Interactive academic parallax background for the coaching institute authentication portal. Features translucent sheen-swept PrathamOne emblem, cursor-tracking spotlight gradient, dynamic SVG institute typography crown, twinkling stardust, mathematical formulas, scientific vector icons, pan-India state markers, and regional Indian scripts cleanly framed inside panel safe-zones.
 */

import React, { useEffect, useMemo, useRef } from 'react'

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

const MAX_SHIFT = 15
const DAMPING = 0.06
const LAYERS = [0.5, 0.75, 1] as const
const NAVY_BG =
  'radial-gradient(circle at 50% 50%, rgba(99,102,241,.22), transparent 60%), linear-gradient(135deg,#0a1228 0%,#12214a 55%,#1a2f63 100%)'

const LOGO_D =
  'M 278.6,301.9 C 266.6,292.8 247,282.5 229,275.9 C 211,269.2 187.5,264.1 163.4,261.7 C 140.8,259.5 106.4,260.4 82.6,264 C 78.8,264.6 75.5,265 75.3,265 C 75.1,265 74.9,213.8 74.9,151.2 L 74.9,37.4 L 88.3,37.6 L 101.7,37.8 L 101.5,49.2 L 101.3,60.6 L 99.2,60.9 L 97,61.1 L 97.2,150.2 L 97.4,239.2 L 122.4,239.6 C 139.4,239.8 149.8,240.3 155.1,241.1 C 206.9,248.5 243.2,263.5 269.1,288.5 C 275.8,294.9 285.1,305.8 283.8,305.7 C 283.7,305.7 281.3,304 278.6,301.9 L 278.6,301.9 M 286.8,283.2 C 251.6,247.5 193.4,225.8 128.1,223.8 L 113.1,223.3 L 112.9,112 C 112.8,50.9 113,0.6 113.3,0.3 C 113.5,-0 119.2,0.1 125.9,0.4 C 180.6,3.4 228.2,19 259.8,44.5 C 267.3,50.5 277.2,61.2 282.3,68.7 C 286,74 292.5,85.8 292.5,87.1 C 292.5,87.3 291,85.6 289.1,83.3 C 276.3,68 253.7,52.8 228.7,42.8 C 202.5,32.3 176,26.6 142.5,24.2 L 135.5,23.7 L 135.5,112.3 L 135.5,200.8 L 137.6,200.8 C 138.7,200.8 141.1,201 142.9,201.3 L 146.3,201.7 L 146.3,176.7 L 146.3,151.6 L 158,151.6 L 169.8,151.6 L 169.8,178.3 L 169.8,205.1 L 172.5,205.7 C 173.9,206.1 176.2,206.6 177.5,206.9 L 179.8,207.4 L 179.8,158.4 L 179.8,109.5 L 191.2,109.5 L 202.6,109.5 L 202.6,161.6 L 202.6,213.7 L 205.9,215.1 C 207.7,215.9 209.9,216.7 210.9,217 L 212.6,217.4 L 212.6,174.5 L 212.6,131.6 L 224,131.8 L 235.5,132 L 235.5,177.6 C 235.5,202.8 235.7,224.6 236,226.1 C 236.4,228.6 237,229.2 241,231.6 L 245.4,234.3 L 245.4,158 L 245.4,81.7 L 257.2,81.7 L 269,81.7 L 269,167.7 L 269,253.7 L 274,259.6 C 276.8,262.8 280.8,267.9 283,270.9 C 286.9,276.5 293.6,288.4 293.1,289 C 292.9,289.1 290.1,286.5 286.8,283.1 L 286.8,283.2 M 314.6,305.1 C 314.6,304.5 320.4,297 323.5,293.6 C 328.2,288.5 339.4,279.4 347.8,273.9 C 370.7,258.8 397,249 429.8,243.4 C 447.7,240.3 459.8,239.4 481.5,239.4 L 501.5,239.4 L 501.5,156.5 L 501.5,73.6 L 506.2,68.4 L 510.9,63.1 L 517.3,63.1 C 523.3,63.1 523.6,63.2 524,64.7 C 524.5,66.9 524.1,264.1 523.6,264.6 C 523.3,264.9 519.7,264.6 515.4,264 C 479.1,259.1 449.3,259.2 416.3,264.4 C 381,270 351.2,281.1 325.9,298 C 319.7,302.1 314.6,305.3 314.6,305.1 L 314.6,305.1 M 307.1,285.2 C 309.9,278.6 318,266.7 325.7,258.3 C 332.4,250.9 346.1,239.6 355.8,233.4 C 382.4,216.7 419.2,204.8 454.4,201.5 C 459.3,201.1 462.8,200.4 463.2,199.9 C 463.5,199.4 463.7,180.5 463.6,157.8 L 463.5,116.6 L 465.3,114.7 C 466.3,113.6 470.7,108.5 475.3,103.4 C 479.8,98.3 484,93.7 484.7,93.2 C 485.8,92.3 485.8,96.7 485.7,157.8 L 485.5,223.3 L 472.2,223.8 C 438.4,225 401,232.4 373.8,243.3 C 350.7,252.6 330.1,265.5 314.2,280.9 C 310.2,284.7 306.8,287.9 306.5,287.9 C 306.2,287.9 306.5,286.7 307.1,285.2 L 307.1,285.2 M 382.9,182.8 C 380.8,180.4 373.5,171.8 366.8,163.7 L 354.5,149.1 L 349.4,148.7 C 340.6,147.9 334.6,143.7 331.7,136.1 C 328.8,128.3 330.7,120.5 336.9,114.7 C 349.3,103.3 369.5,112.2 369.5,129.2 C 369.6,133.1 369.8,133.6 371.5,135 C 372.6,135.8 376.1,138.7 379.4,141.5 C 382.6,144.3 385.6,146.6 386.1,146.6 C 387.1,146.6 389.3,144.6 422.4,113.1 C 438.3,98 461.8,75.7 474.7,63.6 C 494.4,45 498,41.3 497.6,40 C 496.4,36 496.4,29.7 497.6,26.1 C 500.5,17.3 511.5,11.4 520.5,13.8 C 533.4,17.3 539.3,32.2 532.2,43.4 C 527.4,50.9 517.9,54.2 509,51.4 C 507.8,51 505.7,53 496.5,63.6 C 478.3,84.6 414.5,157.3 394.7,179.6 C 391,183.8 387.6,187.3 387.3,187.3 C 387,187.3 385,185.3 382.9,182.8 L 382.9,182.8 M 307.1,84.5 C 309.5,76.7 321.6,60.3 332.5,50 C 341.6,41.4 354.6,32.5 367.1,26.2 C 397.4,11 438.7,1.3 477.6,0.2 L 485.5,0 L 485.7,20.1 L 485.9,40.2 L 479.3,46.1 C 475.7,49.4 470.7,53.9 468.3,56.2 L 463.9,60.3 L 463.5,57 C 463.2,55.2 463.2,50.1 463.5,45.8 C 463.7,41.4 463.7,34.7 463.4,30.8 L 462.9,23.9 L 457.1,24.3 C 414.8,27.3 378.6,36.8 350.3,52.2 C 334.8,60.5 324.6,68.1 313.6,79.2 C 308.8,84.1 306.8,85.8 307.1,84.5 L 307.1,84.5'

const bucket = (k: number) => (k < 0.65 ? 0.5 : k < 0.85 ? 0.75 : 1)

const Frac: React.FC<{ n: React.ReactNode; d: React.ReactNode }> = ({ n, d }) => (
  <span className="clb-frac">
    <span>{n}</span>
    <span>{d}</span>
  </span>
)

const ICONS: Record<string, React.ReactNode> = {
  dna: (
    <>
      <path d="M14 4C14 14 34 14 34 24S14 34 14 44" />
      <path d="M34 4C34 14 14 14 14 24S34 34 34 44" />
      <path d="M17 9h14M15 15h18M15 33h18M17 39h14" />
    </>
  ),
  atom: (
    <>
      <ellipse cx="24" cy="24" rx="20" ry="8" />
      <ellipse cx="24" cy="24" rx="20" ry="8" transform="rotate(60 24 24)" />
      <ellipse cx="24" cy="24" rx="20" ry="8" transform="rotate(120 24 24)" />
      <circle cx="24" cy="24" r="2.5" />
    </>
  ),
  flask: (
    <>
      <path d="M19 5h10M21 5v15L8 40a3 3 0 0 0 3 4h26a3 3 0 0 0 3-4L27 20V5" />
      <path d="M13 32h22" />
      <circle cx="21" cy="37" r="1.5" />
    </>
  ),
  compass: (
    <>
      <circle cx="24" cy="8" r="3" />
      <path d="M24 11L11 43M24 11l13 32" />
      <path d="M14 35c6 4 14 4 20 0" />
    </>
  ),
  globe: (
    <>
      <circle cx="24" cy="24" r="19" />
      <ellipse cx="24" cy="24" rx="8" ry="19" />
      <path d="M5 24h38M8 14h32M8 34h32" />
    </>
  ),
  books: (
    <>
      <rect x="6" y="32" width="36" height="9" rx="1" />
      <rect x="9" y="22" width="30" height="9" rx="1" />
      <rect x="12" y="12" width="24" height="9" rx="1" />
    </>
  ),
  nib: (
    <>
      <path d="M24 4l12 18-12 22L12 22z" />
      <circle cx="24" cy="21" r="2.5" />
      <path d="M24 23.5V44M17 12h14" />
    </>
  ),
  music: (
    <>
      <path d="M17 35V12l19-4v23" />
      <path d="M17 19l19-4" />
      <ellipse cx="13" cy="36" rx="5" ry="4" />
      <ellipse cx="32" cy="32" rx="5" ry="4" />
    </>
  ),
  bar: (
    <>
      <path d="M6 6v36h36" />
      <path d="M12 42V28h6v14M22 42V17h6v25M32 42V10h6v32" />
    </>
  ),
  line: (
    <>
      <path d="M6 6v36h36" />
      <path d="M10 34l9-10 8 6 13-18" />
    </>
  ),
  pie: (
    <>
      <circle cx="24" cy="25" r="17" />
      <path d="M24 25V8M24 25l14.7 8.5M24 25l-13 11" />
      <path d="M28 20V3a22 22 0 0 1 17 15z" />
    </>
  ),
  parabola: (
    <>
      <path d="M24 4v40M4 24h40" />
      <path d="M12 6C16 42 32 42 36 6" />
    </>
  ),
  venn: (
    <>
      <circle cx="18" cy="24" r="13" />
      <circle cx="30" cy="24" r="13" />
    </>
  ),
  triangle: (
    <>
      <path d="M8 40V10l32 30z" />
      <path d="M8 32h8v8" />
    </>
  ),
  benzene: (
    <>
      <path d="M24 5l16 9.5v19L24 43 8 33.5v-19z" />
      <circle cx="24" cy="24" r="8" />
    </>
  ),
  bell: (
    <>
      <path d="M4 40h40" />
      <path d="M6 40C16 40 17 8 24 8s8 32 18 32" />
      <path d="M24 8v32" />
    </>
  ),
  flow: (
    <>
      <rect x="15" y="3" width="18" height="9" rx="2" />
      <path d="M24 12v6M24 34v4" />
      <path d="M24 18l11 8-11 8-11-8z" />
      <rect x="15" y="38" width="18" height="8" rx="2" />
    </>
  ),
  cap: (
    <>
      <path d="M24 10L4 20l20 10 20-10z" />
      <path d="M12 25v10c0 3 6 6 12 6s12-3 12-6V25M44 20v12" />
    </>
  ),
  trophy: (
    <>
      <path d="M14 6h20v12a10 10 0 0 1-20 0z" />
      <path d="M14 10H6c0 8 3 11 8 12M34 10h8c0 8-3 11-8 12M24 28v8M18 36h12M16 42h16" />
    </>
  ),
  teacher: (
    <>
      <rect x="4" y="6" width="26" height="20" rx="1" />
      <path d="M9 12h12M9 18h8" />
      <circle cx="38" cy="22" r="4" />
      <path d="M30 44V36a8 8 0 0 1 16 0v8" />
    </>
  ),
}

interface AmbientItem {
  id: string
  x: number
  y: number
  k: number
  dur: number
  o: number
  a: number
  pulse?: number
  c?: React.ReactNode
  icon?: string
  small?: number
  md?: number
  board?: string
  subject?: string
  script?: string
  lang?: string
  state?: number
  cyc?: number
  cd?: number
  sz?: number
  hm?: boolean | number
}

const BASE_ITEMS: Omit<AmbientItem, 'a'>[] = [
  { id: 'f1', x: 22.1, y: 84.5, k: 0.7, dur: 32, o: 0.18, pulse: 1, c: <>sin²α + cos²α = 1</> },
  { id: 'f2', x: 89.8, y: 11.1, k: 0.9, dur: 27, o: 0.17, c: <>(a − b)² = a² − 2ab + b²</> },
  {
    id: 'f3',
    x: 14.5,
    y: 22.5,
    k: 0.8,
    dur: 36,
    o: 0.18,
    pulse: 1,
    c: (
      <>
        x = <Frac n={<>−b ± √(b² − 4ac)</>} d="2a" />
      </>
    ),
  },
  {
    id: 'f4',
    x: 91.5,
    y: 90.2,
    k: 0.6,
    dur: 29,
    o: 0.17,
    c: (
      <>
        ∫<sub>0</sub>
        <sup>x</sup> <Frac n={<>tⁿ dt</>} d={<>eᵗ − 1</>} />
      </>
    ),
  },
  { id: 'i1', x: 58.2, y: 86.7, k: 1, dur: 30, o: 0.19, icon: 'dna' },
  { id: 'i2', x: 44.7, y: 82.9, k: 0.8, dur: 26, o: 0.18, icon: 'atom' },
  { id: 'i3', x: 95, y: 28, k: 0.9, dur: 35, o: 0.18, icon: 'flask' },
  { id: 'i4', x: 44.1, y: 17.1, k: 0.7, dur: 24, o: 0.17, icon: 'compass' },
  { id: 'i5', x: 6, y: 74, k: 0.9, dur: 33, o: 0.19, icon: 'globe' },
  { id: 'i6', x: 72.8, y: 70.3, k: 0.8, dur: 28, o: 0.18, icon: 'books' },
  { id: 'i7', x: 94, y: 70, k: 1, dur: 31, o: 0.18, icon: 'nib' },
  { id: 'i8', x: 57.5, y: 9.2, k: 0.7, dur: 37, o: 0.17, icon: 'music' },
  { id: 'b0', x: 16.5, y: 18.5, k: 0.75, dur: 29, o: 0.24, pulse: 1, board: 'MSBSHSE · SSC & HSC' },
  { id: 'b1', x: 69.5, y: 69.0, k: 0.7, dur: 30, o: 0.21, board: 'CBSE' },
  { id: 'b2', x: 35.5, y: 12.8, k: 0.65, dur: 25, o: 0.2, board: 'ICSE · ISC' },
  { id: 'b3', x: 75.5, y: 13.5, k: 0.7, dur: 31, o: 0.19, board: 'IB · IGCSE' },
  { id: 'b4', x: 10.5, y: 45.5, k: 0.7, dur: 28, o: 0.19, board: 'NIOS' },
  { id: 'b5', x: 79.5, y: 48.5, k: 0.7, dur: 27, o: 0.19, board: 'UPMSP' },
  { id: 'b6', x: 77.5, y: 31.5, k: 0.65, dur: 32, o: 0.19, board: 'GSEB · RBSE' },
  { id: 'b7', x: 38.5, y: 71.2, k: 0.65, dur: 29, o: 0.19, board: 'WBBSE · BSEB' },
  { id: 'b9', x: 56.5, y: 71.0, k: 0.65, dur: 34, o: 0.19, board: 'KSEEB · TNSB' },
  { id: 'b8', x: 18.5, y: 60.5, k: 0.8, dur: 32, o: 0.21, board: 'STATE BOARDS' },
  { id: 's1', x: 73.8, y: 55.2, k: 0.7, dur: 28, o: 0.15, subject: 'PHYSICS' },
  { id: 's2', x: 64.0, y: 15.0, k: 0.7, dur: 33, o: 0.15, subject: 'CHEMISTRY' },
  { id: 's3', x: 80.5, y: 39.0, k: 0.7, dur: 26, o: 0.15, subject: 'MATHS' },
  { id: 't2', x: 50.5, y: 92.9, k: 0.6, dur: 29, o: 0.15, icon: 'trophy', small: 1 },
  { id: 'n1', x: 24.5, y: 11.2, k: 0.7, dur: 33, o: 0.2, pulse: 1, board: 'NEP 2020' },
  { id: 't4', x: 81.3, y: 23.8, k: 0.6, dur: 27, o: 0.15, subject: 'PRINCIPAL' },
  { id: 't5', x: 81.3, y: 61.8, k: 0.7, dur: 36, o: 0.15, subject: 'TEACHERS' },
  { id: 't6', x: 13.5, y: 70.9, k: 0.6, dur: 30, o: 0.15, subject: 'ANNUAL DAY' },
  { id: 'c1', x: 50.2, y: 7.7, k: 0.7, dur: 31, o: 0.17, icon: 'bar', md: 1 },
  { id: 'c2', x: 64.9, y: 82.3, k: 0.7, dur: 27, o: 0.17, icon: 'pie', md: 1 },
  { id: 'c3', x: 15.7, y: 36.1, k: 0.7, dur: 35, o: 0.17, icon: 'parabola', md: 1 },
  { id: 'c4', x: 51.4, y: 83.8, k: 0.7, dur: 29, o: 0.17, icon: 'venn', md: 1 },
  { id: 'c9', x: 27.9, y: 72.4, k: 0.7, dur: 28, o: 0.17, icon: 'flow', md: 1 },
  { id: 'm-hi', x: 94.1, y: 79.6, k: 0.6, dur: 28, o: 0.16, script: 'शिक्षा', lang: 'hi' },
  { id: 'm-mr', x: 73.4, y: 81.6, k: 0.6, dur: 34, o: 0.16, script: 'ज्ञान', lang: 'mr' },
  { id: 'm-gu', x: 75.8, y: 9, k: 0.6, dur: 31, o: 0.16, script: 'शिक्षण', lang: 'gu' },
  { id: 'm-bn', x: 45.1, y: 92.2, k: 0.6, dur: 37, o: 0.16, script: 'শিক্ষা', lang: 'bn' },
  { id: 'm-ta', x: 82.3, y: 40, k: 0.6, dur: 29, o: 0.16, script: 'கல்வி', lang: 'ta' },
]

const STATES = [
  'ANDHRA PRADESH',
  'ARUNACHAL PRADESH',
  'ASSAM',
  'BIHAR',
  'CHHATTISGARH',
  'GOA',
  'GUJARAT',
  'HARYANA',
  'HIMACHAL PRADESH',
  'JHARKHAND',
  'KARNATAKA',
  'KERALA',
  'MADHYA PRADESH',
  'MAHARASHTRA',
  'MANIPUR',
  'MEGHALAYA',
  'MIZORAM',
  'NAGALAND',
  'ODISHA',
  'PUNJAB',
  'RAJASTHAN',
  'SIKKIM',
  'TAMIL NADU',
  'TELANGANA',
  'TRIPURA',
  'UTTAR PRADESH',
  'UTTARAKHAND',
  'WEST BENGAL',
]

function buildAmbientItems(isPanel: boolean, priorityState?: string): AmbientItem[] {
  const items: Omit<AmbientItem, 'a'>[] = BASE_ITEMS.map((it) => ({ ...it }))
  let seed = 20261123
  const rnd = () => {
    seed |= 0
    seed = (seed + 1831565813) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const box = (it: Omit<AmbientItem, 'a'>) =>
    it.board
      ? { w: it.board.length * 0.7, h: 3 }
      : it.subject
        ? { w: it.subject.length * 0.8, h: 2.5 }
        : it.c
          ? { w: 15, h: 9 }
          : it.script
            ? { w: 7, h: 4 }
            : { w: 6, h: 7 }

  const boxes = items.map((it) => ({ x: it.x, y: it.y, ...box(it) }))
  boxes.push({ x: 46, y: 44, w: 42, h: 36 })

  const heroState = (priorityState || 'MAHARASHTRA').trim().toUpperCase()
  const sortedStates = [...STATES].sort(
    (p, q) => Number(q === heroState) - Number(p === heroState) || q.length - p.length,
  )

  const xMin = isPanel ? 5 : 4
  const xMax = isPanel ? 82 : 96
  const yMin = isPanel ? 10 : 5
  const yMax = isPanel ? 73 : 95

  sortedStates.forEach((name, idx) => {
    const isHero = name === heroState
    const r = rnd()
    let sz = isHero ? 1.32 : (r < 0.15 ? 1.05 : r < 0.5 ? 0.85 : 0.72) * (0.9 + rnd() * 0.16)
    let placed = false
    for (let tries = 0; tries < 2400; tries++) {
      if (tries && tries % 250 === 0) sz *= 0.9
      const w = name.length * 0.82 * sz
      const h = 1.9 * sz + 1.2
      const spanX = Math.max(4, xMax - xMin - w)
      const spanY = Math.max(4, yMax - yMin - h)
      const x = xMin + w / 2 + rnd() * spanX
      const y = yMin + h / 2 + rnd() * spanY
      if (x - w / 2 < 2 || x + w / 2 > (isPanel ? 85 : 98)) continue
      if (boxes.some((b) => Math.abs(b.x - x) < (b.w + w) / 2 + 0.9 && Math.abs(b.y - y) < (b.h + h) / 2 + 0.9)) {
        continue
      }
      boxes.push({ x, y, w, h })
      items.push({
        id: `st-${idx}`,
        x: +x.toFixed(1),
        y: +y.toFixed(1),
        k: [0.5, 0.7, 0.9][idx % 3],
        dur: 24 + Math.floor(rnd() * 16),
        o: isHero ? 0.25 : 0.15 + rnd() * 0.05,
        pulse: isHero ? 1 : 0,
        board: name,
        state: 1,
        cyc: isHero ? 0 : 1,
        cd: idx,
        sz: +sz.toFixed(2),
        hm: isHero ? false : sz < 0.78 && idx % 3 === 0,
      })
      placed = true
      break
    }
    if (!placed && isHero) {
      // Guarantee active institute state (default: MAHARASHTRA) never fails placement
      items.push({
        id: `st-hero`,
        x: 15.5,
        y: 28.0,
        k: 0.7,
        dur: 28,
        o: 0.26,
        pulse: 1,
        board: name,
        state: 1,
        cyc: 0,
        cd: 0,
        sz: 1.25,
        hm: false,
      })
    }
  })

  const filtered = isPanel ? items.filter((it) => it.y >= 9 && it.y <= 74 && it.x <= 86) : items
  const opacities = [0.55, 1.35, 0.85, 1.7, 0.65, 1.05]
  const angles = [-24, -16, -8, 4, -20, 12, -12, -4]
  return filtered.map((it, i) => ({
    ...it,
    o: it.o * opacities[i % 6],
    a: angles[(i * 3) % 8],
  }))
}

const STARS = [
  [16, 5],
  [33, 12],
  [4, 12],
  [47, 4],
  [57, 10],
  [68, 4],
  [96, 8],
  [82, 20],
  [97, 40],
  [3, 45],
  [2, 58],
  [15, 80],
  [31, 97],
  [46, 96],
  [60, 92],
  [88, 78],
  [98, 88],
  [4, 94],
  [93, 96],
  [27, 20],
  [75, 24],
].map(([x, y], i) => ({ x, y, d: 3 + (i % 5) * 1.1, delay: -(i * 1.7) % 9, s: 2 + (i % 3) }))

const Mark: React.FC<{ name: string; cy?: number } & React.SVGProps<SVGTextElement>> = ({
  name,
  cy = 2,
  ...props
}) => {
  const t = name.trim()
  const words = t.split(/\s+/)
  let lines = [t]
  if (t.length > 16 && words.length > 1) {
    let best = 1
    let bd = 1e9
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ').length
      const b = words.slice(i).join(' ').length
      if (Math.abs(a - b) < bd) {
        bd = Math.abs(a - b)
        best = i
      }
    }
    lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')]
  }

  let w100 = Math.max(...lines.map((l) => l.length * 72 + 3 * l.length))
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.font = "800 100px Inter,'Segoe UI','Noto Sans Devanagari',system-ui,sans-serif"
      w100 = Math.max(...lines.map((l) => ctx.measureText(l.toUpperCase()).width + 3 * l.length))
    }
  }
  const fs = Math.max(28, Math.min(lines.length > 1 ? 54 : 100, 56000 / Math.max(w100, 1)))
  const lh = fs * 1.1
  const y0 = cy - ((lines.length - 1) * lh) / 2 + fs * 0.35

  return (
    <>
      {lines.map((line, i) => (
        <text
          key={i}
          x="305"
          y={y0 + i * lh}
          textAnchor="middle"
          fontFamily="Inter,'Segoe UI','Noto Sans Devanagari',system-ui,sans-serif"
          fontWeight="800"
          fontSize={fs}
          letterSpacing={fs * 0.03}
          {...props}
        >
          {line.toUpperCase()}
        </text>
      ))}
    </>
  )
}

export default function CoachingLoginBackground({
  className = '',
  parallax = true,
  layout = 'panel',
  instituteName = '',
  instituteState = 'Maharashtra',
  background,
  intensity,
  logoOpacity = 0.28,
}: CoachingLoginBackgroundProps) {
  const isPanel = layout === 'panel'
  const rootRef = useRef<HTMLDivElement>(null)
  const boltRef = useRef<SVGSVGElement>(null)
  const spotRef = useRef<SVGRadialGradientElement>(null)
  const spotG = useRef<SVGGElement>(null)

  const trimmedName = (instituteName || '').trim()
  const vb = trimmedName ? '0 -100 610.17 405.69' : '0 0 610.17 305.69'

  const ambientItems = useMemo(
    () => buildAmbientItems(isPanel, instituteState),
    [isPanel, instituteState],
  )

  useEffect(() => {
    const svg = boltRef.current
    const grad = spotRef.current
    const box = spotG.current
    if (!svg || !grad || !box || typeof window === 'undefined') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const coarse = window.matchMedia?.('(pointer: coarse)').matches

    let tx = 305
    let ty = 150
    let cx = 305
    let cy = 150
    let raf = 0
    let idle: ReturnType<typeof setTimeout> | undefined
    let stop: ReturnType<typeof setTimeout> | undefined

    const loop = (t: number) => {
      if (coarse) {
        tx = 305 + 270 * Math.sin(t * 4e-4)
        ty = 150 + 85 * Math.sin(t * 7e-4 + 1)
      }
      cx += (tx - cx) * 0.12
      cy += (ty - cy) * 0.12
      grad.setAttribute('cx', cx.toFixed(1))
      grad.setAttribute('cy', cy.toFixed(1))
      raf = requestAnimationFrame(loop)
    }

    const hide = () => {
      box.style.opacity = '0'
      if (stop) clearTimeout(stop)
      stop = setTimeout(() => {
        cancelAnimationFrame(raf)
        raf = 0
      }, 800)
    }

    const mv = (e: MouseEvent) => {
      const r = svg.getBoundingClientRect()
      if (!r.width || !r.height) return
      const v = svg.viewBox.baseVal
      tx = v.x + ((e.clientX - r.left) / r.width) * v.width
      ty = v.y + ((e.clientY - r.top) / r.height) * v.height
      box.style.opacity = '1'
      if (idle) clearTimeout(idle)
      if (stop) clearTimeout(stop)
      idle = setTimeout(hide, 2500)
      if (!raf) raf = requestAnimationFrame(loop)
    }

    if (coarse) {
      box.style.opacity = '0.8'
      raf = requestAnimationFrame(loop)
    } else {
      window.addEventListener('mousemove', mv, { passive: true })
      document.addEventListener('mouseleave', hide)
    }

    return () => {
      window.removeEventListener('mousemove', mv)
      document.removeEventListener('mouseleave', hide)
      cancelAnimationFrame(raf)
      if (idle) clearTimeout(idle)
      if (stop) clearTimeout(stop)
    }
  }, [])

  useEffect(() => {
    if (!parallax || typeof window === 'undefined') return
    const root = rootRef.current
    if (!root) return
    if (
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      window.matchMedia?.('(pointer: coarse)').matches
    ) {
      return
    }
    const layers = Array.from(root.querySelectorAll<HTMLElement>('[data-k]'))
    let tx = 0
    let ty = 0
    let cx = 0
    let cy = 0
    let raf = 0

    const tick = () => {
      cx += (tx - cx) * DAMPING
      cy += (ty - cy) * DAMPING
      for (const el of layers) {
        const k = +(el.dataset.k || '1')
        el.style.transform = `translate3d(${(cx * k).toFixed(2)}px,${(cy * k).toFixed(2)}px,0)`
      }
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.05 ? requestAnimationFrame(tick) : 0
    }

    const mv = (e: MouseEvent) => {
      tx = -((e.clientX / window.innerWidth) * 2 - 1) * MAX_SHIFT
      ty = -((e.clientY / window.innerHeight) * 2 - 1) * MAX_SHIFT
      if (!raf) raf = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', mv, { passive: true })
    return () => {
      window.removeEventListener('mousemove', mv)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [parallax])

  const renderShape = (extraProps: React.SVGProps<SVGPathElement> = {}) => (
    <>
      {trimmedName && <Mark name={trimmedName} />}
      <g transform="translate(305.1 152.8) scale(.56) translate(-305.1 -152.8)">
        <path d={LOGO_D} {...extraProps} />
      </g>
    </>
  )

  return (
    <div
      ref={rootRef}
      className={`clb-root ${isPanel ? 'clb-panel' : ''} ${className}`}
      style={
        {
          background: background ?? (isPanel ? 'transparent' : NAVY_BG),
          '--i': intensity ?? (isPanel ? 1.75 : 1.5),
          '--lo': logoOpacity,
          '--lw': isPanel ? 'min(36vw, 540px)' : undefined,
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      <style>{CSS}</style>

      {/* Center Watermark Crown & Interactive Spotlight Emblem */}
      <div className="clb-layer" data-k="0.3">
        <div
          className="clb-pos"
          style={{ left: isPanel ? '45%' : '50%', top: isPanel ? '44%' : '50%' }}
        >
          <div className="clb-logo-float">
            <svg
              className="clb-logo"
              viewBox={vb}
              role="img"
              fill="currentColor"
              fillOpacity=".35"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
              fillRule="evenodd"
            >
              {renderShape({ vectorEffect: 'non-scaling-stroke' })}
            </svg>
            <svg
              ref={boltRef}
              className="clb-bolt"
              viewBox={vb}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              fillRule="evenodd"
            >
              <defs>
                <linearGradient
                  id="clb-sh"
                  gradientUnits="userSpaceOnUse"
                  x1="-90"
                  y1="0"
                  x2="90"
                  y2="0"
                  gradientTransform="skewX(-25)"
                >
                  <stop offset="0" stopColor="#fff" stopOpacity="0" />
                  <stop offset=".5" stopColor="#fff" stopOpacity=".9" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0" />
                  <animateTransform
                    attributeName="gradientTransform"
                    type="translate"
                    additive="sum"
                    values="-250 0;850 0;850 0"
                    keyTimes="0;.5;1"
                    dur="9s"
                    repeatCount="indefinite"
                  />
                </linearGradient>
                <radialGradient
                  ref={spotRef}
                  id="clb-sp"
                  gradientUnits="userSpaceOnUse"
                  cx="305"
                  cy="150"
                  r="144"
                >
                  <stop offset="0" stopColor="#e0f2fe" stopOpacity="1" />
                  <stop offset=".45" stopColor="#7dd3fc" stopOpacity=".5" />
                  <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
                </radialGradient>
              </defs>
              {renderShape({ fill: 'url(#clb-sh)', stroke: 'url(#clb-sh)', strokeWidth: 1.5, opacity: 0.55 })}
              <g ref={spotG} className="clb-spot">
                {renderShape({ stroke: 'url(#clb-sp)', strokeWidth: 9, opacity: 0.3 })}
                {renderShape({ stroke: 'url(#clb-sp)', strokeWidth: 1.6 })}
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* Subtle Twinkling Stars */}
      {STARS.map((s, i) => (
        <span
          key={i}
          className="clb-star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.s,
            height: s.s,
            animationDuration: `${s.d}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}

      {/* Parallax Ambient Field Layers */}
      {LAYERS.map((layerK) => (
        <div key={layerK} className="clb-layer" data-k={layerK}>
          {ambientItems.map((it, i) => {
            if (bucket(it.k) !== layerK) return null
            const dir = i % 2 ? 1 : -1
            return (
              <div
                key={it.id}
                className={`clb-pos${it.hm ? ' clb-hm' : ''}${it.cyc ? ' clb-cycle' : ''}`}
                style={{
                  left: `${it.x}%`,
                  top: `${it.y}%`,
                  animationDelay: it.cyc ? `${-(it.cd || 0) * 1.07}s` : undefined,
                }}
              >
                <div
                  className="clb-float"
                  style={
                    {
                      animationDuration: `${it.dur}s`,
                      animationDelay: `${-(i * 3.7)}s`,
                      '--d': dir,
                      '--a': `${it.a ?? -20}deg`,
                    } as React.CSSProperties
                  }
                >
                  <div
                    className={`clb-body${it.pulse ? ' clb-pulse' : ''}`}
                    style={
                      {
                        '--o': it.o,
                        '--s': it.sz || 1,
                      } as React.CSSProperties
                    }
                  >
                    {it.icon && (
                      <span className={it.small ? 'clb-sm' : it.md ? 'clb-md' : ''}>
                        <svg
                          viewBox="0 0 48 48"
                          className="clb-icon"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          {ICONS[it.icon]}
                        </svg>
                      </span>
                    )}
                    {it.board && (
                      <span className={`clb-board${it.state ? ' clb-state' : ''}`}>{it.board}</span>
                    )}
                    {it.subject && <span className="clb-subject">{it.subject}</span>}
                    {it.script && (
                      <span className="clb-script" lang={it.lang}>
                        {it.script}
                      </span>
                    )}
                    {it.c && <span className="clb-formula">{it.c}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

const CSS = `
.clb-root{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;user-select:none;color:#f1f5f9;contain:strict}
.clb-panel{position:absolute;height:auto;bottom:0}
.clb-layer{position:absolute;inset:0;will-change:transform}
.clb-pos{position:absolute;translate:-50% -50%}
.clb-logo{width:var(--lw,min(58vw,820px));height:auto;display:block;color:#e2e8f0;opacity:var(--lo,.28)}
.clb-logo-float{position:relative;animation:clb-breathe 38s ease-in-out infinite}
.clb-bolt{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.clb-cycle{opacity:0;animation:clb-cyc 28s linear infinite}
@keyframes clb-cyc{0%{opacity:.12}10%{opacity:1}72%{opacity:1}85%{opacity:.12}100%{opacity:.12}}
.clb-spot{opacity:0;transition:opacity .7s ease}
.clb-float{animation:clb-drift 30s ease-in-out infinite}
.clb-body{opacity:min(.48,calc(var(--o)*var(--i,1.5)))}
.clb-pulse{animation:clb-pulse 7s ease-in-out infinite}
.clb-icon{width:clamp(28px,3.4vw,48px);height:auto;display:block}
.clb-md .clb-icon{width:clamp(24px,2.8vw,40px)}
.clb-sm .clb-icon{width:clamp(20px,2.3vw,32px)}
.clb-board{font:800 clamp(12px,1.45vw,22px)/1 Inter,system-ui,sans-serif;letter-spacing:.08em;white-space:nowrap}
.clb-state{font-size:calc(clamp(8.5px,1vw,15px)*var(--s,1));letter-spacing:.12em;font-weight:700}
.clb-subject{font:600 clamp(10.5px,1.1vw,16px)/1 Inter,system-ui,sans-serif;letter-spacing:.22em;white-space:nowrap}
.clb-script{font:600 clamp(13px,1.45vw,22px)/1.3 "Noto Sans Devanagari","Nirmala UI",system-ui,sans-serif;white-space:nowrap;display:inline-block}
.clb-formula{font:italic 400 clamp(11.5px,1.25vw,18px)/1.2 "Cambria Math","STIX Two Text",Georgia,serif;white-space:nowrap;display:inline-flex;align-items:center;gap:.3em}
.clb-formula sub,.clb-formula sup{font-size:.6em;line-height:0}
.clb-frac{display:inline-flex;flex-direction:column;align-items:center}
.clb-frac>span:first-child{border-bottom:1.2px solid currentColor;padding:0 .2em .06em}
.clb-star{position:absolute;border-radius:50%;background:#f1f5f9;opacity:.18;box-shadow:0 0 6px 1px rgba(226,232,240,.5);animation:clb-twinkle 5s ease-in-out infinite}
@keyframes clb-drift{0%,100%{transform:translate3d(0,0,0) rotate(calc(var(--a,-20deg) - var(--d)*3deg))}50%{transform:translate3d(0,-22px,0) rotate(calc(var(--a,-20deg) + var(--d)*3deg))}}
@keyframes clb-breathe{0%,100%{transform:scale(1)}50%{transform:translate3d(0,-10px,0) scale(1.015)}}
@keyframes clb-pulse{0%,100%{opacity:calc(.08*var(--i,1.5))}50%{opacity:min(.48,calc(.24*var(--i,1.5)))}}
@keyframes clb-twinkle{0%,100%{opacity:calc(.08*var(--i,1.5));transform:scale(.8)}50%{opacity:min(.5,calc(.32*var(--i,1.5)));transform:scale(1.4)}}
@media (max-width:640px){.clb-hm{display:none}}
@media (prefers-reduced-motion:reduce){.clb-float,.clb-pulse,.clb-star,.clb-logo-float{animation:none}.clb-cycle{animation:none;opacity:1}.clb-bolt{display:none}.clb-float{transform:rotate(var(--a,-20deg))}}
`

export { CoachingLoginBackground }
