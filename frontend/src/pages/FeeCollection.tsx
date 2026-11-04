/**
 * @file        FeeCollection.tsx
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
 * @created     2026-11-03
 * @updated     2026-11-04
 *
 * @description Student fee collection terminal for recording payments against outstanding installments.
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getStudent,
  getStudentInvoices,
  createPayment,
  getPaymentReceipt,
} from '../api/endpoints';
import type { FeeInvoice, FeeInstallment } from '../types';
import { InstallmentStatusBadge } from '../components/Badge';
import Modal from '../components/Modal';

const PAYMENT_METHODS = ['cash', 'upi', 'bank_transfer', 'cheque', 'other'] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

interface AllocationRow {
  installment_id: number;
  amount: string;
}

export default function FeeCollection() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastReceiptNumber, setLastReceiptNumber] = useState<string>('');
  const [formError, setFormError] = useState('');

  const { data: student } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => getStudent(studentId!),
    enabled: !!studentId,
  });

  const { data: invoicesData } = useQuery({
    queryKey: ['student-invoices', studentId],
    queryFn: () => getStudentInvoices(studentId!),
    enabled: !!studentId,
  });

  const { data: receipt } = useQuery({
    queryKey: ['receipt', lastReceiptNumber],
    queryFn: () => getPaymentReceipt(lastReceiptNumber),
    enabled: !!lastReceiptNumber && showReceiptModal,
  });

  const invoices: FeeInvoice[] = Array.isArray(invoicesData)
    ? invoicesData
    : (invoicesData as any)?.items || [];
  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId);
  const installments: FeeInstallment[] = selectedInvoice?.installments || [];

  const totalAllocated = allocations.reduce(
    (sum, a) => sum + (parseFloat(a.amount) || 0),
    0
  );

  const payMutation = useMutation({
    mutationFn: createPayment,
    onSuccess: (data: any) => {
      setLastReceiptNumber(data.receipt_number);
      setShowReceiptModal(true);
      queryClient.invalidateQueries({ queryKey: ['student-invoices', studentId] });
      queryClient.invalidateQueries({ queryKey: ['student', studentId] });
      setPaymentAmount('');
      setAllocations([]);
      setTransactionRef('');
      setNotes('');
      setFormError('');
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.detail || 'Payment failed. Please try again.');
    },
  });

  const handleInvoiceSelect = (invoiceId: number) => {
    setSelectedInvoiceId(invoiceId);
    setAllocations([]);
    setPaymentAmount('');
    setFormError('');
  };

  const toggleAllocationRow = (installmentId: number) => {
    setAllocations((prev) => {
      const exists = prev.find((a) => a.installment_id === installmentId);
      if (exists) {
        return prev.filter((a) => a.installment_id !== installmentId);
      }
      return [...prev, { installment_id: installmentId, amount: '' }];
    });
  };

  const updateAllocationAmount = (installmentId: number, amount: string) => {
    setAllocations((prev) =>
      prev.map((a) => (a.installment_id === installmentId ? { ...a, amount } : a))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedInvoiceId) {
      setFormError('Please select an invoice.');
      return;
    }
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      setFormError('Enter a valid payment amount.');
      return;
    }

    const outstanding = parseFloat(String(selectedInvoice?.outstanding_amount || '0'));
    if (amount > outstanding) {
      setFormError(`Amount (₹${amount.toLocaleString('en-IN')}) exceeds outstanding balance (₹${outstanding.toLocaleString('en-IN')}).`);
      return;
    }

    if (allocations.length > 0 && Math.abs(totalAllocated - amount) > 0.01) {
      setFormError(`Allocation total (₹${totalAllocated.toLocaleString('en-IN')}) must equal payment amount (₹${amount.toLocaleString('en-IN')}).`);
      return;
    }

    const payload: any = {
      student_id: Number(studentId),
      invoice_id: selectedInvoiceId,
      amount,
      payment_method: paymentMethod,
      transaction_reference: transactionRef || undefined,
      notes: notes || undefined,
      allocations: allocations.length > 0
        ? allocations.map((a) => ({
            installment_id: a.installment_id,
            amount: parseFloat(a.amount) || 0,
          }))
        : undefined,
    };

    payMutation.mutate(payload);
  };

  const handlePrint = () => {
    window.print();
  };

  const studentName = student?.full_name || (student ? `${student.first_name} ${student.last_name}` : '');
  const totalBilled = student?.total_fees ?? student?.fee_summary?.total_fees ?? 0;
  const totalPaid = student?.total_paid ?? student?.fee_summary?.total_paid ?? 0;
  const totalOutstanding = student?.total_outstanding ?? student?.fee_summary?.outstanding ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-500 hover:text-gray-700 text-sm font-medium"
        >
          ← Back
        </button>
        <span className="text-gray-300">|</span>
        <button
          onClick={() => navigate('/fees?tab=register')}
          className="text-primary-600 hover:underline text-sm font-medium"
        >
          Fee Register
        </button>
        <span className="text-gray-300">|</span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Collection Terminal</h1>
          {student && (
            <p className="text-sm text-gray-500">
              {studentName} — {student.admission_number}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Invoice List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoices</h2>
            {invoices.length === 0 ? (
              <p className="text-sm text-gray-500">No invoices found.</p>
            ) : (
              <div className="space-y-3">
                {invoices.map((inv) => (
                  <button
                    key={inv.id}
                    onClick={() => handleInvoiceSelect(inv.id)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                      selectedInvoiceId === inv.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {inv.invoice_number}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Total: ₹{parseFloat(String(inv.total_amount)).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          inv.status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : inv.status === 'partial'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                      <div>
                        <span className="text-gray-500">Paid: </span>
                        <span className="font-medium text-green-600">
                          ₹{parseFloat(String(inv.paid_amount)).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Outstanding: </span>
                        <span className="font-medium text-red-600">
                          ₹{parseFloat(String(inv.outstanding_amount)).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Student Fee Summary */}
          {student && (
            <div className="card bg-blue-50 border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">Fee Summary</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Total Billed</span>
                  <span className="font-medium">
                    ₹{parseFloat(String(totalBilled)).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Total Paid</span>
                  <span className="font-medium text-green-700">
                    ₹{parseFloat(String(totalPaid)).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between border-t border-blue-200 pt-1 mt-1">
                  <span className="text-blue-900 font-semibold">Outstanding</span>
                  <span className="font-bold text-red-600">
                    ₹{parseFloat(String(totalOutstanding)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Payment Form */}
        <div className="lg:col-span-2 space-y-4">
          {selectedInvoice ? (
            <>
              {/* Installment Schedule */}
              {installments.length > 0 && (
                <div className="card">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Installment Schedule
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Select</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Installment</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Due Date</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-600">Amount</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-600">Paid</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-600">Outstanding</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-600">Pay Now</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {installments.map((inst) => {
                          const outstandingNum = inst.outstanding_amount ?? Math.max(0, inst.amount - inst.paid_amount);
                          const isSelected = allocations.some(
                            (a) => a.installment_id === inst.id
                          );
                          const alloc = allocations.find(
                            (a) => a.installment_id === inst.id
                          );
                          return (
                            <tr
                              key={inst.id}
                              className={isSelected ? 'bg-blue-50' : ''}
                            >
                              <td className="px-3 py-2">
                                {outstandingNum > 0 && (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleAllocationRow(inst.id)}
                                    className="rounded border-gray-300 text-blue-600"
                                  />
                                )}
                              </td>
                              <td className="px-3 py-2 font-medium">
                                Installment {inst.installment_number}
                              </td>
                              <td className="px-3 py-2 text-gray-600">
                                {inst.due_date
                                  ? new Date(inst.due_date).toLocaleDateString('en-IN')
                                  : '—'}
                              </td>
                              <td className="px-3 py-2 text-right">
                                ₹{parseFloat(String(inst.amount)).toLocaleString('en-IN')}
                              </td>
                              <td className="px-3 py-2 text-right text-green-600">
                                ₹{parseFloat(String(inst.paid_amount)).toLocaleString('en-IN')}
                              </td>
                              <td className="px-3 py-2 text-right text-red-600">
                                ₹{outstandingNum.toLocaleString('en-IN')}
                              </td>
                              <td className="px-3 py-2">
                                <InstallmentStatusBadge installment={inst} />
                              </td>
                              <td className="px-3 py-2 text-right">
                                {isSelected && (
                                  <input
                                    type="number"
                                    min="0"
                                    max={outstandingNum}
                                    step="0.01"
                                    value={alloc?.amount || ''}
                                    onChange={(e) =>
                                      updateAllocationAmount(inst.id, e.target.value)
                                    }
                                    placeholder="₹0"
                                    className="w-28 px-2 py-1 border border-blue-300 rounded text-right text-sm"
                                  />
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Payment Form */}
              <form onSubmit={handleSubmit} className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Record Payment — {selectedInvoice.invoice_number}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Amount (₹) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      max={parseFloat(String(selectedInvoice.outstanding_amount))}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="input"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Outstanding: ₹
                      {parseFloat(String(selectedInvoice.outstanding_amount)).toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method *
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="input"
                      required
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m.replace('_', ' ').toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Transaction Reference
                    </label>
                    <input
                      type="text"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      placeholder="UPI ID / Cheque No. / UTR"
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Optional notes"
                      className="input"
                    />
                  </div>
                </div>

                {/* Allocation Summary */}
                {allocations.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-700 font-medium">Total Allocated</span>
                      <span
                        className={`font-bold ${
                          Math.abs(totalAllocated - parseFloat(paymentAmount || '0')) < 0.01
                            ? 'text-green-700'
                            : 'text-red-600'
                        }`}
                      >
                        ₹{totalAllocated.toLocaleString('en-IN')}
                        {paymentAmount && ` / ₹${parseFloat(paymentAmount).toLocaleString('en-IN')}`}
                      </span>
                    </div>
                    {allocations.length > 0 &&
                      paymentAmount &&
                      Math.abs(totalAllocated - parseFloat(paymentAmount)) > 0.01 && (
                        <p className="text-xs text-orange-600 mt-1">
                          ⚠ Allocation must equal payment amount
                        </p>
                      )}
                  </div>
                )}

                {formError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{formError}</p>
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <button
                    type="submit"
                    disabled={payMutation.isPending}
                    className="btn-primary flex items-center gap-2"
                  >
                    {payMutation.isPending ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Processing…
                      </>
                    ) : (
                      '💳 Record Payment'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInvoiceId(null);
                      setAllocations([]);
                      setPaymentAmount('');
                      setFormError('');
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="card flex items-center justify-center h-48 text-gray-400">
              <div className="text-center">
                <p className="text-lg">← Select an invoice to record a payment</p>
                <p className="text-sm mt-1">Choose from the invoice list on the left</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Receipt Modal */}
      <Modal
        open={showReceiptModal}
        onClose={() => {
          setShowReceiptModal(false);
          setLastReceiptNumber('');
        }}
        title="Payment Receipt"
        size="lg"
      >
        {receipt ? (
          <div className="receipt-content">
            <div className="text-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold text-blue-900">Prashant Academy</h2>
              <p className="text-gray-500 text-sm">Official Fee Receipt</p>
              <p className="text-xs text-gray-400 mt-1">
                Receipt No: <strong>{receipt.receipt_number}</strong>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-6">
              <div>
                <span className="text-gray-500">Student:</span>
                <span className="ml-2 font-medium">{studentName}</span>
              </div>
              <div>
                <span className="text-gray-500">Admission No:</span>
                <span className="ml-2 font-medium">{student?.admission_number}</span>
              </div>
              <div>
                <span className="text-gray-500">Invoice:</span>
                <span className="ml-2 font-medium">{selectedInvoice?.invoice_number}</span>
              </div>
              <div>
                <span className="text-gray-500">Date:</span>
                <span className="ml-2 font-medium">
                  {new Date(receipt.generated_at || Date.now()).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Method:</span>
                <span className="ml-2 font-medium capitalize">
                  {receipt.payment_method?.replace('_', ' ')}
                </span>
              </div>
              {receipt.transaction_reference && (
                <div>
                  <span className="text-gray-500">Reference:</span>
                  <span className="ml-2 font-medium">{receipt.transaction_reference}</span>
                </div>
              )}
            </div>

            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-sm text-blue-700">Amount Received</p>
              <p className="text-3xl font-bold text-blue-900">
                ₹{parseFloat(String(receipt.amount)).toLocaleString('en-IN')}
              </p>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button onClick={handlePrint} className="btn-secondary">
                🖨️ Print Receipt
              </button>
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  setLastReceiptNumber('');
                }}
                className="btn-primary"
              >
                Done
              </button>
            </div>

            <p className="text-center text-xs text-gray-400 mt-4">
              This is a computer-generated receipt and does not require a signature.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32">
            <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        )}
      </Modal>
    </div>
  );
}
