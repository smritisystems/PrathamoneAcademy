/**
 * @file        Batches.tsx
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
 * @updated     2026-11-07
 *
 * @description Batch directory page redirected to Academic Workspace batch management tab.
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Plus, Users, Layers, CheckCircle, Lock } from 'lucide-react'
import { standardsApi, divisionsApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { EditModeBar } from '../components/common'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'

export default function BatchesPage() {
  const { selectedInstitutionId } = useAuthStore()
  const qc = useQueryClient()
  const [selectedStandardId, setSelectedStandardId] = useState<string>('')
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [batchForm, setBatchForm] = useState({
    standard_id: '',
    name: '',
    capacity: '40',
    room_number: '',
  })

  // Fetch standards
  const { data: standards = [] } = useQuery({
    queryKey: ['standards', selectedInstitutionId],
    queryFn: () => standardsApi.list(selectedInstitutionId ?? undefined).then((r) => r.data),
  })

  // Set default selected standard when loaded
  const currentStandardId = selectedStandardId || (standards[0]?.id ? String(standards[0].id) : '')

  // Fetch divisions for current standard
  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['divisions', currentStandardId],
    queryFn: () =>
      currentStandardId
        ? divisionsApi.list(currentStandardId).then((r) => r.data)
        : Promise.resolve([]),
    enabled: !!currentStandardId,
  })

  const batchMutation = useMutation({
    mutationFn: (data: { standard_id: number; name: string; capacity: number; room_number?: string }) =>
      divisionsApi.create(data),
    onSuccess: () => {
      toast.success('Batch created successfully')
      qc.invalidateQueries({ queryKey: ['divisions', currentStandardId] })
      setShowBatchModal(false)
      setBatchForm({ standard_id: '', name: '', capacity: '40', room_number: '' })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to create batch'),
  })

  const selectedStdObj = standards.find((s) => String(s.id) === currentStandardId)
  const editScope = 'academic:batches'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])

  return (
    <div className="space-y-6">
      {/* Global View-First & Explicit Edit Mode Governance Bar */}
      <EditModeBar scope={editScope} title="Academic Batches & Division Management" isDirty={showBatchModal} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Batch Management</h1>
          <p className="text-sm text-gray-500">
            Allocate and monitor coaching batches, batch capacity, and classroom assignments
          </p>
        </div>
        {isEditMode ? (
          <button
            onClick={() => {
              setBatchForm((f) => ({ ...f, standard_id: currentStandardId }))
              setShowBatchModal(true)
            }}
            className="btn-primary flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Batch
          </button>
        ) : (
          <button
            type="button"
            onClick={() => toast.error('Locked in View Mode: Please enable Edit Mode above to create new batches.')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
            title="Locked in View Mode: Enable Edit Mode above to create new batches"
          >
            <Lock className="w-4 h-4 text-slate-400" />
            <span>Add Batch (Locked)</span>
          </button>
        )}
      </div>

      {/* Standard Selector Tabs */}
      <div className="card p-3">
        <label className="block text-xs font-semibold text-gray-600 mb-2">
          SELECT STANDARD / LEVEL TO VIEW BATCHES:
        </label>
        <div className="flex flex-wrap gap-2">
          {standards.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStandardId(String(s.id))}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentStandardId === String(s.id)
                  ? 'bg-primary-700 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Batches Grid */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {selectedStdObj?.name ? `${selectedStdObj.name} — Batches` : 'Batches'}
            </h2>
            <p className="text-xs text-gray-500">
              Total {batches.length} active batch{batches.length === 1 ? '' : 'es'}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700" />
          </div>
        ) : batches.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <CalendarDays className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-medium">No batches created for this standard yet</p>
            <p className="text-xs mt-1">Click "+ Add Batch" to set up a new batch division.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {batches.map((b: any) => {
              const cap = b.capacity || 40
              const count = b.student_count || 0
              const percent = Math.min(Math.round((count / cap) * 100), 100)

              return (
                <div key={b.id} className="border border-gray-200 rounded-lg p-4 bg-white hover:border-primary-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                        Batch {b.name}
                      </span>
                      <h3 className="font-bold text-gray-800 text-base mt-1">
                        {selectedStdObj?.name} - {b.name}
                      </h3>
                      {b.room_number && (
                        <p className="text-xs text-gray-500 mt-0.5">Room: {b.room_number}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary-700">{count}</p>
                      <p className="text-[11px] text-gray-400">/ {cap} seats</p>
                    </div>
                  </div>

                  {/* Occupancy Progress */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Occupancy</span>
                      <span className="font-semibold text-gray-700">{percent}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          percent >= 90
                            ? 'bg-red-500'
                            : percent >= 70
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1 text-green-600 font-medium">
                      <CheckCircle className="w-3.5 h-3.5" /> Enrolling
                    </span>
                    <span>Max {cap} students</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Batch Modal */}
      <Modal isOpen={showBatchModal} onClose={() => setShowBatchModal(false)} title="Create New Batch">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Standard / Level *</label>
            <select
              className="input w-full"
              value={batchForm.standard_id}
              onChange={(e) => setBatchForm({ ...batchForm, standard_id: e.target.value })}
            >
              <option value="">Select standard...</option>
              {standards.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch Code / Name *</label>
            <input
              className="input w-full"
              value={batchForm.name}
              onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
              placeholder="e.g. A, B, Morning Batch, JEE-Batch-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student Capacity</label>
            <input
              type="number"
              className="input w-full"
              value={batchForm.capacity}
              onChange={(e) => setBatchForm({ ...batchForm, capacity: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Classroom / Room Number</label>
            <input
              className="input w-full"
              value={batchForm.room_number}
              onChange={(e) => setBatchForm({ ...batchForm, room_number: e.target.value })}
              placeholder="e.g. Classroom 102, Hall B"
            />
          </div>
          <div className="flex gap-3 justify-end pt-3">
            <button onClick={() => setShowBatchModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={() =>
                batchMutation.mutate({
                  standard_id: Number(batchForm.standard_id),
                  name: batchForm.name,
                  capacity: Number(batchForm.capacity) || 40,
                  room_number: batchForm.room_number,
                })
              }
              disabled={batchMutation.isPending || !batchForm.standard_id || !batchForm.name}
              className="btn-primary"
            >
              {batchMutation.isPending ? 'Creating…' : 'Create Batch'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
