/**
 * @file        MonthlyTeachingHoursChart.tsx
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
 * @description Enterprise 6-month historical vertical bar chart for faculty teaching workload analytics.
 */

import React from 'react'

export interface MonthlyHoursItem {
  month: string
  year?: number
  label?: string
  hours: number
}

export interface MonthlyTeachingHoursChartProps {
  totalHours: number
  data: MonthlyHoursItem[]
}

export default function MonthlyTeachingHoursChart({
  totalHours,
  data,
}: MonthlyTeachingHoursChartProps) {
  const maxHours = Math.max(...data.map((d) => d.hours), 800)
  const yTicks = [800, 600, 400, 200, 0]

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 tracking-tight">
          Monthly Teaching Hours
        </h3>
        <div className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-xs font-bold text-indigo-700">
          Total: {totalHours.toLocaleString()} hrs
        </div>
      </div>

      <div className="pt-2">
        {/* Chart Area */}
        <div className="flex items-end gap-3 h-44">
          {/* Y Axis */}
          <div className="flex flex-col justify-between h-36 text-[10px] text-slate-400 font-mono pr-2 border-r border-slate-100">
            {yTicks.map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
          </div>

          {/* Bars */}
          <div className="flex-1 grid grid-cols-6 gap-2 sm:gap-4 items-end h-36 px-1">
            {data.map((item, idx) => {
              const heightPercent = Math.min(100, Math.round((item.hours / maxHours) * 100))
              return (
                <div key={idx} className="flex flex-col items-center h-full justify-end group">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-indigo-700 mb-1 pointer-events-none bg-indigo-50 px-1 rounded border border-indigo-100">
                    {item.hours}h
                  </div>

                  {/* Vertical Bar */}
                  <div className="w-full max-w-[32px] bg-slate-100 rounded-t-lg h-full flex items-end overflow-hidden">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-indigo-600 to-indigo-400 group-hover:from-indigo-700 group-hover:to-indigo-500 transition-all duration-500 shadow-xs"
                      style={{ height: `${Math.max(8, heightPercent)}%` }}
                    />
                  </div>

                  {/* Month Label */}
                  <span className="text-[11px] font-semibold text-slate-500 mt-2">
                    {item.month}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

