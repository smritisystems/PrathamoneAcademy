/**
 * @file        BatchCapacityBulletMeter.tsx
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
 * @created     2026-11-18
 * @updated     2026-11-18
 *
 * @description Stephen Few-specification bullet meter for academic batch seating capacity & saturation.
 */

import React, { useMemo } from 'react'
import { Users, AlertTriangle, CheckCircle, Info } from 'lucide-react'

export interface BatchCapacityBulletMeterProps {
  enrolled: number
  capacity: number
  targetPercentage?: number
  label?: string
  roomNumber?: string
  compact?: boolean
  showBadge?: boolean
  showScale?: boolean
  className?: string
}

export default function BatchCapacityBulletMeter({
  enrolled,
  capacity = 40,
  targetPercentage = 85,
  label,
  roomNumber,
  compact = false,
  showBadge = true,
  showScale = true,
  className = '',
}: BatchCapacityBulletMeterProps) {
  const safeCapacity = capacity > 0 ? capacity : 40
  const occupancyPct = Math.round((enrolled / safeCapacity) * 100)
  const availableSeats = Math.max(safeCapacity - enrolled, 0)
  const isOverbooked = enrolled > safeCapacity

  // Status classification
  const statusInfo = useMemo(() => {
    if (occupancyPct >= 100) {
      return {
        label: isOverbooked ? 'Overcrowded' : 'At Capacity',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        barColorClass: 'bg-rose-600',
        textColorClass: 'text-rose-700',
      }
    }
    if (occupancyPct >= targetPercentage) {
      return {
        label: 'Optimal',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        barColorClass: 'bg-emerald-600',
        textColorClass: 'text-emerald-700',
      }
    }
    if (occupancyPct >= 50) {
      return {
        label: 'Moderate',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        barColorClass: 'bg-blue-600',
        textColorClass: 'text-blue-700',
      }
    }
    return {
      label: 'Under-Capacity',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      barColorClass: 'bg-slate-600',
      textColorClass: 'text-slate-600',
    }
  }, [occupancyPct, targetPercentage, isOverbooked])

  // Normalized bar width capped at 100% for display
  const visualBarWidth = Math.min(occupancyPct, 100)

  if (compact) {
    return (
      <div className={`space-y-1 ${className}`} data-testid="batch-capacity-bullet-meter-compact">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-slate-700">
            {enrolled} / {safeCapacity} seats
          </span>
          <span className={`font-mono font-bold ${statusInfo.textColorClass}`}>
            {occupancyPct}%
          </span>
        </div>

        {/* Compact Bullet Graph */}
        <div
          className="relative h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner border border-slate-200"
          title={`Enrolled: ${enrolled}/${safeCapacity} (${occupancyPct}%) • Target: ${targetPercentage}%`}
        >
          {/* Qualitative Background Bands */}
          <div className="absolute inset-0 flex">
            <div className="w-[50%] h-full bg-slate-200/50" />
            <div className="w-[30%] h-full bg-blue-100/60" />
            <div className="w-[15%] h-full bg-emerald-100/70" />
            <div className="w-[5%] h-full bg-rose-100/70" />
          </div>

          {/* Primary Measure (Enrolled Bar) */}
          <div
            className={`h-full ${statusInfo.barColorClass} transition-all duration-500 relative z-10 rounded-full`}
            style={{ width: `${visualBarWidth}%` }}
          />

          {/* Target Notch */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-slate-900 z-20 shadow-xs"
            style={{ left: `${targetPercentage}%` }}
            title={`Target: ${targetPercentage}%`}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`space-y-2 select-none ${className}`}
      data-testid="batch-capacity-bullet-meter"
    >
      {/* ── Label & Metric Header ── */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {label && <span className="font-bold text-slate-900">{label}</span>}
          {roomNumber && (
            <span className="text-[11px] text-slate-400 font-medium">Room: {roomNumber}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-600 font-medium">
            <strong className="text-slate-900 font-bold">{enrolled}</strong> / {safeCapacity} seats
          </span>
          {showBadge && (
            <span
              className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusInfo.badgeClass}`}
            >
              {statusInfo.label} ({occupancyPct}%)
            </span>
          )}
        </div>
      </div>

      {/* ── Stephen Few Bullet Graph Container ── */}
      <div className="relative pt-0.5 pb-1">
        {/* Graph Bar Wrapper */}
        <div
          className="relative h-4 w-full rounded-md overflow-hidden border border-slate-300/80 shadow-inner"
          title={`Enrolled: ${enrolled}/${safeCapacity} (${occupancyPct}%) • Target: ${targetPercentage}% optimal saturation`}
        >
          {/* Qualitative Background Range Bands */}
          <div className="absolute inset-0 flex pointer-events-none">
            {/* Range 1: 0 - 50% Under-Capacity */}
            <div
              className="w-[50%] h-full bg-slate-100"
              title="Under-Capacity Range (0–50%)"
            />
            {/* Range 2: 50% - 80% Moderate Capacity */}
            <div
              className="w-[30%] h-full bg-slate-200/90"
              title="Moderate Range (50–80%)"
            />
            {/* Range 3: 80% - 95% Optimal Seating */}
            <div
              className="w-[15%] h-full bg-emerald-100/80"
              title="Optimal Range (80–95%)"
            />
            {/* Range 4: 95% - 100%+ Near Full / Saturated */}
            <div
              className="w-[5%] h-full bg-rose-200/90"
              title="Saturation Range (95–100%)"
            />
          </div>

          {/* Primary Measure: Enrolled Bar */}
          <div
            className={`h-full ${statusInfo.barColorClass} transition-all duration-500 relative z-10 shadow-xs`}
            style={{ width: `${visualBarWidth}%` }}
          />

          {/* Target Comparative Marker (Stephen Few vertical tick) */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-slate-900 z-20 shadow-xs"
            style={{ left: `calc(${targetPercentage}% - 2px)` }}
            title={`Comparative Target: ${targetPercentage}%`}
          />
        </div>

        {/* Scale & Quantitative Axis Ticks */}
        {showScale && (
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1 px-0.5">
            <span>0</span>
            <span>50%</span>
            <span className="font-bold text-slate-700" title="Target Marker">
              {targetPercentage}% Target
            </span>
            <span>100% Max</span>
          </div>
        )}
      </div>

      {/* ── Vacancy Helper Footer ── */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
        <span className="flex items-center gap-1 font-medium">
          {availableSeats > 0 ? (
            <>
              <CheckCircle className="w-3 h-3 text-emerald-600" />
              <span>
                <strong className="text-slate-800 font-bold">{availableSeats}</strong> seats
                available
              </span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              <span className="text-rose-600 font-semibold">Classroom fully booked</span>
            </>
          )}
        </span>
        <span className="text-[10px] text-slate-400">Target: {Math.round((safeCapacity * targetPercentage) / 100)} seats</span>
      </div>
    </div>
  )
}
