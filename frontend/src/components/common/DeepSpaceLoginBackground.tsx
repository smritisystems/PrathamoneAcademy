/**
 * @file        DeepSpaceLoginBackground.tsx
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
 * @description Deep-space cosmic SVG login panel backdrop preserving orbital planets, nebulae, starfields, formulas, scripts, pan-India tickers, and dynamically mapped institute typography + active classes.
 */

import React, { useEffect, useMemo, useRef } from 'react'
import {
  DEEP_SPACE_CSS,
  DEEP_SPACE_DEFS_AND_COSMOS_HTML,
  DEEP_SPACE_SHOOTERS_AND_VIGNETTE_HTML,
  DEEP_SPACE_TORCH_MARK_SVG,
  DEEP_SPACE_WORDMARK_SVG,
} from './deepSpaceLayers'

export interface DeepSpaceLoginBackgroundProps {
  instituteName?: string
  instituteCity?: string
  instituteState?: string
  boards?: Array<{ name: string; code: string }>
  classes?: string[]
  subjects?: string[]
}

const DEFAULT_TOP_ITEMS = [
  'CBSE', 'ICSE', 'ISC', 'NIOS', 'IB', 'IGCSE', 'CAMBRIDGE A-LEVEL', 'NCERT', 'SCERT', 'CISCE',
  'IB DIPLOMA', 'IB MYP', 'AS & A LEVEL', 'BSEB', 'BSE ODISHA', 'PSEB', 'HBSE', 'JKBOSE', 'HPBOSE',
  'ASSAM BOARD', 'MPBSE', 'CGBSE', 'JAC', 'BIEAP', 'BSE TELANGANA', 'DGE KERALA', 'GOA BOARD',
  'MBSE', 'MBOSE', 'NBSE', 'TBSE', 'BSEM', 'BSE SIKKIM', 'UBSE', 'BSE PUDUCHERRY', 'MSBSHSE',
  'GSEB', 'RBSE', 'UPMSP', 'GORAKHPUR', 'MUMBAI', 'LUCKNOW', 'KOLKATA', 'CHENNAI', 'BENGALURU',
  'HYDERABAD', 'PUNE', 'KOTA', 'KSEEB', 'TNSB', 'WBBSE', 'WBCHSE', 'MAHARASHTRA BOARD',
  'DELHI BOARD', 'CHSE', 'BSEAP', 'KARNATAKA PU BOARD', 'NEET-UG', 'JEE MAIN', 'JEE ADVANCED',
  'MHT-CET', 'KCET', 'BITSAT', 'CUET', 'NDA', 'CLAT', 'OLYMPIADS', 'IMO', 'NSEJS', 'NSEP',
  'NSEC', 'NSEB', 'SSC & HSC', 'FOUNDATION', 'BOARD EXAMS', 'K-12',
]

const DEFAULT_STATES_ITEMS = [
  'ANDHRA PRADESH', 'ARUNACHAL PRADESH', 'ASSAM', 'BIHAR', 'CHHATTISGARH', 'GOA', 'GUJARAT',
  'HARYANA', 'HIMACHAL PRADESH', 'JHARKHAND', 'KARNATAKA', 'KERALA', 'MADHYA PRADESH',
  'MAHARASHTRA', 'MANIPUR', 'MEGHALAYA', 'MIZORAM', 'NAGALAND', 'ODISHA', 'PUNJAB',
  'RAJASTHAN', 'SIKKIM', 'TAMIL NADU', 'TELANGANA', 'TRIPURA', 'UTTAR PRADESH',
  'UTTARAKHAND', 'WEST BENGAL', 'ANDAMAN & NICOBAR', 'CHANDIGARH',
  'DADRA & NAGAR HAVELI · DAMAN & DIU', 'DELHI', 'JAMMU & KASHMIR', 'LADAKH',
  'LAKSHADWEEP', 'PUDUCHERRY', 'INDIA', 'BHARAT',
]

