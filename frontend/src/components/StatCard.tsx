/**
 * @file        StatCard.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-03
 * @updated     2026-11-07
 *
 * @description KPI metric stat card component with icon container, trend indicator, and status badge.
 */

import { type LucideIcon, Lock } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number | React.ReactNode
  icon: LucideIcon
  color: 'blue' | 'green' | 'purple' | 'red' | 'orange'
  subtitle?: string
  codexBadge?: string
  onDecodeClick?: (code: string) => void
}

const colorMap = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'bg-blue-100 text-blue-700',
    value: 'text-blue-900',
    title: 'text-blue-700',
  },
  green: {
    bg: 'bg-green-50',
    icon: 'bg-green-100 text-green-700',
    value: 'text-green-900',
    title: 'text-green-700',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'bg-purple-100 text-purple-700',
    value: 'text-purple-900',
    title: 'text-purple-700',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'bg-red-100 text-red-700',
    value: 'text-red-900',
    title: 'text-red-700',
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'bg-orange-100 text-orange-700',
    value: 'text-orange-900',
    title: 'text-orange-700',
  },
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
  codexBadge,
  onDecodeClick,
}: StatCardProps) {
  const c = colorMap[color]
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

