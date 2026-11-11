/**
 * @file        ConcessionTraceModal.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.common
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
 * @description Full end-to-end drill-down transaction traceability modal:
 */

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, ShieldCheck, FileText, ArrowRight, CheckCircle2, Clock, AlertCircle, User } from 'lucide-react'
import { concessionsApi } from '../../api/endpoints'

interface ConcessionTraceModalProps {
  entityType: 'application' | 'allocation' | 'invoice' | 'student' | null
  entityId: number | null
  onClose: () => void
  onNavigateStudent?: (studentId: number) => void
}

const fmtCurrency = (n: number | undefined | null) =>
  `₹${Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

export const ConcessionTraceModal: React.FC<ConcessionTraceModalProps> = ({
  entityType,
  entityId,
  onClose,
  onNavigateStudent,
}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['concession-trace', entityType, entityId],
    queryFn: async () => {
      if (!entityType || !entityId) return null
      const res = await concessionsApi.traceTransaction(entityType, entityId)
      return res.data
    },
    enabled: Boolean(entityType && entityId),
  })

  if (!entityType || !entityId) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-700 to-blue-700 text-white">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-indigo-200" />
            <div>
              <h3 className="text-base font-bold">End-to-End Financial Traceability Chain</h3>
              <p className="text-xs text-indigo-100">
                Inspecting {entityType.toUpperCase()} #{entityId} · Student → Fee Invoice → Benefit Application → Ledger Posting → Audit Trail
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
            aria-label="Close trace modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {isLoading ? (
            <div className="py-12 text-center text-gray-500">Loading canonical transaction trace...</div>
          ) : error || !data ? (
            <div className="py-10 text-center text-red-600 flex flex-col items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              <span>Unable to resolve traceability record for {entityType} #{entityId}.</span>
            </div>
          ) : (
            <>
              {/* 1. Student & Invoice Breadcrumb */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.student && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Canonical Student</p>
                      <p className="text-base font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                        <User className="w-4 h-4 text-indigo-600" />
                        <span>{data.student.name}</span>
                      </p>
                      <p className="text-xs text-slate-500">Admission No: {data.student.admission_number}</p>
                    </div>
                    {onNavigateStudent && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose()
                          onNavigateStudent(data.student!.id)
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 inline-flex items-center gap-1"
                      >
                        <span>Open Profile</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {data.invoice && (
                  <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">Linked Fee Invoice</p>
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-blue-100 text-blue-800">
                        {data.invoice.status}
                      </span>
                    </div>
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>{data.invoice.invoice_number}</span>
                    </p>
                    <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
                      <div>
                        <span className="text-gray-500 block">Gross</span>
                        <span className="font-semibold">{fmtCurrency(data.invoice.gross_fee)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Reductions</span>
                        <span className="font-semibold text-emerald-700">-{fmtCurrency(data.invoice.discount_amount)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Net Due</span>
                        <span className="font-semibold">{fmtCurrency(data.invoice.net_amount)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Outstanding</span>
                        <span className="font-bold text-amber-700">{fmtCurrency(data.invoice.outstanding_amount)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Concession / Waiver / Scholarship Applications */}
              {data.applications && data.applications.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                    Benefit Applications & Approvals ({data.applications.length})
                  </h4>
                  <div className="space-y-2">
                    {data.applications.map((app) => (
                      <div key={app.id} className="p-3.5 rounded-xl border border-gray-200 bg-white flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-indigo-700 text-xs">{app.application_number}</span>
                            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full bg-indigo-50 text-indigo-700">
                              {app.benefit_type.replace(/_/g, ' ')}
                            </span>
                            {app.waiver_scope && (
                              <span className="px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full bg-purple-50 text-purple-700">
                                {app.waiver_scope} waiver
                              </span>
                            )}
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-gray-100 text-gray-800">
                              {app.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Funding: <span className="font-medium text-gray-700">{app.funding_source}</span>
                            {app.sponsor_name ? ` (${app.sponsor_name} · Settlement: ${app.sponsor_settlement_status || 'pending'})` : ''}
                            {app.approved_at ? ` · Approved: ${new Date(app.approved_at).toLocaleDateString()}` : ''}
                          </p>
                          {(app.approval_remarks || app.cancellation_reason) && (
                            <p className="text-xs text-gray-600 mt-0.5 italic">
                              {app.cancellation_reason || app.approval_remarks}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-right">
                          <div>
                            <span className="text-gray-400 block">Approved</span>
                            <span className="font-bold text-gray-900">{fmtCurrency(app.approved_amount)}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block">Posted</span>
                            <span className="font-bold text-emerald-700">{fmtCurrency(app.applied_amount)}</span>
                          </div>
                          {app.reversed_amount > 0 && (
                            <div>
                              <span className="text-gray-400 block">Reversed</span>
                              <span className="font-bold text-rose-700">{fmtCurrency(app.reversed_amount)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Immutable Ledger Allocations */}
              {data.allocations && data.allocations.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                    Immutable Benefit Ledger Postings ({data.allocations.length})
                  </h4>
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-50 text-gray-500 uppercase font-semibold">
                        <tr>
                          <th className="px-3 py-2">Txn Ref</th>
                          <th className="px-3 py-2">Classification</th>
                          <th className="px-3 py-2">Posting Status</th>
                          <th className="px-3 py-2">Effective Date</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                          <th className="px-3 py-2 text-right">Credit Surplus</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.allocations.map((al) => (
                          <tr key={al.id} className={al.allocated_amount < 0 ? 'bg-rose-50/40' : ''}>
                            <td className="px-3 py-2 font-mono font-semibold text-indigo-700">{al.transaction_ref || `ALLOC-${al.id}`}</td>
                            <td className="px-3 py-2">{al.transaction_type.replace(/_/g, ' ')}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                al.posting_status === 'posted' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                              }`}>
                                {al.posting_status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-600">{al.effective_date || '—'}</td>
                            <td className={`px-3 py-2 text-right font-bold ${al.allocated_amount < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                              {fmtCurrency(al.allocated_amount)}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-600">{fmtCurrency(al.credit_adjustment_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 4. Audit History Timeline */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Immutable Audit History ({data.audit_history?.length ?? 0})
                </h4>
                {data.audit_history && data.audit_history.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {data.audit_history.map((aud) => (
                      <div key={aud.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs">
                        {aud.severity === 'WARNING' || aud.severity === 'warning' ? (
                          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-gray-800">{aud.action}</span>
                            <span className="text-[10px] text-gray-400 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {aud.created_at ? new Date(aud.created_at).toLocaleString() : '—'}
                            </span>
                          </div>
                          <p className="text-gray-600 mt-0.5">{aud.details || 'Action recorded in immutable governance log.'}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Actor: {aud.actor}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No discrete audit events matched yet for this entity.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

