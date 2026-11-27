/**
 * @file        BudgetingForecastingWorkspace.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.pages
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-27
 * @updated     2026-11-27
 *
 * @description Financial Planning & Analysis (FP&A) workspace for Institutional Budgeting, Live Budget-vs-Actuals Variance, and 3-Driver Cashflow Forecasting.
 */

import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  TrendingUp,
  Plus,
  Lock,
  CheckCircle2,
  GitBranch,
  Download,
  Sliders,
  Send,
  RefreshCw,
} from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import {
  financeApi,
  BudgetPlanItem,
  BudgetVarianceResponse,
  ForecastScenarioItem,
  ForecastResponse,
} from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { useBranding } from '../config/branding'
import EditModeBar from '../components/common/EditModeBar'

type WorkspaceTab = 'budgets' | 'variance' | 'forecasts'

const formatINR = (val: number | undefined | null): string => {
  if (val === undefined || val === null || Number.isNaN(val)) return '—'
  return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  submitted: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  approved: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  locked: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
  superseded: 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
}

const HEALTH_BADGE: Record<string, string> = {
  favorable: 'bg-emerald-50 text-emerald-700',
  on_track: 'bg-sky-50 text-sky-700',
  warning: 'bg-amber-50 text-amber-700',
  overrun: 'bg-rose-50 text-rose-700',
  behind: 'bg-amber-50 text-amber-700',
  unbudgeted: 'bg-slate-100 text-slate-500',
}

