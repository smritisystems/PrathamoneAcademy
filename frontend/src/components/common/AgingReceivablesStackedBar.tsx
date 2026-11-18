/**
 * @file        AgingReceivablesStackedBar.tsx
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
 * @description Interactive 100% horizontal stacked receivables aging bar and credit-risk distribution cards.
 */

import React, { useMemo } from 'react'
import { AlertCircle, Clock, CheckCircle2, ChevronRight, TrendingUp, AlertTriangle, ShieldAlert } from 'lucide-react'

export type AgingBracketId = '1-30' | '31-60' | '61-90' | '90+' | '60+'

export interface DefaulterRecord {
  overdue_amount: number
  overdue_days: number
  student_name?: string
  [key: string]: any
}

export interface AgingBucket {
  id: AgingBracketId
  label: string
  rangeLabel: string
  amount: number
  count: number
  percentage: number
  color: string
  barClass: string
  bgLightClass: string
  borderClass: string
  textClass: string
  riskLevel: 'mild' | 'moderate' | 'elevated' | 'critical'
}

export interface AgingReceivablesStackedBarProps {
  defaulters?: DefaulterRecord[]
  totalOutstanding?: number
  currencyFormatter?: (amount: number) => string
  onSelectBracket?: (bracket: AgingBracketId | 'all') => void
  onNavigateDefaulters?: () => void
  activeBracket?: AgingBracketId | 'all'
  className?: string
}

const DEFAULT_FMT = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