const DEFAULT_SUBJECT_ITEMS = [
  'PHYSICS', 'CHEMISTRY', 'MATHEMATICS', 'BIOLOGY', 'ENGLISH', 'HINDI', 'MARATHI', 'SANSKRIT',
  'HISTORY', 'GEOGRAPHY', 'CIVICS', 'ECONOMICS', 'ACCOUNTANCY', 'BUSINESS STUDIES',
  'COMPUTER SCIENCE', 'BOTANY', 'ZOOLOGY', 'POLITICAL SCIENCE', 'SOCIOLOGY', 'PSYCHOLOGY',
  'STATISTICS', 'ENVIRONMENTAL SCIENCE', 'SOCIAL SCIENCE', 'GENERAL SCIENCE', 'REASONING',
  'APTITUDE', 'ALGEBRA', 'GEOMETRY', 'TRIGONOMETRY', 'CALCULUS', 'ORGANIC CHEMISTRY',
  'MECHANICS', 'OPTICS', 'GENETICS', 'ECOLOGY', 'THERMODYNAMICS', 'PHYSICAL EDUCATION',
  'ART & CRAFT', 'MUSIC', 'GUJARATI', 'KANNADA', 'TAMIL', 'TELUGU', 'BENGALI', 'URDU',
  'ROBOTICS', 'CODING', 'AI & DATA SCIENCE', 'KINDERGARTEN', 'PRIMARY', 'MIDDLE SCHOOL',
  'SECONDARY', 'SENIOR SECONDARY',
]

function mergeTickerItems(priorityItems: string[], baseItems: string[]): string {
  const seen = new Set<string>()
  const merged: string[] = []
  for (const raw of [...priorityItems, ...baseItems]) {
    const clean = raw.trim().toUpperCase()
    if (!clean || seen.has(clean)) continue
    seen.add(clean)
    merged.push(clean)
  }
  return merged.join('  ✦  ') + '  ✦  '
}

export function splitInstituteTitle(rawName?: string): {
  topLine: string
  bottomLine: string
  topSize: number
  bottomSize: number
} {
  const cleaned = (rawName || '').trim() || 'YOUR ACADEMY NAME'
  const words = cleaned.toUpperCase().split(/\s+/).filter(Boolean)

  let topLine = 'YOUR'
  let bottomLine = 'ACADEMY NAME'

  if (words.length === 1) {
    topLine = ''
    bottomLine = words[0]
  } else if (words.length === 2) {
    topLine = words[0]
    bottomLine = words[1]
  } else if (words.length >= 3) {
    const totalChars = words.reduce((sum, w) => sum + w.length, 0)
    let acc = 0
    let splitIdx = 1
    let bestDiff = Infinity
    for (let i = 1; i < words.length; i++) {
      acc += words[i - 1].length
      const diff = Math.abs(totalChars - 2 * acc)
      if (diff < bestDiff) {
        bestDiff = diff
        splitIdx = i
      }
    }
    topLine = words.slice(0, splitIdx).join(' ')
    bottomLine = words.slice(splitIdx).join(' ')
  }

  const fitSize = (text: string, base: number, maxUnits: number) =>
    text.length > maxUnits ? Math.max(24, Math.round((base * maxUnits) / text.length)) : base

  return {
    topLine,
    bottomLine,
    topSize: fitSize(topLine, 46, 16),
    bottomSize: fitSize(bottomLine, 50, 15),
  }
}

