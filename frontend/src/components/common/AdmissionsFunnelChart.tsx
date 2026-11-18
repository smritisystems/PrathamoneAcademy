/**
 * @file        AdmissionsFunnelChart.tsx
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
 * @description Executive-grade admissions stage funnel visualization with inter-stage retention and drop-off velocity.
 */

import React, { useMemo } from 'react'
import {
  Layers,
  ArrowRight,
  TrendingUp,
  UserCheck,
  CheckCircle2,
  Users,
  ChevronDown,
  ArrowDown,
  Sparkles,
} from 'lucide-react'

export interface FunnelStageConfig {
  key: string
  label: string
  sublabel: string
  colorClass: string
  badgeBgClass: string
  borderClass: string
  hex: string
}

export interface AdmissionsFunnelChartProps {
  pipelineCounts?: Record<string, number>
  totalLeads?: number
  conversionRate?: number
  onSelectStage?: (stageKey: string) => void
  onNavigatePipeline?: () => void
  className?: string
}

const DEFAULT_STAGES: FunnelStageConfig[] = [
  {
    key: 'new_enquiry',
    label: 'New Enquiry',
    sublabel: 'Inbound leads & walk-ins',
    colorClass: 'bg-blue-500',
    badgeBgClass: 'bg-blue-50 text-blue-700 border-blue-200',
    borderClass: 'border-blue-200/80',
    hex: '#3b82f6',
  },
  {
    key: 'contacted',
    label: 'Contacted',
    sublabel: 'Initial counsellor call completed',
    colorClass: 'bg-amber-500',
    badgeBgClass: 'bg-amber-50 text-amber-700 border-amber-200',
    borderClass: 'border-amber-200/80',
    hex: '#f59e0b',
  },
  {
    key: 'counselling_demo',
    label: 'Counselling & Demo',
    sublabel: 'Trial class & parent counselling',
    colorClass: 'bg-purple-500',
    badgeBgClass: 'bg-purple-50 text-purple-700 border-purple-200',
    borderClass: 'border-purple-200/80',
    hex: '#a855f7',
  },
  {
    key: 'interested',
    label: 'Interested / Trial',
    sublabel: 'Confirmed intent to join',
    colorClass: 'bg-emerald-500',
    badgeBgClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    borderClass: 'border-emerald-200/80',
    hex: '#10b981',
  },
  {
    key: 'admission_pending',
    label: 'Admission Pending',
    sublabel: 'Form issued & fee calculation',
    colorClass: 'bg-orange-500',
    badgeBgClass: 'bg-orange-50 text-orange-700 border-orange-200',
    borderClass: 'border-orange-200/80',
    hex: '#f97316',
  },
  {
    key: 'converted',
    label: 'Converted to Admission',
    sublabel: 'Enrolled & student created',
    colorClass: 'bg-teal-600',
    badgeBgClass: 'bg-teal-50 text-teal-800 border-teal-200',
    borderClass: 'border-teal-200/80',
    hex: '#0d9488',
  },
]

export default function AdmissionsFunnelChart({
  pipelineCounts = {},
  totalLeads = 0,
  conversionRate = 0,
  onSelectStage,
  onNavigatePipeline,
  className = '',
}: AdmissionsFunnelChartProps) {
  const stageData = useMemo(() => {
    const rawTotal = totalLeads || Object.values(pipelineCounts).reduce((a, b) => a + b, 0) || 1

    return DEFAULT_STAGES.map((cfg, idx) => {
      const count = pipelineCounts[cfg.key] ?? 0
      const pctOfTotal = Math.round((count / rawTotal) * 100)

      // Calculate width scaling from top of funnel (100%) to bottom (min 42%)
      const widthPct = Math.round(100 - idx * 11)

      return {
        ...cfg,
        count,
        pctOfTotal,
        widthPct,
      }
    })
  }, [pipelineCounts, totalLeads])

  const calculatedConvRate = useMemo(() => {
    if (conversionRate > 0) return conversionRate
    const converted = pipelineCounts['converted'] ?? 0
    const total = totalLeads || Object.values(pipelineCounts).reduce((a, b) => a + b, 0) || 0
    return total > 0 ? Math.round((converted / total) * 1000) / 10 : 0
  }, [conversionRate, pipelineCounts, totalLeads])

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4 ${className}`}
      data-testid="admissions-funnel-chart"
    >
      {/* ── Header Row ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-200">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Admissions Pipeline Funnel</h3>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {calculatedConvRate}% Net Conv.
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Multi-tier enquiry stage drop-off and velocity towards final enrollment
            </p>
          </div>
        </div>

        {onNavigatePipeline && (
          <button
            type="button"
            onClick={onNavigatePipeline}
            className="text-xs font-bold text-primary-600 hover:text-primary-800 flex items-center gap-1 self-start sm:self-auto cursor-pointer transition-colors"
          >
            <span>Open Kanban Board</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Stepped Funnel Container ── */}
      <div className="flex flex-col items-center space-y-1.5 pt-1">
        {stageData.map((stage, idx) => {
          const nextStage = stageData[idx + 1]
          const retentionRate =
            stage.count > 0 && nextStage
              ? Math.min(Math.round((nextStage.count / stage.count) * 100), 100)
              : null
          const dropOffCount =
            nextStage && stage.count > nextStage.count ? stage.count - nextStage.count : null

          return (
            <React.Fragment key={stage.key}>
              {/* Funnel Stage Tier */}
              <div
                style={{ width: `${stage.widthPct}%` }}
                onClick={() => onSelectStage?.(stage.key)}
                className={`group p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                  stage.borderClass
                } bg-white hover:bg-slate-50 hover:shadow-xs relative flex items-center justify-between gap-3 min-w-[280px]`}
                role="button"
                tabIndex={0}
                title={`Stage: ${stage.label} • ${stage.count} enquiries (${stage.pctOfTotal}%)`}
              >
                {/* Left: Indicator & Labels */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-2.5 h-6 rounded-full inline-block flex-shrink-0"
                    style={{ backgroundColor: stage.hex }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800 truncate group-hover:text-primary-700">
                        {stage.label}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">#{idx + 1}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate hidden sm:block">
                      {stage.sublabel}
                    </p>
                  </div>
                </div>

                {/* Right: Count & Percentage Pill */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <span className="text-sm font-black text-slate-900 font-mono">
                      {stage.count}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">leads</span>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${stage.badgeBgClass}`}
                  >
                    {stage.pctOfTotal}%
                  </span>
                </div>
              </div>

              {/* Inter-Stage Connector & Velocity */}
              {nextStage && (
                <div className="flex items-center justify-center gap-2 py-0.5 text-[10px] text-slate-400 font-medium">
                  <ArrowDown className="w-3 h-3 text-slate-300" />
                  {retentionRate !== null && (
                    <span className="font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                      {retentionRate}% transition
                    </span>
                  )}
                  {dropOffCount !== null && dropOffCount > 0 && (
                    <span className="text-rose-500 font-semibold">
                      (-{dropOffCount} dropped)
                    </span>
                  )}
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* ── Bottom Summary Row ── */}
      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-teal-600 flex-shrink-0" />
          <span>
            Total Converted:{' '}
            <strong className="text-slate-900 font-bold">
              {pipelineCounts['converted'] ?? 0}
            </strong>{' '}
            enrolled from pipeline (<span className="font-semibold text-slate-700">{totalLeads} total enquiries</span>)
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">
          Click any stage to filter pipeline leads
        </span>
      </div>
    </div>
  )
}
