/**
 * @file        WorkforceDonutChart.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.workforce
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-06
 * @updated     2026-11-06
 *
 * @description Enterprise interactive SVG Donut Chart for Teacher Status Distribution and Department Allocations.
 */

import React from 'react'

export interface DonutSegment {
  label: string
  count: number
  color: string
}

export interface WorkforceDonutChartProps {
  title: string
  totalCount: number
  unitLabel: string
  segments: DonutSegment[]
}

export default function WorkforceDonutChart({
  title,
  totalCount,
  unitLabel,
  segments,
}: WorkforceDonutChartProps) {
  const radius = 54
  const strokeWidth = 18
  const circumference = 2 * Math.PI * radius

  // Calculate cumulative percentages and strokes
  const safeTotal = totalCount > 0 ? totalCount : 1
  let cumulativePercent = 0

  const processedSegments = segments.map((seg) => {
    const percent = totalCount > 0 ? (seg.count / safeTotal) * 100 : 0
    const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`
    const strokeDashoffset = -((cumulativePercent / 100) * circumference)
    cumulativePercent += percent

    return {
      ...seg,
      percent: Math.round(percent),
      strokeDasharray,
      strokeDashoffset,
    }
  })

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
      <h3 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h3>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* SVG Donut */}
        <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 140 140">
            {/* Background Track */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              className="text-slate-100"
              strokeWidth={strokeWidth}
              stroke="currentColor"
              fill="transparent"
            />
            {/* Segments */}
            {processedSegments.map((seg, idx) => (
              <circle
                key={idx}
                cx="70"
                cy="70"
                r={radius}
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700 ease-out"
              />
            ))}
          </svg>

          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-2xl font-extrabold text-slate-900 leading-none">
              {totalCount}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-1">
              {unitLabel}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="w-full space-y-2.5">
          {processedSegments.map((seg, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-none"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-slate-700 font-medium">
                  {seg.label} ({seg.percent}%)
                </span>
              </div>
              <span className="font-bold text-slate-900">{seg.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