export default function AgingReceivablesStackedBar({
  defaulters = [],
  totalOutstanding,
  currencyFormatter = DEFAULT_FMT,
  onSelectBracket,
  onNavigateDefaulters,
  activeBracket = 'all',
  className = '',
}: AgingReceivablesStackedBarProps) {
  const buckets = useMemo<AgingBucket[]>(() => {
    // If we have concrete defaulter rows, compute from rows
    if (defaulters && defaulters.length > 0) {
      const b1 = defaulters.filter((d) => d.overdue_days <= 30)
      const b2 = defaulters.filter((d) => d.overdue_days > 30 && d.overdue_days <= 60)
      const b3 = defaulters.filter((d) => d.overdue_days > 60 && d.overdue_days <= 90)
      const b4 = defaulters.filter((d) => d.overdue_days > 90)

      const a1 = b1.reduce((sum, d) => sum + Number(d.overdue_amount || 0), 0)
      const a2 = b2.reduce((sum, d) => sum + Number(d.overdue_amount || 0), 0)
      const a3 = b3.reduce((sum, d) => sum + Number(d.overdue_amount || 0), 0)
      const a4 = b4.reduce((sum, d) => sum + Number(d.overdue_amount || 0), 0)

      const sumAll = a1 + a2 + a3 + a4 || (totalOutstanding ?? 0) || 1

      return [
        {
          id: '1-30',
          label: '1–30 Days',
          rangeLabel: 'Current / Grace Period',
          amount: a1,
          count: b1.length,
          percentage: (a1 / sumAll) * 100,
          color: '#10b981',
          barClass: 'bg-emerald-500 hover:bg-emerald-600',
          bgLightClass: 'bg-emerald-50/60',
          borderClass: 'border-emerald-200',
          textClass: 'text-emerald-700',
          riskLevel: 'mild',
        },
        {
          id: '31-60',
          label: '31–60 Days',
          rangeLabel: 'Moderate Overdue',
          amount: a2,
          count: b2.length,
          percentage: (a2 / sumAll) * 100,
          color: '#f59e0b',
          barClass: 'bg-amber-500 hover:bg-amber-600',
          bgLightClass: 'bg-amber-50/60',
          borderClass: 'border-amber-200',
          textClass: 'text-amber-700',
          riskLevel: 'moderate',
        },
        {
          id: '61-90',
          label: '61–90 Days',
          rangeLabel: 'Elevated Default Risk',
          amount: a3,
          count: b3.length,
          percentage: (a3 / sumAll) * 100,
          color: '#f97316',
          barClass: 'bg-orange-500 hover:bg-orange-600',
          bgLightClass: 'bg-orange-50/60',
          borderClass: 'border-orange-200',
          textClass: 'text-orange-700',
          riskLevel: 'elevated',
        },
        {
          id: '90+',
          label: '90+ Days',
          rangeLabel: 'Severe Delinquency',
          amount: a4,
          count: b4.length,
          percentage: (a4 / sumAll) * 100,
          color: '#e11d48',
          barClass: 'bg-rose-600 hover:bg-rose-700',
          bgLightClass: 'bg-rose-50/60',
          borderClass: 'border-rose-200',
          textClass: 'text-rose-700',
          riskLevel: 'critical',
        },
      ]
    }

    // Fallback if defaulters list is empty but totalOutstanding > 0 (e.g. current billing cycle)
    const effectiveTotal = totalOutstanding || 0
    return [
      {
        id: '1-30',
        label: '1–30 Days',
        rangeLabel: 'Current Term Billing',
        amount: effectiveTotal,
        count: effectiveTotal > 0 ? 1 : 0,
        percentage: effectiveTotal > 0 ? 100 : 0,
        color: '#10b981',
        barClass: 'bg-emerald-500 hover:bg-emerald-600',
        bgLightClass: 'bg-emerald-50/60',
        borderClass: 'border-emerald-200',
        textClass: 'text-emerald-700',
        riskLevel: 'mild',
      },
      {
        id: '31-60',
        label: '31–60 Days',
        rangeLabel: 'Moderate Overdue',
        amount: 0,
        count: 0,
        percentage: 0,
        color: '#f59e0b',
        barClass: 'bg-amber-500 hover:bg-amber-600',
        bgLightClass: 'bg-amber-50/60',
        borderClass: 'border-amber-200',
        textClass: 'text-amber-700',
        riskLevel: 'moderate',
      },
      {
        id: '61-90',
        label: '61–90 Days',
        rangeLabel: 'Elevated Default Risk',
        amount: 0,
        count: 0,
        percentage: 0,
        color: '#f97316',
        barClass: 'bg-orange-500 hover:bg-orange-600',
        bgLightClass: 'bg-orange-50/60',
        borderClass: 'border-orange-200',
        textClass: 'text-orange-700',
        riskLevel: 'elevated',
      },
      {
        id: '90+',
        label: '90+ Days',
        rangeLabel: 'Severe Delinquency',
        amount: 0,
        count: 0,
        percentage: 0,
        color: '#e11d48',
        barClass: 'bg-rose-600 hover:bg-rose-700',
        bgLightClass: 'bg-rose-50/60',
        borderClass: 'border-rose-200',
        textClass: 'text-rose-700',
        riskLevel: 'critical',
      },
    ]
  }, [defaulters, totalOutstanding])

  const aggregateAmount = useMemo(() => {
    const sum = buckets.reduce((acc, b) => acc + b.amount, 0)
    return sum || totalOutstanding || 0
  }, [buckets, totalOutstanding])

  const totalDefaultersCount = useMemo(() => {
    return buckets.reduce((acc, b) => acc + b.count, 0)
  }, [buckets])

  const criticalBucket = buckets.find((b) => b.id === '90+')
  const elevatedBucket = buckets.find((b) => b.id === '61-90')
  const hasSevereOverdue = (criticalBucket?.amount || 0) > 0 || (elevatedBucket?.amount || 0) > 0

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4 ${className}`}
      data-testid="aging-receivables-stacked-bar"
    >
      {/* ── Header Row ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Receivables Aging & Credit Risk Distribution</h3>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                100% Stacked
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Portfolio risk breakdown by overdue days bracket ({totalDefaultersCount} overdue student accounts)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onNavigateDefaulters && (
            <button
              type="button"
              onClick={onNavigateDefaulters}
              className="text-xs font-bold text-primary-600 hover:text-primary-800 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>View Defaulters Register</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── 100% Stacked Horizontal Bar ── */}
      <div className="space-y-1.5">
        <div className="h-5 w-full bg-slate-100 rounded-xl overflow-hidden flex shadow-inner border border-slate-200/80">
          {aggregateAmount === 0 ? (
            <div className="w-full h-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white tracking-wide">
              100% Settled — Zero Overdue Receivables
            </div>
          ) : (
            buckets.map((b) => {
              if (b.percentage <= 0) return null
              const isSelected =
                activeBracket === b.id || (activeBracket === '60+' && (b.id === '61-90' || b.id === '90+'))
              return (
                <div
                  key={b.id}
                  onClick={() => onSelectBracket?.(b.id)}
                  style={{ width: `${Math.max(b.percentage, 2)}%` }}
                  title={`${b.label}: ${currencyFormatter(b.amount)} (${b.percentage.toFixed(1)}%) • ${b.count} students`}
                  className={`${b.barClass} h-full transition-all duration-300 cursor-pointer relative group flex items-center justify-center ${
                    isSelected ? 'ring-2 ring-slate-900 ring-offset-1 z-10' : ''
                  }`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${b.label}: ${currencyFormatter(b.amount)}`}
                >
                  {b.percentage >= 14 && (
                    <span className="text-[10px] font-extrabold text-white truncate px-1 drop-shadow-xs">
                      {b.percentage.toFixed(0)}%
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Bar Legend / Helper */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5">
          <span className="font-semibold text-slate-600">
            Total Overdue Portfolio:{' '}
            <strong className="text-slate-900 font-bold">{currencyFormatter(aggregateAmount)}</strong>
          </span>
          <span className="text-[10px] text-slate-400 font-medium">Click segment or card below to filter register</span>
        </div>
      </div>

      {/* ── 4 Interactive Bracket Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
        {buckets.map((b) => {
          const isSelected =
            activeBracket === b.id || (activeBracket === '60+' && (b.id === '61-90' || b.id === '90+'))
          return (
            <div
              key={b.id}
              onClick={() => onSelectBracket?.(isSelected ? 'all' : b.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                b.bgLightClass
              } ${b.borderClass} ${
                isSelected ? 'ring-2 ring-primary-600 shadow-sm scale-[1.01]' : 'hover:shadow-xs hover:border-slate-300'
              }`}
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                    style={{ backgroundColor: b.color }}
                  />
                  <span className="text-xs font-bold text-slate-800">{b.label}</span>
                </div>
                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${b.textClass} bg-white/80 border ${b.borderClass}`}>
                  {b.percentage.toFixed(1)}%
                </span>
              </div>

              <div className="text-lg font-black text-slate-900 leading-tight">
                {currencyFormatter(b.amount)}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-600 mt-1.5 pt-1.5 border-t border-slate-200/60 font-medium">
                <span>{b.count} student{b.count === 1 ? '' : 's'}</span>
                <span className="text-[10px] text-slate-400 truncate">{b.rangeLabel}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Actionable Risk Alert Strip ── */}
      {hasSevereOverdue ? (
        <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl flex items-start gap-2.5 text-xs text-rose-900">
          <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Recovery Priority: </span>
            <span>
              {criticalBucket?.count || 0} student(s) have fee dues pending beyond 90 days totaling{' '}
              <strong>{currencyFormatter(criticalBucket?.amount || 0)}</strong>. Immediate automated multi-channel reminder dispatch is advised.
            </span>
          </div>
          {onNavigateDefaulters && (
            <button
              type="button"
              onClick={onNavigateDefaulters}
              className="text-xs font-bold text-rose-700 hover:text-rose-900 underline flex-shrink-0 cursor-pointer"
            >
              Take Action
            </button>
          )}
        </div>
      ) : (
        <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/70 rounded-xl flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">
              <strong className="font-bold">Stable Aging Health:</strong> No accounts exceed 60+ days delinquent. All outstanding fees remain within manageable billing terms.
            </span>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-100/80 px-2 py-0.5 rounded-full">
            Low Credit Risk
          </span>
        </div>
      )}
    </div>
  )
}
