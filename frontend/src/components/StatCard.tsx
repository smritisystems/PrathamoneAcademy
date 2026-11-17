/**
 * @file        StatCard.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-03
 * @updated     2026-11-17
 *
 * @description KPI metric stat card component supporting classic horizontal style and modern executive card style with icon pill badge, trend indicator, and micro-sparklines.
 */

import { useId } from 'react'
import { type LucideIcon, Lock, TrendingUp, TrendingDown, Minus } from 'lucide-react'

export interface StatCardTrend {
  value: string
  label?: string
  direction?: 'up' | 'down' | 'neutral'
  sentiment?: 'positive' | 'negative' | 'neutral'
}

interface StatCardProps {
  title: string
  value: string | number | React.ReactNode
  icon: LucideIcon
  color: 'blue' | 'green' | 'purple' | 'red' | 'orange' | 'primary' | 'brand' | 'rose' | 'amber' | 'indigo'
  subtitle?: string
  codexBadge?: string
  onDecodeClick?: (code: string) => void
  variant?: 'classic' | 'modern'
  trend?: StatCardTrend
  sparklineData?: number[]
}

const colorMap = {
  primary: {
    bg: 'bg-primary-50',
    icon: 'bg-primary-100 text-primary-700',
    modernPill: 'bg-violet-100 text-violet-700',
    value: 'text-primary-900',
    title: 'text-primary-700',
    sparkStroke: '#7c3aed',
    sparkStop: '#8b5cf6',
  },
  brand: {
    bg: 'bg-primary-50',
    icon: 'bg-primary-100 text-primary-700',
    modernPill: 'bg-violet-100 text-violet-700',
    value: 'text-primary-900',
    title: 'text-primary-700',
    sparkStroke: '#7c3aed',
    sparkStop: '#8b5cf6',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'bg-purple-100 text-purple-700',
    modernPill: 'bg-purple-100 text-purple-700',
    value: 'text-purple-900',
    title: 'text-purple-700',
    sparkStroke: '#8b5cf6',
    sparkStop: '#a78bfa',
  },
  indigo: {
    bg: 'bg-indigo-50',
    icon: 'bg-indigo-100 text-indigo-700',
    modernPill: 'bg-indigo-100 text-indigo-700',
    value: 'text-indigo-900',
    title: 'text-indigo-700',
    sparkStroke: '#6366f1',
    sparkStop: '#818cf8',
  },
  blue: {
    bg: 'bg-blue-50',
    icon: 'bg-blue-100 text-blue-700',
    modernPill: 'bg-blue-100 text-blue-700',
    value: 'text-blue-900',
    title: 'text-blue-700',
    sparkStroke: '#2563eb',
    sparkStop: '#60a5fa',
  },
  green: {
    bg: 'bg-green-50',
    icon: 'bg-green-100 text-green-700',
    modernPill: 'bg-emerald-100 text-emerald-700',
    value: 'text-green-900',
    title: 'text-green-700',
    sparkStroke: '#10b981',
    sparkStop: '#34d399',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'bg-red-100 text-red-700',
    modernPill: 'bg-rose-100 text-rose-700',
    value: 'text-red-900',
    title: 'text-red-700',
    sparkStroke: '#f43f5e',
    sparkStop: '#fb7185',
  },
  rose: {
    bg: 'bg-rose-50',
    icon: 'bg-rose-100 text-rose-700',
    modernPill: 'bg-rose-100 text-rose-700',
    value: 'text-rose-900',
    title: 'text-rose-700',
    sparkStroke: '#f43f5e',
    sparkStop: '#fb7185',
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'bg-orange-100 text-orange-700',
    modernPill: 'bg-amber-100 text-amber-700',
    value: 'text-orange-900',
    title: 'text-orange-700',
    sparkStroke: '#f59e0b',
    sparkStop: '#fbbf24',
  },
  amber: {
    bg: 'bg-amber-50',
    icon: 'bg-amber-100 text-amber-700',
    modernPill: 'bg-amber-100 text-amber-700',
    value: 'text-amber-900',
    title: 'text-amber-700',
    sparkStroke: '#f59e0b',
    sparkStop: '#fbbf24',
  },
}