export default function BudgetingForecastingWorkspace() {
  const branding = useBranding()
  const location = useLocation()
  const { selectedInstitutionId } = useAuthStore()
  const instId = selectedInstitutionId || 1
  const budgetEditScope = 'finance:budgets'
  const isEditMode = useEditModeStore((s) => !!s.scopes[budgetEditScope])
  const disableEditMode = useEditModeStore((s) => s.disableEditMode)

  const initialTab: WorkspaceTab = location.pathname.includes('/variance')
    ? 'variance'
    : location.pathname.includes('/forecasts')
      ? 'forecasts'
      : 'budgets'

  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab)
  const [plans, setPlans] = useState<BudgetPlanItem[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null)
  const [variance, setVariance] = useState<BudgetVarianceResponse | null>(null)
  const [editedAmounts, setEditedAmounts] = useState<Record<number, string>>({})
  const [periodFilter, setPeriodFilter] = useState<string>('all')

  const [scenarios, setScenarios] = useState<ForecastScenarioItem[]>([])
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(null)
  const [forecast, setForecast] = useState<ForecastResponse | null>(null)
  const [horizonMonths, setHorizonMonths] = useState<number>(6)
  const [openingBank, setOpeningBank] = useState<string>('0')
  const [whatIf, setWhatIf] = useState({
    fee_realization_pct: 90,
    lead_conversion_pct: 25,
    expense_inflation_pct: 3,
    extra_monthly_payroll: 0,
    extra_concession_pct: 0,
  })

  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null)

  const [showNewBudgetModal, setShowNewBudgetModal] = useState(false)
  const [newBudgetForm, setNewBudgetForm] = useState({
    name: 'FY 2026-27 Operating Budget',
    fiscal_year_label: 'FY 2026-27',
    plan_type: 'operating',
    granularity: 'monthly',
    enforcement_mode: 'soft_warn',
  })

  const [showNewScenarioModal, setShowNewScenarioModal] = useState(false)
  const [newScenarioForm, setNewScenarioForm] = useState({
    name: 'Conservative Collections Plan',
    scenario_type: 'conservative',
    horizon_months: 6,
    opening_bank_balance: '0',
  })

  useEffect(() => {
    if (location.pathname.includes('/variance')) setActiveTab('variance')
    else if (location.pathname.includes('/forecasts')) setActiveTab('forecasts')
    else setActiveTab('budgets')
  }, [location.pathname])

  const loadWorkspace = async () => {
    setLoading(true)
    try {
      const [plansRes, scenRes, fcRes] = await Promise.all([
        financeApi.listBudgets(instId),
        financeApi.listForecastScenarios(instId),
        financeApi.getForecastOverview({ institution_id: instId, horizon_months: horizonMonths }),
      ])
      const planList = plansRes.data || []
      setPlans(planList)
      const targetPlan =
        planList.find((p) => p.id === selectedPlanId) ||
        planList.find((p) => p.status === 'approved' || p.status === 'locked') ||
        planList[0]
      if (targetPlan) {
        setSelectedPlanId(targetPlan.id)
        const varRes = await financeApi.getBudgetVariance(targetPlan.id, instId)
        setVariance(varRes.data)
      } else {
        setVariance(null)
      }
      setScenarios(scenRes.data || [])
      setForecast(fcRes.data)
    } catch (err: any) {
      setNotice({
        text: err?.response?.data?.detail || 'Failed to load Budgeting & Forecasting data.',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWorkspace()
  }, [instId])

  const handleSelectPlan = async (planId: number) => {
    setSelectedPlanId(planId)
    setEditedAmounts({})
    disableEditMode(budgetEditScope)
    try {
      const varRes = await financeApi.getBudgetVariance(planId, instId)
      setVariance(varRes.data)
    } catch (err: any) {
      setNotice({ text: err?.response?.data?.detail || 'Could not load budget plan.', type: 'error' })
    }
  }

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBudgetForm.name.trim()) return
    setSaving(true)
    try {
      const res = await financeApi.createBudget({ ...newBudgetForm, seed_default_lines: true }, instId)
      setShowNewBudgetModal(false)
      setNotice({ text: `Created draft budget "${res.data.name}".`, type: 'success' })
      await loadWorkspace()
      setSelectedPlanId(res.data.id)
      const varRes = await financeApi.getBudgetVariance(res.data.id, instId)
      setVariance(varRes.data)
    } catch (err: any) {
      setNotice({ text: err?.response?.data?.detail || 'Could not create budget plan.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveLines = async () => {
    if (!selectedPlanId || !variance) return
    const changed = variance.lines.filter((ln) => editedAmounts[ln.id] !== undefined)
    if (changed.length === 0) {
      disableEditMode(budgetEditScope)
      return
    }
    setSaving(true)
    try {
      await financeApi.upsertBudgetLines(
        selectedPlanId,
        changed.map((ln) => ({
          id: ln.id,
          line_direction: ln.line_direction,
          source_domain: ln.source_domain,
          planned_amount: Math.max(0, Number(editedAmounts[ln.id] || 0)),
        })),
        instId,
      )
      setEditedAmounts({})
      disableEditMode(budgetEditScope)
      setNotice({ text: `Saved ${changed.length} budget allocation updates.`, type: 'success' })
      await loadWorkspace()
    } catch (err: any) {
      setNotice({ text: err?.response?.data?.detail || 'Failed to save allocations.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleTransition = async (action: 'submit' | 'approve' | 'lock' | 'revise') => {
    if (!selectedPlanId) return
    setSaving(true)
    try {
      const res = await financeApi.transitionBudget(selectedPlanId, action, undefined, instId)
      setNotice({ text: res.data.message, type: 'success' })
      setEditedAmounts({})
      disableEditMode(budgetEditScope)
      await loadWorkspace()
      if (action === 'revise') {
        setSelectedPlanId(res.data.id)
        const varRes = await financeApi.getBudgetVariance(res.data.id, instId)
        setVariance(varRes.data)
      }
    } catch (err: any) {
      setNotice({ text: err?.response?.data?.detail || `Action '${action}' failed.`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleRunSimulation = async (customHorizon?: number) => {
    setSaving(true)
    try {
      const targetHorizon = customHorizon ?? horizonMonths
      const res = selectedScenarioId
        ? await financeApi.computeForecastScenario(
            selectedScenarioId,
            {
              horizon_months: targetHorizon,
              opening_bank_balance: Number(openingBank || 0),
              overrides: whatIf,
              persist_snapshot: false,
            },
            instId,
          )
        : await financeApi.simulateForecast(
            {
              horizon_months: targetHorizon,
              opening_bank_balance: Number(openingBank || 0),
              overrides: whatIf,
            },
            instId,
          )
      setForecast(res.data)
    } catch (err: any) {
      setNotice({ text: err?.response?.data?.detail || 'Forecast calculation failed.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleCreateScenario = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newScenarioForm.name.trim()) return
    setSaving(true)
    try {
      const res = await financeApi.createForecastScenario(
        {
          name: newScenarioForm.name.trim(),
          scenario_type: newScenarioForm.scenario_type,
          horizon_months: newScenarioForm.horizon_months,
          opening_bank_balance: Number(newScenarioForm.opening_bank_balance || 0),
          linked_budget_plan_id: selectedPlanId || undefined,
          assumptions: whatIf,
        },
        instId,
      )
      setShowNewScenarioModal(false)
      setSelectedScenarioId(res.data.id)
      const compRes = await financeApi.computeForecastScenario(res.data.id, { persist_snapshot: true }, instId)
      setForecast(compRes.data)
      const listRes = await financeApi.listForecastScenarios(instId)
      setScenarios(listRes.data || [])
      setNotice({ text: `Saved scenario "${res.data.name}".`, type: 'success' })
    } catch (err: any) {
      setNotice({ text: err?.response?.data?.detail || 'Could not create scenario.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const exportVarianceCsv = () => {
    if (!variance) return
    const headers = ['Period', 'Line Item', 'Direction', 'Domain', 'Planned', 'Actual', 'Pending', 'Variance', 'Utilization %', 'Status']
    const rows = variance.lines.map((ln) => [
      ln.period_label,
      `"${ln.line_label.replace(/"/g, '""')}"`,
      ln.line_direction,
      ln.source_domain,
      ln.planned_amount.toFixed(2),
      ln.actual_amount.toFixed(2),
      ln.pending_amount.toFixed(2),
      ln.variance_amount.toFixed(2),
      ln.utilization_pct.toFixed(1),
      ln.status,
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `budget-variance-${variance.plan.fiscal_year_label.replace(/\s+/g, '-')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const periodOptions = useMemo(() => {
    if (!variance) return []
    return variance.period_summary.map((p) => p.period_label)
  }, [variance])

  const filteredLines = useMemo(() => {
    if (!variance) return []
    if (periodFilter === 'all') return variance.lines
    return variance.lines.filter((ln) => ln.period_label === periodFilter)
  }, [variance, periodFilter])

  const activePlan = variance?.plan

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans">
      {/* WORKSPACE COMMAND DECK (Rule 014: <=72px single header) */}
      <header className="h-16 px-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <div
            style={{ background: `linear-gradient(135deg, ${branding.colors.primary} 0%, ${branding.colors.secondary} 100%)` }}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
          >
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-white truncate">
                Budgeting &amp; Cashflow Forecasting
              </h1>
              {activePlan && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${STATUS_BADGE[activePlan.status] || STATUS_BADGE.draft}`}>
                  {activePlan.status} · v{activePlan.version_number}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              SSOT financial plans, live Budget-vs-Actual variance, and 3-driver liquidity runway.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
            {(['budgets', 'variance', 'forecasts'] as WorkspaceTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-md capitalize transition ${
                  activeTab === tab
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {tab === 'budgets' ? 'Budgets' : tab === 'variance' ? 'Variance' : 'Forecasts'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowNewBudgetModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition"
          >
            <Plus className="w-3.5 h-3.5" /> New Budget
          </button>
        </div>
      </header>

      {/* SINGLE-SURFACE TELEMETRY KPI RIBBON (Rule 014: <=44px) */}
      <div className="h-11 px-5 bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs overflow-x-auto gap-6">
        <div className="flex items-center gap-6 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Rev Target</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {variance ? formatINR(variance.summary.revenue_budget) : '—'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">YTD Collected</span>
            <span className="font-mono font-bold text-emerald-600">
              {variance ? `${formatINR(variance.summary.revenue_actual)} (${variance.summary.revenue_realization_pct}%)` : '—'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Cost Budget</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {variance ? `${formatINR(variance.summary.cost_actual)} / ${formatINR(variance.summary.cost_budget)}` : '—'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Actual Net Margin</span>
            <span className={`font-mono font-bold ${(variance?.summary.net_margin_actual ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {variance ? formatINR(variance.summary.net_margin_actual) : '—'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Forecast Ending Cash ({horizonMonths}M)</span>
            <span className={`font-mono font-bold ${(forecast?.summary.ending_liquidity ?? 0) >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
              {forecast ? formatINR(forecast.summary.ending_liquidity) : '—'}
            </span>
          </div>
        </div>
        <div className="text-[11px] font-mono text-slate-500 shrink-0">
          Runway: {forecast?.summary.runway_months != null ? `${forecast.summary.runway_months} mo` : forecast ? 'Self-Sustaining' : '—'}
        </div>
      </div>

      {notice && (
        <div className={`mx-5 mt-3 px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-between ${
          notice.type === 'error'
            ? 'bg-rose-50 text-rose-800 border border-rose-200'
            : notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-sky-50 text-sky-800 border border-sky-200'
        }`}>
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} className="underline ml-4">Dismiss</button>
        </div>
      )}

      <main className="flex-1 p-5 space-y-4">
        {loading ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center text-xs text-slate-500">
            Loading financial plans and cashflow projections...
          </div>
        ) : (
          <>
            {(activeTab === 'budgets' || activeTab === 'variance') && (
              <div className="space-y-4">
                {/* Plan Selector & View-First Edit Bar */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label="Select budget plan"
                      value={selectedPlanId || ''}
                      onChange={(e) => handleSelectPlan(Number(e.target.value))}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    >
                      {plans.length === 0 && <option value="">No budget plans yet</option>}
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {p.fiscal_year_label} ({p.status} v{p.version_number})
                        </option>
                      ))}
                    </select>

                    {variance && (
                      <select
                        aria-label="Filter period"
                        value={periodFilter}
                        onChange={(e) => setPeriodFilter(e.target.value)}
                        className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                      >
                        <option value="all">All Periods ({periodOptions.length})</option>
                        {periodOptions.map((pl) => (
                          <option key={pl} value={pl}>{pl}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {activePlan?.status === 'draft' && (
                      <EditModeBar
                        scope={budgetEditScope}
                        title={activePlan.name}
                        compact
                        isDirty={Object.keys(editedAmounts).length > 0}
                        onSave={handleSaveLines}
                        onCancel={() => setEditedAmounts({})}
                        saveLoading={saving}
                      />
                    )}
                    {activePlan?.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => handleTransition('submit')}
                        disabled={saving}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100"
                      >
                        <Send className="w-3.5 h-3.5" /> Submit
                      </button>
                    )}
                    {(activePlan?.status === 'draft' || activePlan?.status === 'submitted') && (
                      <button
                        type="button"
                        onClick={() => handleTransition('approve')}
                        disabled={saving}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                    )}
                    {activePlan?.status === 'approved' && (
                      <button
                        type="button"
                        onClick={() => handleTransition('lock')}
                        disabled={saving}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                      >
                        <Lock className="w-3.5 h-3.5" /> Lock Baseline
                      </button>
                    )}
                    {(activePlan?.status === 'approved' || activePlan?.status === 'locked') && (
                      <button
                        type="button"
                        onClick={() => handleTransition('revise')}
                        disabled={saving}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                      >
                        <GitBranch className="w-3.5 h-3.5" /> Create RE Revision
                      </button>
                    )}
                    {variance && (
                      <button
                        type="button"
                        onClick={exportVarianceCsv}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                      >
                        <Download className="w-3.5 h-3.5" /> Export CSV
                      </button>
                    )}
                  </div>
                </div>

                {!variance ? (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center space-y-2">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No Budget Plan Configured Yet</p>
                    <p className="text-xs text-slate-500">
                      Create an Annual or Academic-Year Operating Budget seeded automatically from your canonical Fee &amp; Expense categories.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowNewBudgetModal(true)}
                      className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-600 text-white text-xs font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create First Budget Plan
                    </button>
                  </div>
                ) : (
                  <>
                    {activeTab === 'variance' && variance.period_summary.length > 0 && (
                      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                          Period-by-Period Revenue vs. Cost Performance
                        </h2>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={variance.period_summary}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="period_label" tick={{ fontSize: 11 }} />
                              <YAxis tick={{ fontSize: 11 }} />
                              <Tooltip />
                              <Legend wrapperStyle={{ fontSize: 11 }} />
                              <Bar dataKey="revenue_budget" name="Revenue Target" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                              <Bar dataKey="revenue_actual" name="Collected Revenue" fill="#10b981" radius={[3, 3, 0, 0]} />
                              <Bar dataKey="cost_budget" name="Cost Cap" fill="#fde68a" radius={[3, 3, 0, 0]} />
                              <Bar dataKey="cost_actual" name="Actual Spend" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* Allocation & Live Variance Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 dark:bg-slate-800/70 text-[11px] uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="px-3 py-2.5 font-semibold">Period</th>
                              <th className="px-3 py-2.5 font-semibold">Budget Line Item</th>
                              <th className="px-3 py-2.5 font-semibold">Domain</th>
                              <th className="px-3 py-2.5 font-semibold text-right">Planned (₹)</th>
                              <th className="px-3 py-2.5 font-semibold text-right">Actual (₹)</th>
                              <th className="px-3 py-2.5 font-semibold text-right">Pending</th>
                              <th className="px-3 py-2.5 font-semibold text-right">Variance</th>
                              <th className="px-3 py-2.5 font-semibold text-right">Util %</th>
                              <th className="px-3 py-2.5 font-semibold">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredLines.map((ln) => {
                              const draftVal = editedAmounts[ln.id]
                              const canInlineEdit = isEditMode && activePlan?.status === 'draft'
                              return (
                                <tr key={ln.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                                  <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300">{ln.period_label}</td>
                                  <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-100">{ln.line_label}</td>
                                  <td className="px-3 py-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      ln.line_direction === 'inflow_target'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {ln.source_domain}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono">
                                    {canInlineEdit ? (
                                      <input
                                        type="number"
                                        min="0"
                                        step="100"
                                        aria-label={`Planned amount for ${ln.line_label} ${ln.period_label}`}
                                        value={draftVal !== undefined ? draftVal : String(ln.planned_amount)}
                                        onChange={(e) =>
                                          setEditedAmounts((prev) => ({ ...prev, [ln.id]: e.target.value }))
                                        }
                                        className="w-28 text-right px-2 py-1 rounded border border-primary-300 bg-white dark:bg-slate-800 font-mono text-xs"
                                      />
                                    ) : (
                                      formatINR(ln.planned_amount)
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono">{formatINR(ln.actual_amount)}</td>
                                  <td className="px-3 py-2 text-right font-mono text-amber-600">
                                    {ln.pending_amount > 0 ? formatINR(ln.pending_amount) : '—'}
                                  </td>
                                  <td className={`px-3 py-2 text-right font-mono font-bold ${
                                    ln.variance_amount >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                  }`}>
                                    {formatINR(ln.variance_amount)}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono">{ln.utilization_pct.toFixed(1)}%</td>
                                  <td className="px-3 py-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${HEALTH_BADGE[ln.status] || HEALTH_BADGE.unbudgeted}`}>
                                      {ln.status.replace('_', ' ')}
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'forecasts' && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label="Select forecast scenario"
                      value={selectedScenarioId || ''}
                      onChange={async (e) => {
                        const sid = e.target.value ? Number(e.target.value) : null
                        setSelectedScenarioId(sid)
                        if (sid) {
                          const sc = scenarios.find((s) => s.id === sid)
                          if (sc) {
                            setHorizonMonths(sc.horizon_months)
                            setOpeningBank(String(sc.opening_bank_balance))
                          }
                          const res = await financeApi.computeForecastScenario(sid, { persist_snapshot: false }, instId)
                          setForecast(res.data)
                        }
                      }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    >
                      <option value="">Live Baseline Model (SSOT)</option>
                      {scenarios.map((sc) => (
                        <option key={sc.id} value={sc.id}>
                          {sc.name} ({sc.scenario_type} · {sc.horizon_months}M)
                        </option>
                      ))}
                    </select>

                    <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
                      {[3, 6, 12].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setHorizonMonths(m)
                            handleRunSimulation(m)
                          }}
                          className={`px-2.5 py-1 rounded-md ${horizonMonths === m ? 'bg-white dark:bg-slate-700 shadow-2xs' : 'text-slate-500'}`}
                        >
                          {m}M
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRunSimulation()}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Recalculate
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewScenarioModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" /> Save Scenario
                    </button>
                  </div>
                </div>

                {/* What-If Simulator Controls + Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                      <Sliders className="w-4 h-4 text-indigo-500" /> What-If Simulator
                    </div>
                    <div className="space-y-2.5 text-xs">
                      <label className="block">
                        <span className="text-slate-500">Opening Bank Balance (₹)</span>
                        <input
                          type="number"
                          value={openingBank}
                          onChange={(e) => setOpeningBank(e.target.value)}
                          className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-xs bg-white dark:bg-slate-800"
                        />
                      </label>
                      <label className="block">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Installment Realization</span>
                          <span className="font-mono font-bold">{whatIf.fee_realization_pct}%</span>
                        </div>
                        <input
                          type="range"
                          min={50}
                          max={100}
                          value={whatIf.fee_realization_pct}
                          onChange={(e) => setWhatIf((p) => ({ ...p, fee_realization_pct: Number(e.target.value) }))}
                          className="w-full"
                        />
                      </label>
                      <label className="block">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Lead Conversion Rate</span>
                          <span className="font-mono font-bold">{whatIf.lead_conversion_pct}%</span>
                        </div>
                        <input
                          type="range"
                          min={5}
                          max={60}
                          value={whatIf.lead_conversion_pct}
                          onChange={(e) => setWhatIf((p) => ({ ...p, lead_conversion_pct: Number(e.target.value) }))}
                          className="w-full"
                        />
                      </label>
                      <label className="block">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Extra Monthly Payroll (₹)</span>
                          <span className="font-mono font-bold">{formatINR(whatIf.extra_monthly_payroll)}</span>
                        </div>
                        <input
                          type="number"
                          step={5000}
                          value={whatIf.extra_monthly_payroll}
                          onChange={(e) => setWhatIf((p) => ({ ...p, extra_monthly_payroll: Number(e.target.value || 0) }))}
                          className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-xs bg-white dark:bg-slate-800"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRunSimulation()}
                        disabled={saving}
                        className="w-full py-2 rounded-lg bg-slate-900 dark:bg-indigo-600 text-white text-xs font-bold hover:opacity-90"
                      >
                        Run What-If Projection
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Projected Inflows, Outflows &amp; Liquidity Curve
                      </h2>
                      {forecast?.summary.trough_month && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                          Trough: {forecast.summary.trough_month} ({formatINR(forecast.summary.trough_liquidity)})
                        </span>
                      )}
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={forecast?.projections || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="period_label" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="projected_total_inflows" name="Projected Inflows" fill="#10b981" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="projected_total_outflows" name="Projected Outflows" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                          <Area type="monotone" dataKey="confidence_high" name="Upper Band" fill="#e0e7ff" stroke="none" fillOpacity={0.5} />
                          <Line type="monotone" dataKey="projected_ending_liquidity" name="Ending Liquidity" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Month-by-month cashflow projection ledger */}
                {forecast && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/70 text-[11px] uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="px-3 py-2.5">Month</th>
                            <th className="px-3 py-2.5 text-right">Fee Installments</th>
                            <th className="px-3 py-2.5 text-right">CRM Pipeline</th>
                            <th className="px-3 py-2.5 text-right">Faculty Payroll</th>
                            <th className="px-3 py-2.5 text-right">Staff + OpEx</th>
                            <th className="px-3 py-2.5 text-right">Net Cashflow</th>
                            <th className="px-3 py-2.5 text-right">Ending Liquidity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                          {forecast.projections.map((row) => (
                            <tr key={row.period_start} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                              <td className="px-3 py-2 font-sans font-semibold">{row.period_label}</td>
                              <td className="px-3 py-2 text-right text-emerald-700">{formatINR(row.projected_fee_collections)}</td>
                              <td className="px-3 py-2 text-right text-teal-600">{formatINR(row.projected_pipeline_admissions)}</td>
                              <td className="px-3 py-2 text-right text-rose-600">{formatINR(row.projected_faculty_payroll)}</td>
                              <td className="px-3 py-2 text-right text-rose-600">
                                {formatINR(row.projected_staff_payroll + row.projected_recurring_opex + row.projected_variable_opex)}
                              </td>
                              <td className={`px-3 py-2 text-right font-bold ${row.projected_net_cashflow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {formatINR(row.projected_net_cashflow)}
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-indigo-600">{formatINR(row.projected_ending_liquidity)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* New Budget Modal */}
      {showNewBudgetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateBudget}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-5 space-y-3 shadow-xl"
          >
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Create Budget Plan</h3>
            <div className="space-y-2.5 text-xs">
              <label className="block">
                <span className="font-semibold text-slate-600">Plan Name</span>
                <input
                  required
                  value={newBudgetForm.name}
                  onChange={(e) => setNewBudgetForm((p) => ({ ...p, name: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="font-semibold text-slate-600">Fiscal Year Label</span>
                  <input
                    value={newBudgetForm.fiscal_year_label}
                    onChange={(e) => setNewBudgetForm((p) => ({ ...p, fiscal_year_label: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </label>
                <label className="block">
                  <span className="font-semibold text-slate-600">Granularity</span>
                  <select
                    value={newBudgetForm.granularity}
                    onChange={(e) => setNewBudgetForm((p) => ({ ...p, granularity: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="font-semibold text-slate-600">Expense Guardrail Mode</span>
                <select
                  value={newBudgetForm.enforcement_mode}
                  onChange={(e) => setNewBudgetForm((p) => ({ ...p, enforcement_mode: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="soft_warn">Soft Warning (85% alert + overrun note)</option>
                  <option value="advisory">Advisory Only</option>
                  <option value="hard_limit">Hard Limit (requires override reason)</option>
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewBudgetModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary-600 text-white"
              >
                Create &amp; Seed Lines
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Save Forecast Scenario Modal */}
      {showNewScenarioModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateScenario}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-5 space-y-3 shadow-xl"
          >
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Save Forecast Scenario</h3>
            <div className="space-y-2.5 text-xs">
              <label className="block">
                <span className="font-semibold text-slate-600">Scenario Name</span>
                <input
                  required
                  value={newScenarioForm.name}
                  onChange={(e) => setNewScenarioForm((p) => ({ ...p, name: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="font-semibold text-slate-600">Type</span>
                  <select
                    value={newScenarioForm.scenario_type}
                    onChange={(e) => setNewScenarioForm((p) => ({ ...p, scenario_type: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="baseline">Baseline</option>
                    <option value="conservative">Conservative</option>
                    <option value="optimistic">Optimistic</option>
                    <option value="what_if">What-If Custom</option>
                  </select>
                </label>
                <label className="block">
                  <span className="font-semibold text-slate-600">Horizon (Months)</span>
                  <select
                    value={newScenarioForm.horizon_months}
                    onChange={(e) => setNewScenarioForm((p) => ({ ...p, horizon_months: Number(e.target.value) }))}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value={3}>3 Months</option>
                    <option value={6}>6 Months</option>
                    <option value={12}>12 Months</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewScenarioModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white"
              >
                Save &amp; Snapshot
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
