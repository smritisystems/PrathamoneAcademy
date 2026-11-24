/**
 * @file        FinanceExpenseWorkspace.tsx
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
 * @created     2026-11-24
 * @updated     2026-11-24
 *
 * @description Workspace for Daily Expense Management, Live Cash Movements, Automated Cash Opening & Closing, Denomination Reconciliation, and Daily Cash Book.
 */

import React, { useState, useEffect, useMemo } from 'react'
import {
  Wallet,
  Receipt,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  Unlock,
  RotateCcw,
  FileSpreadsheet,
  Building,
  Calendar,
  DollarSign,
  TrendingUp,
  PieChart,
  Tag,
  CreditCard,
  Banknote,
  Send,
  X,
  Eye,
  Check,
  ChevronDown,
  Layers,
  ArrowRightLeft,
  AlertTriangle,
} from 'lucide-react'
import {
  financeApi,
  ExpenseItem,
  ExpenseCategoryItem,
  ExpenseOverviewData,
  DailyCashRegisterData,
  DailyCashBookData,
} from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useBranding } from '../config/branding'

export default function FinanceExpenseWorkspace() {
  const branding = useBranding()
  const { user, selectedInstitutionId } = useAuthStore()

  // State: Active tab
  const [activeTab, setActiveTab] = useState<'expenses' | 'cash_closing' | 'cashbook' | 'analytics'>('expenses')
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])

  // Data states
  const [overview, setOverview] = useState<ExpenseOverviewData | null>(null)
  const [categories, setCategories] = useState<ExpenseCategoryItem[]>([])
  const [expenses, setExpenses] = useState<ExpenseItem[]>([])
  const [expensesTotal, setExpensesTotal] = useState(0)
  const [cashRegister, setCashRegister] = useState<DailyCashRegisterData | null>(null)
  const [cashbook, setCashbook] = useState<DailyCashBookData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null)

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all')
  const [selectedModeFilter, setSelectedModeFilter] = useState<string>('all')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all')

  // Modals state
  const [isNewExpenseModalOpen, setIsNewExpenseModalOpen] = useState(false)
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false)
  const [isCashMovementModalOpen, setIsCashMovementModalOpen] = useState(false)

  // New Expense form
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    category_id: 1,
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    payment_mode: 'CASH',
    paid_to_vendor: '',
    vendor_contact: '',
    invoice_reference: '',
    description: '',
    status: 'approved',
    is_recurring: false,
    recurring_frequency: 'monthly',
  })

  // Denominations form
  const [denominations, setDenominations] = useState<Record<string, number>>({
    '500': 0,
    '200': 0,
    '100': 0,
    '50': 0,
    '20': 0,
    '10': 0,
    '5': 0,
    '2': 0,
    '1': 0,
  })
  const [differenceReason, setDifferenceReason] = useState('')

  // Cash movement form
  const [movementForm, setMovementForm] = useState({
    transaction_type: 'bank_deposit',
    amount: '',
    reference_number: '',
    description: '',
    destination_or_source: 'State Bank of India',
  })

  // Fetch all initial data
  const loadData = async () => {
    setIsLoading(true)
    try {
      const instId = selectedInstitutionId || 1
      const [overviewRes, catRes, expRes, regRes, cbRes] = await Promise.all([
        financeApi.getExpenseOverview(instId),
        financeApi.getExpenseCategories(instId),
        financeApi.getExpenses({
          institution_id: instId,
          search: searchQuery || undefined,
          category_id: selectedCategoryFilter !== 'all' ? Number(selectedCategoryFilter) : undefined,
          payment_mode: selectedModeFilter !== 'all' ? selectedModeFilter : undefined,
          status: selectedStatusFilter !== 'all' ? selectedStatusFilter : undefined,
          limit: 100,
        }),
        financeApi.getCurrentCashRegister({ institution_id: instId, target_date: selectedDate }),
        financeApi.getDailyCashBook({ institution_id: instId, target_date: selectedDate }),
      ])

      setOverview(overviewRes.data)
      setCategories(catRes.data)
      setExpenses(expRes.data.items)
      setExpensesTotal(expRes.data.total)
      setCashRegister(regRes.data)
      setCashbook(cbRes.data)

      if (regRes.data.denominations && Object.keys(regRes.data.denominations).length > 0) {
        setDenominations({ ...denominations, ...regRes.data.denominations })
      }
      if (regRes.data.difference_reason) {
        setDifferenceReason(regRes.data.difference_reason)
      }
    } catch (err: any) {
      console.error('Failed to load finance data:', err)
      setStatusMessage({ text: err?.response?.data?.detail || 'Failed to load finance data', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedDate, selectedCategoryFilter, selectedModeFilter, selectedStatusFilter])

  // Denominations live calculation
  const physicalTotal = useMemo(() => {
    let sum = 0
    const values = [500, 200, 100, 50, 20, 10, 5, 2, 1]
    for (const v of values) {
      const count = Number(denominations[String(v)] || 0)
      sum += v * count
    }
    return sum
  }, [denominations])

  const expectedTotal = cashRegister?.expected_closing_balance || 0
  const liveDifference = physicalTotal - expectedTotal

  // Handlers
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expenseForm.title || !expenseForm.amount || !expenseForm.paid_to_vendor) {
      setStatusMessage({ text: 'Please fill in Title, Amount, and Vendor', type: 'error' })
      return
    }
    try {
      await financeApi.createExpense({
        ...expenseForm,
        amount: Number(expenseForm.amount),
        category_id: Number(expenseForm.category_id),
      })
      setStatusMessage({ text: 'Expense recorded successfully!', type: 'success' })
      setIsNewExpenseModalOpen(false)
      setExpenseForm({
        title: '',
        category_id: categories[0]?.id || 1,
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        payment_mode: 'CASH',
        paid_to_vendor: '',
        vendor_contact: '',
        invoice_reference: '',
        description: '',
        status: 'approved',
        is_recurring: false,
        recurring_frequency: 'monthly',
      })
      await loadData()
    } catch (err: any) {
      setStatusMessage({ text: err?.response?.data?.detail || 'Failed to create expense', type: 'error' })
    }
  }

  const handleSubmitCashClosing = async () => {
    if (!cashRegister) return
    if (liveDifference !== 0 && (!differenceReason || differenceReason.trim().length < 5)) {
      setStatusMessage({
        text: `Mandatory explanation required for a cash difference of ₹${Math.abs(liveDifference).toLocaleString('en-IN')}`,
        type: 'error',
      })
      return
    }

    try {
      await financeApi.submitDailyClosing({
        daily_register_id: cashRegister.id,
        denominations: denominations,
        difference_reason: differenceReason,
      })
      setStatusMessage({ text: 'Physical cash count submitted for supervisor verification!', type: 'success' })
      setIsClosingModalOpen(false)
      await loadData()
    } catch (err: any) {
      setStatusMessage({ text: err?.response?.data?.detail || 'Failed to submit closing', type: 'error' })
    }
  }

  const handleVerifyAndLock = async () => {
    if (!cashRegister) return
    if (!window.confirm('Verify and permanently lock this daily cash register? This will carry forward the verified closing balance into the next business day.')) {
      return
    }
    try {
      await financeApi.verifyDailyClosing(cashRegister.id)
      setStatusMessage({ text: 'Daily cash register verified and permanently locked!', type: 'success' })
      await loadData()
    } catch (err: any) {
      setStatusMessage({ text: err?.response?.data?.detail || 'Verification failed', type: 'error' })
    }
  }

  const handleReopenRegister = async () => {
    if (!cashRegister) return
    const reason = window.prompt('Enter mandatory supervisor audit justification to reopen this register:')
    if (!reason || reason.trim().length < 5) {
      alert('A formal reason (min 5 chars) is mandatory to reopen a closed cash register.')
      return
    }
    try {
      await financeApi.reopenDailyClosing(cashRegister.id, reason)
      setStatusMessage({ text: 'Register reopened for authorized adjustments', type: 'info' })
      await loadData()
    } catch (err: any) {
      setStatusMessage({ text: err?.response?.data?.detail || 'Reopening failed', type: 'error' })
    }
  }

  const handleRecordMovement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!movementForm.amount) return
    try {
      await financeApi.createCashTransaction({
        ...movementForm,
        amount: Number(movementForm.amount),
        transaction_date: selectedDate,
      })
      setStatusMessage({ text: 'Cash movement recorded successfully!', type: 'success' })
      setIsCashMovementModalOpen(false)
      setMovementForm({
        transaction_type: 'bank_deposit',
        amount: '',
        reference_number: '',
        description: '',
        destination_or_source: 'State Bank of India',
      })
      await loadData()
    } catch (err: any) {
      setStatusMessage({ text: err?.response?.data?.detail || 'Movement recording failed', type: 'error' })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans">
      {/* 1. WORKSPACE COMMAND DECK (Rule 014: <=72px) */}
      <header className="h-16 px-5 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <div
            style={{
              background: `linear-gradient(135deg, ${branding.colors.primary} 0%, ${branding.colors.secondary} 100%)`,
            }}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0"
          >
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                Institute Expenses & Cash Register
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                Daily Finance Hub
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Daily expense entries, automated cash opening/closing, denomination audit, and live cashbook.
            </p>
          </div>
        </div>

        {/* Command Actions */}
        <div className="flex items-center gap-2">
          {/* Business Date Picker */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer"
            />
          </div>

          {/* Quick Action: New Expense */}
          <button
            type="button"
            onClick={() => setIsNewExpenseModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Expense</span>
          </button>

          {/* Quick Action: Daily Cash Closing */}
          <button
            type="button"
            onClick={() => setIsClosingModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs"
          >
            <Banknote className="w-4 h-4" />
            <span>Cash Closing</span>
          </button>

          {/* Quick Action: Cash Movement */}
          <button
            type="button"
            onClick={() => setIsCashMovementModalOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all"
            title="Record bank deposit, withdrawal or inter-counter cash movement"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bank / Transfer</span>
          </button>

          {/* Explicit Edit Mode Toggle (Rule 010) */}
          <button
            type="button"
            onClick={() => setIsEditMode(!isEditMode)}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              isEditMode
                ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            {isEditMode ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{isEditMode ? 'Edit Mode Active' : 'View Mode'}</span>
          </button>
        </div>
      </header>

      {/* 2. TELEMETRY & LIVE RADAR RIBBON (Rule 014: <=44px) */}
      <div className="h-11 px-5 sm:px-6 bg-slate-100/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between overflow-x-auto text-xs font-semibold">
        <div className="flex items-center gap-6 min-w-max">
          {/* Today's Expenses */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Today's Expenses:</span>
            <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
              ₹{(overview?.today_expenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400">({overview?.today_count || 0} items)</span>
          </div>

          <span className="text-slate-300 dark:text-slate-700">|</span>

          {/* This Month's Expenses */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">This Month:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              ₹{(overview?.this_month_expenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <span className="text-slate-300 dark:text-slate-700">|</span>

          {/* Cash In Drawer (Live Expected) */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Expected Cash in Drawer:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              ₹{(cashRegister?.expected_closing_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <span className="text-slate-300 dark:text-slate-700">|</span>

          {/* Register Status Pill */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Register:</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                cashRegister?.status === 'closed'
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  : cashRegister?.status === 'pending_reconciliation'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                  : cashRegister?.status === 'pending_approval'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              }`}
            >
              {cashRegister?.status?.replace('_', ' ') || 'Open'}
            </span>
          </div>

          {/* Shortage / Excess Pill */}
          {cashRegister?.difference_type && cashRegister.difference_type !== 'none' && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1 ${
                cashRegister.difference_type === 'shortage'
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>
                {cashRegister.difference_type}: ₹{Math.abs(cashRegister.difference_amount).toLocaleString('en-IN')}
              </span>
            </span>
          )}
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`text-xs px-2.5 py-0.5 rounded-md font-bold flex items-center gap-1.5 animate-fadeIn ${
              statusMessage.type === 'success'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : statusMessage.type === 'error'
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)}>
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* 3. WORKSPACE SUB-TABS BAR */}
      <div className="px-5 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-6 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('expenses')}
          className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'expenses'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Daily Expense Register ({expensesTotal})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cash_closing')}
          className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'cash_closing'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Banknote className="w-4 h-4" />
          <span>Daily Cash Register & Closing</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cashbook')}
          className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'cashbook'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Live Daily Cash Book ({cashbook?.entries_count || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'analytics'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Expense Categories & Analytics</span>
        </button>
      </div>

      {/* 4. WORKSPACE MAIN BODY */}
      <main className="flex-1 p-5 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar">
        {/* ==================================================================== */}
        {/* TAB 1: DAILY EXPENSE REGISTER (Enterprise DataTable Standard)       */}
        {/* ==================================================================== */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by vendor, title, expense #, or invoice..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Category Filter */}
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {/* Payment Mode Filter */}
                <select
                  value={selectedModeFilter}
                  onChange={(e) => setSelectedModeFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold focus:outline-none"
                >
                  <option value="all">All Modes</option>
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CARD">Card</option>
                  <option value="CHEQUE">Cheque</option>
                </select>

                {/* Status Filter */}
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              <div className="text-xs text-slate-400 font-semibold">
                Showing {expenses.length} of {expensesTotal} expenses
              </div>
            </div>

            {/* Expenses DataTable */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Expense #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Title / Purpose</th>
                      <th className="py-3 px-4">Vendor / Payee</th>
                      <th className="py-3 px-4">Payment Mode</th>
                      <th className="py-3 px-4 text-right">Amount (₹)</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {expenses.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
                          <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No expenses recorded yet</p>
                          <p className="text-[11px] mt-1">Click "+ New Expense" above to record daily institute expenses.</p>
                        </td>
                      </tr>
                    ) : (
                      expenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                            {exp.expense_number}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400 font-medium">
                            {exp.expense_date}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                              <Tag className="w-3 h-3 text-slate-400" />
                              <span>{exp.category_name}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white max-w-xs truncate">
                            {exp.title}
                            {exp.description && (
                              <span className="block text-[11px] text-slate-400 font-normal truncate">
                                {exp.description}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                            {exp.paid_to_vendor}
                            {exp.invoice_reference && (
                              <span className="block text-[10px] text-slate-400 font-mono">
                                Inv: {exp.invoice_reference}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                exp.payment_mode === 'CASH'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : exp.payment_mode === 'UPI'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {exp.payment_mode}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                            ₹{exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                exp.status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : exp.status === 'approved'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {exp.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {isEditMode && exp.status === 'submitted' && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await financeApi.approveExpense(exp.id)
                                    loadData()
                                  }}
                                  className="px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[10px] transition-colors"
                                  title="Approve Expense"
                                >
                                  Approve
                                </button>
                              )}
                              {isEditMode && exp.status === 'approved' && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await financeApi.payExpense(exp.id)
                                    loadData()
                                  }}
                                  className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[10px] transition-colors"
                                  title="Mark Paid"
                                >
                                  Mark Paid
                                </button>
                              )}
                              {!isEditMode && (
                                <span className="text-[11px] text-slate-400 italic">View Only</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: DAILY CASH REGISTER & CLOSING RECONCILIATION                  */}
        {/* ==================================================================== */}
        {activeTab === 'cash_closing' && cashRegister && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 7 Columns: Live Inflow & Outflow Breakdown */}
            <div className="lg:col-span-7 space-y-4">
              {/* Register Summary Header Card */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b pb-2.5 border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        {cashRegister.register_name}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Business Date: <strong className="text-slate-700 dark:text-slate-300">{cashRegister.register_date}</strong> (Opened at {cashRegister.business_day_start_time})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        cashRegister.is_locked
                          ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {cashRegister.is_locked ? 'Closed & Locked' : 'Live Register Active'}
                    </span>
                  </div>
                </div>

                {/* Opening Balance Carry-Forward Banner */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      A. Verified Opening Balance (Carried Forward):
                    </span>
                    <p className="text-xs text-slate-500">
                      {cashRegister.opening_notes || 'Verified closing balance from previous business day automatically initialized.'}
                    </p>
                  </div>
                  <span className="text-base font-mono font-black text-slate-800 dark:text-slate-200">
                    ₹{cashRegister.opening_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Cash Inflows Grid */}
                <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      <span>B. Live Cash Inflows (Collections & Receipts):</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                      + ₹{cashRegister.total_cash_inflows.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-emerald-200/50 dark:border-emerald-900/40">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Student Cash Fees:</span>
                      <span className="font-mono font-semibold">₹{cashRegister.cash_inflows_fees.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Bank Cash Withdrawals:</span>
                      <span className="font-mono font-semibold">₹{cashRegister.cash_inflows_bank_withdrawal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Counter Transfers In:</span>
                      <span className="font-mono font-semibold">₹{cashRegister.cash_inflows_transfers.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Other Cash Receipts:</span>
                      <span className="font-mono font-semibold">₹{cashRegister.cash_inflows_other.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Cash Outflows Grid */}
                <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>C. Live Cash Outflows (Expenses & Refunds):</span>
                    </span>
                    <span className="font-mono font-bold text-rose-700 dark:text-rose-300">
                      - ₹{cashRegister.total_cash_outflows.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-rose-200/50 dark:border-rose-900/40">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Paid Cash Expenses:</span>
                      <span className="font-mono font-semibold">₹{cashRegister.cash_outflows_expenses.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Student Cash Refunds:</span>
                      <span className="font-mono font-semibold">₹{cashRegister.cash_outflows_refunds.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Bank Cash Deposits:</span>
                      <span className="font-mono font-semibold">₹{cashRegister.cash_outflows_bank_deposit.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Counter Transfers Out:</span>
                      <span className="font-mono font-semibold">₹{cashRegister.cash_outflows_transfers.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Expected Closing Math Ribbon */}
                <div className="p-3.5 rounded-xl bg-primary-50/60 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-900/50 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-primary-900 dark:text-primary-200 uppercase tracking-wider">
                      Expected Closing Cash in Drawer:
                    </span>
                    <p className="text-[11px] text-primary-700 dark:text-primary-400">
                      = Opening (₹{cashRegister.opening_balance.toLocaleString('en-IN')}) + Inflows (₹{cashRegister.total_cash_inflows.toLocaleString('en-IN')}) - Outflows (₹{cashRegister.total_cash_outflows.toLocaleString('en-IN')})
                    </p>
                  </div>
                  <span className="text-lg font-mono font-black text-primary-700 dark:text-primary-300">
                    ₹{cashRegister.expected_closing_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Denomination Count & Reconciliation Deck */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b pb-2.5 border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-amber-500" />
                    <span>Denomination-wise Physical Count</span>
                  </h3>
                  <span className="text-[10px] text-slate-400">Indian Currency (INR)</span>
                </div>

                {/* Denomination Keypad Grid */}
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                  {[500, 200, 100, 50, 20, 10, 5, 2, 1].map((val) => {
                    const count = denominations[String(val)] || 0
                    const total = val * count
                    return (
                      <div
                        key={val}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                      >
                        <span className="w-16 font-mono font-black text-slate-800 dark:text-slate-200">
                          ₹{val}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-[10px]">×</span>
                          <input
                            type="number"
                            min="0"
                            disabled={cashRegister.is_locked}
                            value={count || ''}
                            onChange={(e) => {
                              const newCount = Math.max(0, parseInt(e.target.value) || 0)
                              setDenominations({ ...denominations, [String(val)]: newCount })
                            }}
                            placeholder="0"
                            className="w-16 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-center font-mono font-bold text-xs focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
                          />
                        </div>
                        <span className="w-24 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                          = ₹{total.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Total Physical Cash Calculated */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-500">Physical Cash Total:</span>
                    <span className="font-mono text-sm text-slate-900 dark:text-white">
                      ₹{physicalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Difference Indicator */}
                  <div
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
                      liveDifference === 0
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
                        : liveDifference < 0
                        ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800'
                        : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {liveDifference === 0 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                      )}
                      <span>
                        {liveDifference === 0
                          ? 'Exact Match (Zero Difference)'
                          : liveDifference < 0
                          ? `Cash Shortage of ₹${Math.abs(liveDifference).toLocaleString('en-IN')}`
                          : `Cash Excess of ₹${liveDifference.toLocaleString('en-IN')}`}
                      </span>
                    </span>
                    <span className="font-mono text-sm">
                      {liveDifference >= 0 ? '+' : ''}₹{liveDifference.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Mandatory Explanation input if difference exists */}
                  {liveDifference !== 0 && (
                    <div className="space-y-1 pt-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Mandatory Explanation for Difference:
                      </label>
                      <textarea
                        disabled={cashRegister.is_locked}
                        value={differenceReason}
                        onChange={(e) => setDifferenceReason(e.target.value)}
                        placeholder="State reason for shortage or excess (e.g., minor coin change shortage)..."
                        className="w-full p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
                        rows={2}
                      />
                    </div>
                  )}

                  {/* Actions Deck */}
                  <div className="pt-2 flex flex-col gap-2">
                    {!cashRegister.is_locked ? (
                      <>
                        <button
                          type="button"
                          onClick={handleSubmitCashClosing}
                          className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                        >
                          Submit Daily Cash Closing
                        </button>
                        {cashRegister.status === 'pending_approval' && (
                          <button
                            type="button"
                            onClick={handleVerifyAndLock}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Supervisor: Verify & Lock Register</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="space-y-2">
                        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium text-center">
                          🔒 Register is permanently closed and verified. Balance carries forward to next business day.
                        </div>
                        <button
                          type="button"
                          onClick={handleReopenRegister}
                          className="w-full py-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors flex items-center justify-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Authorized Reopening Workflow</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 3: LIVE DAILY CASH BOOK                                          */}
        {/* ==================================================================== */}
        {activeTab === 'cashbook' && cashbook && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden space-y-3">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Chronological Daily Cash Book — {cashbook.register_date}
                </h3>
                <p className="text-xs text-slate-400">
                  Unified audit ledger tracking all cash inflows, payments, and expenses with cumulative running balance.
                </p>
              </div>
              <div className="text-xs font-mono font-bold text-slate-500">
                Closing Cash: ₹{cashbook.expected_closing.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Time</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Reference</th>
                    <th className="py-2.5 px-4">Description / Entity</th>
                    <th className="py-2.5 px-4 text-right text-emerald-600 dark:text-emerald-400">Cash In (₹)</th>
                    <th className="py-2.5 px-4 text-right text-rose-600 dark:text-rose-400">Cash Out (₹)</th>
                    <th className="py-2.5 px-4 text-right">Running Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {cashbook.entries.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {entry.timestamp.split(' ')[1] || '08:00'}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {entry.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {entry.reference}
                      </td>
                      <td className="py-2.5 px-4 text-slate-800 dark:text-slate-200 font-medium">
                        {entry.description}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {entry.inflow > 0 ? `+ ₹${entry.inflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        {entry.outflow > 0 ? `- ₹${entry.outflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-black text-slate-900 dark:text-white">
                        ₹{entry.running_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 4: EXPENSE CATEGORIES & ANALYTICS                                */}
        {/* ==================================================================== */}
        {activeTab === 'analytics' && overview && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Category Breakdown Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-primary-500" />
                <span>Monthly Category Distribution</span>
              </h3>

              <div className="space-y-3">
                {overview.categories_breakdown.map((cat, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-800 dark:text-slate-200">{cat.category}</span>
                      <span className="font-mono text-slate-600 dark:text-slate-400">
                        ₹{cat.amount.toLocaleString('en-IN')} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-600 rounded-full transition-all"
                        style={{ width: `${Math.min(100, cat.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Summary Cards */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Approval & Compliance Health
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Pending Approval:</span>
                    <span className="text-base font-mono font-bold text-amber-600">
                      ₹{overview.pending_approval_amount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-400 block">({overview.pending_approval_count} items)</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Total Transactions:</span>
                    <span className="text-base font-mono font-bold text-slate-800 dark:text-slate-200">
                      {overview.total_transactions}
                    </span>
                    <span className="text-[10px] text-emerald-600 block">All recorded</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ==================================================================== */}
      {/* MODAL 1: NEW EXPENSE ENTRY                                           */}
      {/* ==================================================================== */}
      {isNewExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white">Record Daily Institute Expense</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewExpenseModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Expense Date</label>
                  <input
                    type="date"
                    required
                    value={expenseForm.expense_date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Expense Category</label>
                  <select
                    value={expenseForm.category_id}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category_id: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-bold"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Expense Title / Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Office electricity bill, Test copy printing, Staff tea"
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="0.00"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Payment Mode</label>
                  <select
                    value={expenseForm.payment_mode}
                    onChange={(e) => setExpenseForm({ ...expenseForm, payment_mode: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-bold"
                  >
                    <option value="CASH">Cash (Draws from drawer)</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Paid To / Vendor</label>
                  <input
                    type="text"
                    required
                    placeholder="Vendor / Payee Name"
                    value={expenseForm.paid_to_vendor}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paid_to_vendor: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Invoice / Bill # (Optional)</label>
                  <input
                    type="text"
                    placeholder="Bill Reference"
                    value={expenseForm.invoice_reference}
                    onChange={(e) => setExpenseForm({ ...expenseForm, invoice_reference: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="recurringCheck"
                  checked={expenseForm.is_recurring}
                  onChange={(e) => setExpenseForm({ ...expenseForm, is_recurring: e.target.checked })}
                  className="rounded text-primary-600"
                />
                <label htmlFor="recurringCheck" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Recurring expense (e.g. Monthly rent, internet subscription)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewExpenseModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-xs"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: CASH CLOSING KEYPAD (Quick Modal Popup)                     */}
      {/* ==================================================================== */}
      {isClosingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Daily Cash Count & Closing</h3>
              </div>
              <button onClick={() => setIsClosingModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-500">Expected in Drawer:</span>
              <span className="font-mono font-bold text-sm text-primary-600">
                ₹{expectedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs max-h-56 overflow-y-auto custom-scrollbar p-1">
              {[500, 200, 100, 50, 20, 10, 5, 2, 1].map((val) => (
                <div key={val} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border text-center">
                  <div className="font-mono font-black text-slate-700 dark:text-slate-300">₹{val}</div>
                  <input
                    type="number"
                    min="0"
                    value={denominations[String(val)] || ''}
                    onChange={(e) => {
                      const newCount = Math.max(0, parseInt(e.target.value) || 0)
                      setDenominations({ ...denominations, [String(val)]: newCount })
                    }}
                    placeholder="0"
                    className="w-full mt-1 p-1 text-center font-mono font-bold rounded-lg border text-xs"
                  />
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 flex justify-between items-center text-xs font-bold">
              <span>Counted Total: ₹{physicalTotal.toLocaleString('en-IN')}</span>
              <span className={liveDifference < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                {liveDifference === 0 ? 'Exact' : `${liveDifference < 0 ? 'Shortage' : 'Excess'}: ₹${Math.abs(liveDifference).toLocaleString('en-IN')}`}
              </span>
            </div>

            {liveDifference !== 0 && (
              <textarea
                value={differenceReason}
                onChange={(e) => setDifferenceReason(e.target.value)}
                placeholder="Reason for cash difference (mandatory)..."
                className="w-full p-2 text-xs rounded-xl border bg-slate-50 dark:bg-slate-950"
                rows={2}
              />
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsClosingModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitCashClosing}
                className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold"
              >
                Submit Closing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: CASH MOVEMENT (Bank Deposit/Withdrawal/Transfer)             */}
      {/* ==================================================================== */}
      {isCashMovementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Record Cash Movement</h3>
              </div>
              <button onClick={() => setIsCashMovementModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordMovement} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Movement Type</label>
                <select
                  value={movementForm.transaction_type}
                  onChange={(e) => setMovementForm({ ...movementForm, transaction_type: e.target.value })}
                  className="w-full p-2 rounded-xl border bg-slate-50 dark:bg-slate-950 font-bold"
                >
                  <option value="bank_deposit">Bank Cash Deposit (Cash deposited to bank)</option>
                  <option value="bank_withdrawal">Bank Cash Withdrawal (Cash drawn from bank)</option>
                  <option value="transfer_in">Inter-Counter Transfer In</option>
                  <option value="transfer_out">Inter-Counter Transfer Out</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder="0.00"
                  value={movementForm.amount}
                  onChange={(e) => setMovementForm({ ...movementForm, amount: e.target.value })}
                  className="w-full p-2 rounded-xl border bg-slate-50 dark:bg-slate-950 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Bank / Destination Entity</label>
                <input
                  type="text"
                  placeholder="e.g. SBI Main Branch A/C 12345"
                  value={movementForm.destination_or_source}
                  onChange={(e) => setMovementForm({ ...movementForm, destination_or_source: e.target.value })}
                  className="w-full p-2 rounded-xl border bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Reference / Slip #</label>
                <input
                  type="text"
                  placeholder="Deposit slip / withdrawal slip #"
                  value={movementForm.reference_number}
                  onChange={(e) => setMovementForm({ ...movementForm, reference_number: e.target.value })}
                  className="w-full p-2 rounded-xl border bg-slate-50 dark:bg-slate-950 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCashMovementModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold"
                >
                  Save Movement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