export default function DeepSpaceLoginBackground({
  instituteName,
  instituteCity,
  instituteState,
  boards = [],
  classes = [],
  subjects = [],
}: DeepSpaceLoginBackgroundProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      rootRef.current?.querySelectorAll('svg').forEach((el) => {
        if (typeof el.pauseAnimations === 'function') {
          el.pauseAnimations()
        }
      })
    }
  }, [])

  const title = useMemo(() => splitInstituteTitle(instituteName), [instituteName])

  const topTickerText = useMemo(() => {
    const priority = [
      ...boards.map((b) => b.code || b.name),
      ...classes,
    ]
    return mergeTickerItems(priority, DEFAULT_TOP_ITEMS)
  }, [boards, classes])

  const statesTickerText = useMemo(() => {
    const priority = [instituteCity || '', instituteState || ''].filter(Boolean)
    return mergeTickerItems(priority, DEFAULT_STATES_ITEMS)
  }, [instituteCity, instituteState])

  const subjectsTickerText = useMemo(() => {
    const priority = [...classes, ...subjects]
    return mergeTickerItems(priority, DEFAULT_SUBJECT_ITEMS)
  }, [classes, subjects])

  return (
    <div ref={rootRef} className="dsb-space" aria-hidden="true">
      <style>{DEEP_SPACE_CSS}</style>

      {/* Static Cosmic Backdrop, Planet, Nebulae, Starfields, Constellations, Orbits, and Ambient Layers */}
      <div
        className="contents"
        dangerouslySetInnerHTML={{ __html: DEEP_SPACE_DEFS_AND_COSMOS_HTML }}
      />

      {/* Dynamic Ticker 1: Accredited Boards & Active Institute Classes */}
      <div className="tkw" style={{ top: '6px', opacity: 0.9, height: '18.5px' }}>
        <svg
          className="tk"
          width="13316"
          height="18.5"
          viewBox="0 0 13316 18.5"
          style={{ animation: 'tks 230s linear infinite normal' }}
        >
          <text
            x="0"
            y="13.5"
            fontSize="10.5"
            letterSpacing="2.2"
            textLength="6658"
            lengthAdjust="spacing"
            style={{ fontFamily: "'Segoe UI','Noto Sans',system-ui,sans-serif", fontWeight: 700, fill: '#ffffff' }}
          >
            {topTickerText}
          </text>
          <text
            x="6658"
            y="13.5"
            fontSize="10.5"
            letterSpacing="2.2"
            textLength="6658"
            lengthAdjust="spacing"
            style={{ fontFamily: "'Segoe UI','Noto Sans',system-ui,sans-serif", fontWeight: 700, fill: '#ffffff' }}
          >
            {topTickerText}
          </text>
        </svg>
      </div>

      {/* Dynamic Ticker 2: Institute Location & Pan-India States */}
      <div className="tkw" style={{ bottom: '24px', opacity: 0.92, height: '19px' }}>
        <svg
          className="tk"
          width="10400"
          height="19"
          viewBox="0 0 10400 19"
          style={{ animation: 'tks 210s linear infinite normal' }}
        >
          <text
            x="0"
            y="14"
            fontSize="11"
            letterSpacing="2.4"
            textLength="5200"
            lengthAdjust="spacing"
            style={{ fontFamily: "'Segoe UI','Noto Sans',system-ui,sans-serif", fontWeight: 700, fill: '#ffffff' }}
          >
            {statesTickerText}
          </text>
          <text
            x="5200"
            y="14"
            fontSize="11"
            letterSpacing="2.4"
            textLength="5200"
            lengthAdjust="spacing"
            style={{ fontFamily: "'Segoe UI','Noto Sans',system-ui,sans-serif", fontWeight: 700, fill: '#ffffff' }}
          >
            {statesTickerText}
          </text>
        </svg>
      </div>

      {/* Dynamic Ticker 3: Active Institute Classes, Subjects & Streams */}
      <div className="tkw" style={{ bottom: '8px', opacity: 0.8, height: '17px' }}>
        <svg
          className="tk"
          width="12268"
          height="17"
          viewBox="0 0 12268 17"
          style={{ animation: 'tks 270s linear infinite reverse' }}
        >
          <text
            x="0"
            y="12"
            fontSize="9"
            letterSpacing="2.2"
            textLength="6134"
            lengthAdjust="spacing"
            style={{ fontFamily: "'Segoe UI','Noto Sans',system-ui,sans-serif", fontWeight: 700, fill: '#ffffff' }}
          >
            {subjectsTickerText}
          </text>
          <text
            x="6134"
            y="12"
            fontSize="9"
            letterSpacing="2.2"
            textLength="6134"
            lengthAdjust="spacing"
            style={{ fontFamily: "'Segoe UI','Noto Sans',system-ui,sans-serif", fontWeight: 700, fill: '#ffffff' }}
          >
            {subjectsTickerText}
          </text>
        </svg>
      </div>

      {/* Dynamic Center Academy Name (#brand), PrathamOne Torch Mark & Light Sweep */}
      <svg className="L" viewBox="0 0 1320 950" preserveAspectRatio="xMidYMid slice">
        <defs>
          <clipPath id="dsb-nameclip">
            {title.topLine && (
              <text className="name" x="660" y="322" fontSize={title.topSize}>
                {title.topLine}
              </text>
            )}
            <text
              className="name"
              x="660"
              y={title.topLine ? 372 : 352}
              fontSize={title.bottomSize}
              letterSpacing="1"
            >
              {title.bottomLine}
            </text>
          </clipPath>
        </defs>
        <g id="dsb-brand">
          <ellipse className="aur a1" cx="660" cy="352" rx="330" ry="58" fill="url(#auraA)" />
          <ellipse className="aur a2" cx="660" cy="338" rx="290" ry="46" fill="url(#auraB)" />
          <g
            fill="none"
            stroke="#7fa6ff"
            strokeLinejoin="round"
            fontFamily="'Segoe UI',system-ui,sans-serif"
            fontWeight="800"
            textAnchor="middle"
          >
            {title.topLine && (
              <text x="660" y="322" fontSize={title.topSize} strokeWidth="9" strokeOpacity=".10">
                {title.topLine}
              </text>
            )}
            <text
              x="660"
              y={title.topLine ? 372 : 352}
              fontSize={title.bottomSize}
              letterSpacing="1"
              strokeWidth="9"
              strokeOpacity=".10"
            >
              {title.bottomLine}
            </text>
            {title.topLine && (
              <text x="660" y="322" fontSize={title.topSize} strokeWidth="4" strokeOpacity=".16">
                {title.topLine}
              </text>
            )}
            <text
              x="660"
              y={title.topLine ? 372 : 352}
              fontSize={title.bottomSize}
              letterSpacing="1"
              strokeWidth="4"
              strokeOpacity=".16"
            >
              {title.bottomLine}
            </text>
          </g>
          {title.topLine && (
            <text className="name" x="660" y="322" fontSize={title.topSize}>
              {title.topLine}
            </text>
          )}
          <text
            className="name"
            x="660"
            y={title.topLine ? 372 : 352}
            fontSize={title.bottomSize}
            letterSpacing="1"
          >
            {title.bottomLine}
          </text>
          <g clipPath="url(#dsb-nameclip)">
            <g>
              <rect x="0" y="270" width="110" height="130" fill="url(#sweepg)" transform="skewX(-20)" />
              <animateTransform
                attributeName="transform"
                type="translate"
                values="380 0;1000 0;1000 0"
                keyTimes="0;.28;1"
                dur="8s"
                repeatCount="indefinite"
              />
            </g>
          </g>
          <circle className="pulse" cx="660" cy="465" r="135" fill="url(#halo)" opacity=".28" />
          <circle className="pulse" cx="700" cy="470" r="110" fill="url(#haloO)" opacity=".35" />
          <g dangerouslySetInnerHTML={{ __html: DEEP_SPACE_TORCH_MARK_SVG }} />
          <g dangerouslySetInnerHTML={{ __html: DEEP_SPACE_WORDMARK_SVG }} />
        </g>
      </svg>

      {/* Shooting Stars & Perimeter Vignette */}
      <div
        className="contents"
        dangerouslySetInnerHTML={{ __html: DEEP_SPACE_SHOOTERS_AND_VIGNETTE_HTML }}
      />
    </div>
  )
}