function generateSparklinePath(points: number[], width = 120, height = 36): { path: string; area: string } {
  if (points.length < 2) return { path: '', area: '' }
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const padding = 3
  const h = height - padding * 2

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width
    const y = height - padding - ((p - min) / range) * h
    return { x, y }
  })

  let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`
  for (let i = 0; i < coords.length - 1; i++) {
    const curr = coords[i]
    const next = coords[i + 1]
    const cp1x = curr.x + (next.x - curr.x) / 3
    const cp1y = curr.y
    const cp2x = curr.x + (2 * (next.x - curr.x)) / 3
    const cp2y = next.y
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`
  }

  const area = `${d} L ${width} ${height} L 0 ${height} Z`
  return { path: d, area }
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
  codexBadge,
  onDecodeClick,
  variant = 'classic',
  trend,
  sparklineData,
}: StatCardProps) {
  const c = colorMap[color] || colorMap.primary
  const sparkId = useId()

  const isModern = variant === 'modern' || !!trend || !!sparklineData

  if (isModern) {
    const { path: sparkPath, area: sparkArea } = sparklineData && sparklineData.length > 1
      ? generateSparklinePath(sparklineData)
      : { path: '', area: '' }

    const sentiment = trend?.sentiment ?? (trend?.direction === 'down' ? 'negative' : 'positive')
    const sentimentBadgeClass = sentiment === 'positive'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : sentiment === 'negative'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : 'bg-slate-100 text-slate-700 border-slate-200'

    const TrendIcon = trend?.direction === 'down'
      ? TrendingDown
      : trend?.direction === 'up'
      ? TrendingUp
      : Minus

    return (
      <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between relative overflow-hidden group">
        {/* Top Header: Title & Icon Pill */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs sm:text-sm font-semibold text-gray-600 truncate">{title}</p>
              {codexBadge && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDecodeClick?.(codexBadge)
                  }}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-100 hover:bg-violet-200 text-violet-800 border border-violet-300 font-mono text-[10px] font-bold tracking-wider transition-colors cursor-pointer shadow-2xs"
                  title="CodeX Bijective Value — Click to Decode"
                >
                  <Lock className="w-2.5 h-2.5 text-violet-600" />
                  <span>{codexBadge}</span>
                </button>
              )}
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-1.5 truncate">
              {value}
            </div>
          </div>

          <div className={`${c.modernPill} p-2.5 rounded-xl shrink-0 flex items-center justify-center shadow-2xs transition-transform group-hover:scale-105`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>

        {/* Bottom Section: Trend Badge & Sparkline */}
        <div className="mt-4 pt-2 border-t border-gray-50 flex items-end justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            {trend && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-gray-500 font-medium">{trend.label || 'vs last month'}</span>
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-bold border ${sentimentBadgeClass}`}>
                  <TrendIcon className="w-3 h-3" />
                  <span>{trend.value}</span>
                </span>
              </div>
            )}
            {subtitle && !trend && (
              <p className="text-xs text-gray-500 truncate">{subtitle}</p>
            )}
          </div>

          {/* Micro Sparkline */}
          {sparkPath && (
            <div className="w-24 sm:w-28 h-8 shrink-0">
              <svg viewBox="0 0 120 36" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <defs>
                  <linearGradient id={`sparkGrad-${sparkId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c.sparkStop} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={c.sparkStop} stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d={sparkArea} fill={`url(#sparkGrad-${sparkId})`} />
                <path d={sparkPath} fill="none" stroke={c.sparkStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Classic horizontal layout (backward compatible)
  return (
    <div className={`${c.bg} rounded-xl p-6 flex items-center gap-4 relative overflow-hidden`}>
      <div className={`${c.icon} p-3 rounded-lg flex-shrink-0`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm font-medium ${c.title}`}>{title}</p>
          {codexBadge && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDecodeClick?.(codexBadge)
              }}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-100 hover:bg-violet-200 text-violet-800 border border-violet-300 font-mono text-[10px] font-bold tracking-wider transition-colors cursor-pointer shadow-2xs"
              title="CodeX Bijective Value — Click to Decode"
            >
              <Lock className="w-2.5 h-2.5 text-violet-600" />
              <span>{codexBadge}</span>
            </button>
          )}
        </div>
        <div className={`text-2xl font-bold truncate ${c.value}`}>{value}</div>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>}
      </div>
    </div>
  )
}
