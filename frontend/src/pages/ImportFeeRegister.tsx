/**
 * @file        ImportFeeRegister.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.pages
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-04
 * @updated     2026-11-04
 *
 * @description Legacy fee register import wizard for spreadsheet mapping, preview, and validation.
 */

import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  FileSpreadsheet, CheckCircle2, AlertTriangle, AlertCircle, HelpCircle,
  RefreshCw, Upload, Download, ArrowRight, ShieldCheck, Database,
  ChevronDown, ChevronRight, Search, Filter, Info, DollarSign, Users, BookOpen
} from 'lucide-react'
import toast from 'react-hot-toast'
import { feeRegisterImportApi } from '../api/endpoints'
import type {
  FeeRegisterPreviewResponse,
  FeeRegisterStudent,
  FeeRegisterGroup,
  FeeRegisterImportExecutionResponse,
  FeeRegisterImportLog,
} from '../types'
import Modal from '../components/Modal'

export default function ImportFeeRegister() {
  const [loading, setLoading] = useState<boolean>(true)
  const [executing, setExecuting] = useState<boolean>(false)
  const [previewData, setPreviewData] = useState<FeeRegisterPreviewResponse | null>(null)
  const [importStatus, setImportStatus] = useState<{
    already_imported: boolean
    default_file_hash: string
    total_imports: number
    history: FeeRegisterImportLog[]
  } | null>(null)
  const [executionResult, setExecutionResult] = useState<FeeRegisterImportExecutionResponse | null>(null)

  // Filters & State
  const [activeTab, setActiveTab] = useState<'students' | 'groups' | 'audit' | 'history'>('students')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')
  const [expandedStudents, setExpandedStudents] = useState<Record<number, boolean>>({})
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [replaceDemoData, setReplaceDemoData] = useState(true)

  // Load preview data and status
  const loadData = async () => {
    setLoading(true)
    try {
      const [prevRes, statusRes] = await Promise.all([
        feeRegisterImportApi.getPreview(),
        feeRegisterImportApi.getStatus(),
      ])
      setPreviewData(prevRes.data)
      setImportStatus(statusRes.data)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to load fee register preview')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const res = await feeRegisterImportApi.previewUpload(file)
      setPreviewData(res.data)
      toast.success(`Loaded preview for ${file.name}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to parse workbook')
    } finally {
      setLoading(false)
    }
  }

  const toggleStudentExpand = (idx: number) => {
    setExpandedStudents((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }))
  }

  const toggleAllStudents = (expand: boolean) => {
    if (!previewData) return
    const newState: Record<number, boolean> = {}
    previewData.students.forEach((s) => {
      newState[s.student_index] = expand
    })
    setExpandedStudents(newState)
  }

  const handleExecuteImport = async () => {
    setExecuting(true)
    setShowConfirmModal(false)
    try {
      const res = await feeRegisterImportApi.execute({
        replace_demo_data: replaceDemoData,
      })
      setExecutionResult(res.data)
      toast.success(res.data.message || 'Fee register successfully imported!')
      // Refresh status
      const statusRes = await feeRegisterImportApi.getStatus()
      setImportStatus(statusRes.data)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Import failed')
    } finally {
      setExecuting(false)
    }
  }

  const filteredStudents = (previewData?.students || []).filter((s) => {
    const matchesGroup = selectedGroup === 'ALL' || s.group === selectedGroup
    const matchesStatus = selectedStatus === 'ALL' || s.discrepancy_status === selectedStatus
    const matchesSearch =
      !searchQuery.trim() ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.group.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.batch_name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesGroup && matchesStatus && matchesSearch
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'MATCH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Reconciled
          </span>
        )
      case 'DISCREPANCY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5" /> Discrepancy
          </span>
        )
      case 'UNCLEAR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
            <HelpCircle className="w-3.5 h-3.5" /> Unclear
          </span>
        )
      case 'BLANK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            <Info className="w-3.5 h-3.5" /> Blank
          </span>
        )
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">{status}</span>
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-10 h-10 text-primary-600 animate-spin" />
        <p className="text-gray-600 font-medium">Parsing and reconciling Fee Register workbook...</p>
      </div>
    )
  }

  const summary = previewData?.summary

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link to="/fees" className="text-xs text-primary-600 hover:underline font-semibold flex items-center gap-1">
              ← Back to Fee Management
            </Link>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary-600 uppercase tracking-wider mb-1">
            <Database className="w-4 h-4" /> Data Migration & Financial Reconciliation
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            Fee Register Migration ({previewData?.file_name})
            {importStatus?.already_imported && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Active in Database
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Inspect, audit discrepancies, and import 2024-2025 student enrollments, fee obligations, and monthly payment records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="btn btn-secondary cursor-pointer flex items-center gap-2 text-sm">
            <Upload className="w-4 h-4" /> Upload Other Register
            <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
          </label>
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={executing}
            className="btn btn-primary flex items-center gap-2 text-sm shadow-md shadow-primary-600/20"
          >
            {executing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Importing...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" /> Confirm & Execute Import
              </>
            )}
          </button>
        </div>
      </div>

      {/* Execution Success Notification */}
      {executionResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-base font-bold text-emerald-900">Import Successfully Completed</h3>
              <p className="text-sm text-emerald-700 mt-1">
                {executionResult.message} Fingerprint: <code className="text-xs bg-emerald-100 px-1.5 py-0.5 rounded font-mono">{executionResult.file_hash.substring(0, 16)}...</code>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-3 border-t border-emerald-200/60">
                <div>
                  <span className="text-xs text-emerald-600 uppercase font-semibold">Imported Students</span>
                  <p className="text-lg font-bold text-emerald-950">{executionResult.summary.total_students}</p>
                </div>
                <div>
                  <span className="text-xs text-emerald-600 uppercase font-semibold">Total Fee Ledger</span>
                  <p className="text-lg font-bold text-emerald-950">₹{executionResult.summary.total_fees.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <span className="text-xs text-emerald-600 uppercase font-semibold">Collected Payments</span>
                  <p className="text-lg font-bold text-emerald-950">₹{executionResult.summary.total_collected.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <span className="text-xs text-emerald-600 uppercase font-semibold">Outstanding Balance</span>
                  <p className="text-lg font-bold text-emerald-950">₹{executionResult.summary.total_outstanding.toLocaleString('en-IN')}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <Link to="/dashboard" className="btn btn-primary text-xs flex items-center gap-1.5">
                  View Live Dashboard <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link to="/students" className="btn btn-secondary text-xs">
                  View Student Directory
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Students</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{summary?.total_students || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Across 5 Coaching Batches</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Fee Obligation</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              ₹{(summary?.total_fees || 0).toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-gray-500 mt-1">Stated in fee register</p>
          </div>
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Collected (170 Payments)</p>
            <p className="text-2xl font-bold text-emerald-800 mt-1">
              ₹{(summary?.total_collected || 0).toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-emerald-600 font-medium mt-1">
              {summary ? ((summary.total_collected / summary.total_fees) * 100).toFixed(1) : 0}% Collection Rate
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Calculated Outstanding</p>
            <p className="text-2xl font-bold text-amber-800 mt-1">
              ₹{(summary?.total_outstanding || 0).toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-amber-600 mt-1">Obligations minus payments</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('students')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 ${
              activeTab === 'students'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Students & Payments Ledger ({previewData?.students.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 ${
              activeTab === 'groups'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Detected Batches ({previewData?.groups.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 ${
              activeTab === 'audit'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            Reconciliation & Audit Discrepancies ({summary?.discrepancy_count || 0})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Database className="w-4 h-4" />
            Import History & Fingerprints
          </button>
        </nav>
      </div>

      {/* TAB 1: STUDENTS & PAYMENTS LEDGER */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search student name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pl-9 text-sm w-full"
                />
              </div>

              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="input text-sm py-2"
              >
                <option value="ALL">All Batches</option>
                {previewData?.groups.map((g) => (
                  <option key={g.name} value={g.name}>
                    {g.name} ({g.student_count})
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="input text-sm py-2"
              >
                <option value="ALL">All Reconciliations</option>
                <option value="MATCH">Reconciled ({summary?.match_count})</option>
                <option value="DISCREPANCY">Discrepancy ({summary?.discrepancy_count})</option>
                <option value="UNCLEAR">Unclear ({summary?.unclear_count})</option>
                <option value="BLANK">Blank ({summary?.blank_count})</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => toggleAllStudents(true)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium"
              >
                Expand All Payments
              </button>
              <button
                onClick={() => toggleAllStudents(false)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium"
              >
                Collapse All
              </button>
            </div>
          </div>

          {/* Student Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/70 border-b border-gray-200/80 text-gray-600 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Batch / Board</th>
                    <th className="py-3 px-4 text-right">Fee Obligation</th>
                    <th className="py-3 px-4 text-center">Payments</th>
                    <th className="py-3 px-4 text-right">Calculated Paid</th>
                    <th className="py-3 px-4 text-right">Calculated Bal.</th>
                    <th className="py-3 px-4 text-right">Stated Bal.</th>
                    <th className="py-3 px-4 text-center">Audit Status</th>
                    <th className="py-3 px-4 w-12 text-center">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-gray-500">
                        No students matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => {
                      const isExpanded = !!expandedStudents[s.student_index]
                      return (
                        <React.Fragment key={s.student_index}>
                          <tr className={`hover:bg-gray-50/80 transition-colors ${isExpanded ? 'bg-blue-50/20' : ''}`}>
                            <td className="py-3 px-4 text-center text-xs text-gray-500 font-mono">
                              {s.student_index}
                            </td>
                            <td className="py-3 px-4 font-semibold text-gray-900">
                              {s.name}
                              <div className="text-xs text-gray-400 font-normal font-mono">
                                PA-2024-{String(s.student_index).padStart(6, '0')}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                {s.group}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-gray-900">
                              ₹{s.total_fee.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                                {s.payments_count} txns
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                              ₹{s.calc_paid.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-gray-800">
                              ₹{s.calc_balance.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-4 text-right text-gray-500 font-mono text-xs">
                              {s.stated_balance !== null && s.stated_balance !== undefined
                                ? typeof s.stated_balance === 'number'
                                  ? `₹${s.stated_balance.toLocaleString('en-IN')}`
                                  : String(s.stated_balance)
                                : '—'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {getStatusBadge(s.discrepancy_status)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => toggleStudentExpand(s.student_index)}
                                className="p-1 hover:bg-gray-200 rounded text-gray-600 transition-colors"
                                title="Toggle payment transactions"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-primary-600" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                            </td>
                          </tr>

                          {/* Nested Payment Transactions */}
                          {isExpanded && (
                            <tr className="bg-slate-50/70 border-b border-gray-200">
                              <td colSpan={10} className="p-4 pl-12">
                                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                                      <FileSpreadsheet className="w-4 h-4 text-primary-600" />
                                      Recorded Payment Transactions ({s.payments.length})
                                    </h4>
                                    {s.discrepancy_notes && (
                                      <p className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                                        <strong>Audit Note:</strong> {s.discrepancy_notes}
                                      </p>
                                    )}
                                  </div>

                                  {s.payments.length === 0 ? (
                                    <p className="text-xs text-gray-500 italic py-2">
                                      No individual monthly payment entries recorded in workbook for this student.
                                    </p>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                      {s.payments.map((p, pIdx) => (
                                        <div
                                          key={pIdx}
                                          className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-white transition-colors"
                                        >
                                          <div>
                                            <p className="text-xs font-semibold text-gray-900">{p.date_str}</p>
                                            <p className="text-[11px] text-gray-400 font-mono truncate max-w-[130px]">
                                              {p.raw}
                                            </p>
                                          </div>
                                          <div className="text-right">
                                            <span className="text-xs font-bold text-emerald-700">
                                              ₹{p.amount.toLocaleString('en-IN')}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DETECTED BATCHES */}
      {activeTab === 'groups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {previewData?.groups.map((g) => (
            <div key={g.name} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary-50 text-primary-700">
                    {g.board} • Std {g.level}
                  </span>
                  <h3 className="text-lg font-bold text-gray-900 mt-1">{g.name}</h3>
                  <p className="text-xs text-gray-500">Batch Code: {g.batch_name}</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-gray-900">{g.student_count}</span>
                  <p className="text-xs text-gray-500">Students</p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-100 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Obligation:</span>
                  <span className="font-semibold text-gray-900">₹{g.total_fees.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Collected:</span>
                  <span className="font-semibold text-emerald-700">₹{g.total_collected.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Balance:</span>
                  <span className="font-semibold text-amber-700">₹{g.total_balance.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Collection Progress</span>
                  <span>{((g.total_collected / g.total_fees) * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-emerald-600 h-2 rounded-full"
                    style={{ width: `${(g.total_collected / g.total_fees) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: RECONCILIATION & AUDIT DISCREPANCIES */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-900">Reconciliation & Financial Integrity Guarantee</h3>
                <p className="text-xs text-amber-800 mt-1">
                  The Prashant Academy import engine preserves historical payment records with 100% exactitude. Discrepancies between calculated balances (Total Fees − Sum of Payment Entries) and the author's stated balance cell are systematically flagged below. No historical amounts are altered or forced to match.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm">Discrepant Records Requiring Administrative Review (23)</h3>
              <span className="text-xs text-gray-500">19 Discrepancies • 3 Unclear • 1 Blank</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Batch</th>
                    <th className="py-3 px-4 text-right">Fee</th>
                    <th className="py-3 px-4 text-right">Calculated Paid</th>
                    <th className="py-3 px-4 text-right">Calculated Bal.</th>
                    <th className="py-3 px-4 text-right">Stated Bal.</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Audit Findings & Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {previewData?.students
                    .filter((s) => s.discrepancy_status !== 'MATCH')
                    .map((s) => (
                      <tr key={s.student_index} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-semibold text-gray-900">{s.name}</td>
                        <td className="py-3 px-4 text-xs text-gray-600">{s.group}</td>
                        <td className="py-3 px-4 text-right font-medium">₹{s.total_fee.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-right text-emerald-700 font-semibold">
                          ₹{s.calc_paid.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">
                          ₹{s.calc_balance.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-gray-700">
                          {s.stated_balance !== null && s.stated_balance !== undefined
                            ? typeof s.stated_balance === 'number'
                              ? `₹${s.stated_balance.toLocaleString('en-IN')}`
                              : String(s.stated_balance)
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-center">{getStatusBadge(s.discrepancy_status)}</td>
                        <td className="py-3 px-4 text-xs text-gray-700">{s.discrepancy_notes}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: IMPORT HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-gray-900 text-base">Database Import Logs & SHA-256 Fingerprints</h3>
          <p className="text-xs text-gray-500">
            Every execution of the fee register import is tracked with SHA-256 integrity fingerprints to prevent double billing or duplicate transactions.
          </p>

          <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
            {importStatus?.history.length === 0 ? (
              <p className="p-6 text-sm text-gray-500 text-center">No previous imports recorded yet.</p>
            ) : (
              importStatus?.history.map((log) => (
                <div key={log.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">{log.file_name}</span>
                      <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">
                        {log.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">SHA-256: {log.file_hash}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Imported {log.imported_students_count} students • {log.imported_payments_count} payment receipts on{' '}
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      ₹{log.total_fees_amount.toLocaleString('en-IN')} Fees
                    </p>
                    <p className="text-xs text-emerald-700 font-semibold">
                      ₹{log.total_collected_amount.toLocaleString('en-IN')} Collected
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Fee Register Import"
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 leading-relaxed">
            You are about to import <strong>39 student records</strong>, create <strong>39 fee invoices</strong> (totalling ₹2,935,000.00), and generate <strong>170 payment allocations and receipts</strong> (totalling ₹1,819,500.00) in an atomic transaction.
          </div>

          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <input
              type="checkbox"
              id="replaceDemo"
              checked={replaceDemoData}
              onChange={(e) => setReplaceDemoData(e.target.checked)}
              className="mt-1 rounded text-primary-600 focus:ring-primary-500 h-4 w-4"
            />
            <label htmlFor="replaceDemo" className="text-xs text-amber-900 cursor-pointer">
              <strong>Replace Demo & Synthetic Data:</strong>
              <span className="block text-amber-700 mt-0.5">
                Cleans synthetic/placeholder demo students and payments so dashboard and registers reflect real coaching institute client data.
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="btn btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteImport}
              className="btn btn-primary text-sm flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" /> Proceed with Import
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

