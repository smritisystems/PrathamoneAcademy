/**
 * @file        ReportIntelligenceBanner.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.reports
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-11
 * @updated     2026-11-11
 *
 * @description Universal Report Calculation & Intelligence Engine component.
 */

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Lightbulb,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Info,
  Sliders,
  X,
  ExternalLink,
  Calculator,
  Target,
  Edit2,
  Save,
  RotateCcw,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { reportIntelligenceApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import type {
  ReportKPIItem,
  ReportInsightItem,
  ReportComparisonItem,
  ReportIntelligencePayload,
} from '../../types'

interface ReportIntelligenceBannerProps {
  reportId: string
  filters?: Record<string, any>
  onDrillDown?: (filterKey: string, value: any) => void
}

export default function ReportIntelligenceBanner({
  reportId,
  filters = {},
  onDrillDown,
}: ReportIntelligenceBannerProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  // Modal states
  const [selectedKPI, setSelectedKPI] = useState<ReportKPIItem | null>(null)
  const [showThresholdModal, setShowThresholdModal] = useState<boolean>(false)
  const [isEditMode, setIsEditMode] = useState<boolean>(false)
  const [thresholdDraft, setThresholdDraft] = useState<Record<string, number>>({})

  // RBAC permission for threshold adjustment
  const canManageThresholds =
    user?.role && ['admin', 'sysadmin', 'superadmin', 'principal'].includes(user.role.toLowerCase())

  // Fetch report intelligence metrics
  const {
    data: intelligence,
    isLoading,
    isError,
  } = useQuery<ReportIntelligencePayload>({
    queryKey: ['report-intelligence', reportId, filters],
    queryFn: () => reportIntelligenceApi.getMetrics(reportId, filters).then((res) => res.data),
    staleTime: 30000,
  })

  // Fetch institutional thresholds
  const { data: thresholdData } = useQuery({
    queryKey: ['report-thresholds'],
    queryFn: () => reportIntelligenceApi.getThresholds().then((res) => res.data),
    enabled: showThresholdModal,
  })

  // Synchronize thresholdDraft when thresholdData loads
  useEffect(() => {
    if (thresholdData?.thresholds && Object.keys(thresholdDraft).length === 0) {
      setThresholdDraft(thresholdData.thresholds)
    }
  }, [thresholdData, thresholdDraft])

  // Mutation to update institutional thresholds
  const updateThresholdMutation = useMutation({
    mutationFn: (newThresholds: Record<string, number>) =>
      reportIntelligenceApi.updateThresholds(newThresholds),
    onSuccess: () => {
      toast.success('Institutional benchmark thresholds updated successfully')
      setIsEditMode(false)
      queryClient.invalidateQueries({ queryKey: ['report-intelligence'] })
      queryClient.invalidateQueries({ queryKey: ['report-thresholds'] })
      setShowThresholdModal(false)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to update thresholds')
    },
  })

  if (isLoading) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 bg-slate-200 rounded w-48"></div>
          <div className="h-4 bg-slate-200 rounded w-32"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 bg-slate-200 rounded-xl"></div>
          <div className="h-24 bg-slate-200 rounded-xl"></div>
          <div className="h-24 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    )
  }

  if (isError || !intelligence) {
    return null
  }

  const { kpis = [], insights = [], comparisons } = intelligence

  const getStatusBadge = (status: ReportKPIItem['status'], badge?: string) => {
    switch (status) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertOctagon className="w-3 h-3" />
            {badge || 'Critical Attention'}
          </span>
        )
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3" />
            {badge || 'Under Target'}
          </span>
        )
      case 'positive':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            {badge || 'Healthy & On Track'}
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Info className="w-3 h-3" />
            {badge || 'Calculated Metric'}
          </span>
        )
    }
  }

  const getInsightIcon = (severity: ReportInsightItem['severity']) => {
    switch (severity) {
      case 'critical':
        return <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
      case 'positive':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
      default:
        return <Info className="w-5 h-5 text-sky-600 shrink-0" />
    }
  }

  const getInsightBorder = (severity: ReportInsightItem['severity']) => {
    switch (severity) {
      case 'critical':
        return 'border-rose-200 bg-rose-50/60'
      case 'warning':
        return 'border-amber-200 bg-amber-50/60'
      case 'positive':
        return 'border-emerald-200 bg-emerald-50/60'
      default:
        return 'border-sky-200 bg-sky-50/60'
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden mb-6 transition-all">
      {/* ── Banner Header ──────────────────────────────────────────────────────── */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center justify-center font-bold">
            <Calculator className="w-4 h-4 text-indigo-300" />
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight flex items-center gap-2">
              Decision Intelligence & Calculation Provenance
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/20 uppercase">
                Zero Blackbox
              </span>
            </h3>
            <p className="text-[11px] text-slate-300 font-medium">
              Audited formulas, denominator rules, and deterministic decision insights
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canManageThresholds && (
            <button
              onClick={() => {
                if (thresholdData?.thresholds) {
                  setThresholdDraft(thresholdData.thresholds)
                }
                setIsEditMode(false)
                setShowThresholdModal(true)
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 rounded-lg transition-colors border border-white/10"
              title="Configure Institutional Benchmark Thresholds"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-300" />
              <span>Benchmarks</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* ── Summary KPI Cards ─────────────────────────────────────────────────── */}
        {kpis.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {kpis.map((kpi) => (
              <div
                key={kpi.id}
                className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-4 hover:border-slate-300 hover:bg-slate-50 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-600 line-clamp-1">{kpi.name}</span>
                    <button
                      onClick={() => setSelectedKPI(kpi)}
                      className="text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                      title="Inspect How It Was Calculated"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-baseline gap-1.5 mb-2">
                    <span className="text-2xl font-black text-slate-900 tracking-tight">
                      {kpi.formatted_value}
                    </span>
                    {kpi.unit && <span className="text-xs font-semibold text-slate-500">{kpi.unit}</span>}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                  <div>{getStatusBadge(kpi.status, kpi.badge_label)}</div>

                  {kpi.variance !== undefined && kpi.variance !== null && (
                    <div
                      className={`text-[11px] font-bold flex items-center gap-0.5 ${
                        kpi.variance >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {kpi.variance >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>
                        {kpi.variance > 0 ? `+${kpi.variance}%` : `${kpi.variance}%`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Target vs Actual Comparison Bar (Optional) ───────────────────────── */}
        {comparisons && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-700">
                {comparisons.benchmark_name}
              </span>
            </div>
            <div className="flex-1 max-w-md mx-auto sm:mx-0 w-full flex items-center gap-3">
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    comparisons.actual >= comparisons.target ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(comparisons.actual, 100)}%` }}
                />
              </div>
              <div className="text-xs font-black text-slate-800 whitespace-nowrap">
                {comparisons.actual}%{' '}
                <span className="text-[10px] font-medium text-slate-500">
                  (Target: {comparisons.target}%)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Deterministic Decision Insights ──────────────────────────────────── */}
        {insights.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>Key Intelligence & Required Actions ({insights.length})</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${getInsightBorder(
                    insight.severity
                  )}`}
                >
                  {getInsightIcon(insight.severity)}
                  <div className="flex-1 space-y-1">
                    <h4 className="text-xs font-black text-slate-900">{insight.title}</h4>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      <strong className="text-slate-900">What Happened:</strong> {insight.what_happened}
                    </p>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      <strong className="text-slate-900">Why It Matters:</strong> {insight.why_it_matters}
                    </p>
                    <div className="pt-1.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/50">
                      <span className="text-xs font-semibold text-slate-900">
                        ⚡ Action: {insight.action_required}
                      </span>
                      {insight.action_url && (
                        <button
                          onClick={() => {
                            if (insight.action_url?.startsWith('/')) {
                              navigate(insight.action_url)
                            } else if (onDrillDown && insight.metric_key) {
                              onDrillDown(insight.metric_key, true)
                            }
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline"
                        >
                          <span>{insight.action_label || 'Take Action'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: "How It Was Calculated" Provenance Modal ─────────────────────── */}
      {selectedKPI && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">
                  Calculation Formula & Provenance
                </h3>
              </div>
              <button
                onClick={() => setSelectedKPI(null)}
                className="text-slate-400 hover:text-slate-700 rounded-lg p-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Metric Name
                </span>
                <p className="text-sm font-bold text-slate-900">{selectedKPI.name}</p>
              </div>

              {/* Exact Mathematical Formula */}
              <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-xs overflow-x-auto shadow-inner">
                <div className="text-[10px] text-slate-400 uppercase font-sans mb-1 font-bold">
                  Authoritative Formula
                </div>
                <code>{selectedKPI.explanation.formula}</code>
              </div>

              {/* Numerator and Denominator Inspection */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Numerator</div>
                  <div className="font-semibold text-slate-900">{selectedKPI.explanation.numerator_name}</div>
                  <div className="text-sm font-black text-indigo-700">
                    {selectedKPI.explanation.numerator_value.toLocaleString()}
                  </div>
                </div>

                {selectedKPI.explanation.denominator_name && (
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Denominator</div>
                    <div className="font-semibold text-slate-900">
                      {selectedKPI.explanation.denominator_name}
                    </div>
                    <div className="text-sm font-black text-indigo-700">
                      {(selectedKPI.explanation.denominator_value ?? 0).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              {/* Inclusion and Exclusion Metadata */}
              {(selectedKPI.explanation.included_count !== undefined ||
                selectedKPI.explanation.excluded_count !== undefined) && (
                <div className="flex items-center gap-4 text-xs font-medium">
                  {selectedKPI.explanation.included_count !== undefined && (
                    <span className="text-emerald-700">
                      <strong>Included Records:</strong> {selectedKPI.explanation.included_count}
                    </span>
                  )}
                  {selectedKPI.explanation.excluded_count !== undefined && (
                    <span className="text-slate-500">
                      <strong>Excluded Records:</strong> {selectedKPI.explanation.excluded_count}
                    </span>
                  )}
                </div>
              )}

              {/* Plain English Narrative Breakdown */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Plain-English Breakdown
                </span>
                <p className="text-xs text-slate-800 leading-relaxed bg-indigo-50/60 p-3 rounded-lg border border-indigo-100 font-medium">
                  {selectedKPI.explanation.plain_english_breakdown}
                </p>
              </div>

              {/* Context and Rounding Rules */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                <div>
                  <strong>Context:</strong> {selectedKPI.explanation.filter_context}
                </div>
                <div>
                  <strong>Rounding:</strong> {selectedKPI.explanation.rounding_rule}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedKPI(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Customize Institutional Benchmark Thresholds ────────────────── */}
      {showThresholdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">
                  Institutional Benchmarks & Target Thresholds
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowThresholdModal(false)
                  setIsEditMode(false)
                }}
                className="text-slate-400 hover:text-slate-700 rounded-lg p-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600">
                  Global benchmark targets used to evaluate performance across reports and trigger alerts.
                </p>
                {!isEditMode && canManageThresholds && (
                  <button
                    onClick={() => {
                      if (thresholdData?.thresholds) {
                        setThresholdDraft(thresholdData.thresholds)
                      }
                      setIsEditMode(true)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Thresholds</span>
                  </button>
                )}
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {Object.entries(thresholdDraft).map(([key, val]) => {
                  const label = key
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, (c) => c.toUpperCase())
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">{label}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{key}</div>
                      </div>

                      {isEditMode ? (
                        <div className="flex items-center gap-1.5 w-24">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={val}
                            onChange={(e) => {
                              const num = parseFloat(e.target.value) || 0
                              setThresholdDraft((prev) => ({ ...prev, [key]: num }))
                            }}
                            className="w-full text-right px-2 py-1 text-xs font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          />
                          <span className="text-xs font-bold text-slate-600">%</span>
                        </div>
                      ) : (
                        <span className="text-sm font-black text-indigo-700">{val}%</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              {isEditMode ? (
                <>
                  <button
                    onClick={() => {
                      if (thresholdData?.thresholds) {
                        setThresholdDraft(thresholdData.thresholds)
                      }
                      setIsEditMode(false)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={() => updateThresholdMutation.mutate(thresholdDraft)}
                    disabled={updateThresholdMutation.isPending}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowThresholdModal(false)}
                  className="w-full px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
