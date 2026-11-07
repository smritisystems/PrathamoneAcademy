/**
 * @file        Standards.tsx
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
 * @updated     2026-11-08
 *
 * @description Standards page redirected to Academic Workspace classes management tab.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { getStandards, createStandard, getDivisions, createDivision } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import { useEditModeStore } from '../store/editModeStore';
import { EditModeBar } from '../components/common';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

export default function Standards() {
  const { selectedInstitutionId, selectedAcademicYearId } = useAuthStore();
  const qc = useQueryClient();
  const [selectedStdId, setSelectedStdId] = useState<string | null>(null);
  const [showStdModal, setShowStdModal] = useState(false);
  const [showDivModal, setShowDivModal] = useState(false);
  const [stdForm, setStdForm] = useState({ name: '', code: '', order_number: '' });
  const [divForm, setDivForm] = useState({ name: '', capacity: '40', room_number: '' });

  const { data: standardsData } = useQuery({
    queryKey: ['standards', selectedInstitutionId],
    queryFn: () => getStandards(selectedInstitutionId!),
    enabled: !!selectedInstitutionId,
  });

  const { data: divisionsData } = useQuery({
    queryKey: ['divisions', selectedStdId],
    queryFn: () => getDivisions(selectedStdId!),
    enabled: !!selectedStdId,
  });

  const standards = Array.isArray(standardsData) ? standardsData : (standardsData as any)?.items || [];
  const divisions = Array.isArray(divisionsData) ? divisionsData : (divisionsData as any)?.items || [];

  const stdMutation = useMutation({
    mutationFn: createStandard,
    onSuccess: () => {
      toast.success('Standard created');
      qc.invalidateQueries({ queryKey: ['standards'] });
      setShowStdModal(false);
      setStdForm({ name: '', code: '', order_number: '' });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed'),
  });

  const divMutation = useMutation({
    mutationFn: createDivision,
    onSuccess: () => {
      toast.success('Division created');
      qc.invalidateQueries({ queryKey: ['divisions'] });
      setShowDivModal(false);
      setDivForm({ name: '', capacity: '40', room_number: '' });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed'),
  });

  const selectedStd = standards.find((s: any) => s.id === selectedStdId);
  const editScope = 'academic:standards';
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope]);

  return (
    <div className="space-y-6">
      {/* Global View-First & Explicit Edit Mode Governance Bar */}
      <EditModeBar scope={editScope} title="Class Standards & Batch Structure" isDirty={showStdModal || showDivModal} />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Standards / Levels & Batches</h1>
          <p className="text-sm text-gray-500">Configure academic levels and assigned coaching batches</p>
        </div>
        {isEditMode ? (
          <button onClick={() => setShowStdModal(true)} className="btn-primary">
            + Add Standard
          </button>
        ) : (
          <button
            type="button"
            onClick={() => toast.error('Locked in View Mode: Please enable Edit Mode above to add standards.')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
            title="Locked in View Mode: Enable Edit Mode above to create new standard"
          >
            <Lock className="w-4 h-4 text-slate-400" />
            <span>Add Standard (Locked)</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Standards List */}
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Standards</h2>
            <div className="space-y-2">
              {standards.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No standards configured</p>
              ) : (
                standards.map((std: any) => (
                  <button
                    key={std.id}
                    onClick={() => setSelectedStdId(std.id === selectedStdId ? null : std.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                      selectedStdId === std.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{std.name}</p>
                        {std.description && <p className="text-xs text-primary-600 font-medium">{std.description}</p>}
                        {std.code && <p className="text-xs text-gray-500">{std.code}</p>}
                      </div>
                      <div className="text-right">
                        {std.student_count !== undefined ? (
                          <>
                            <p className="text-lg font-bold text-primary-600">{std.student_count}</p>
                            <p className="text-xs text-gray-400">students</p>
                          </>
                        ) : (
                          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-primary-50 text-primary-700">
                            Level {std.level ?? 1}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Batches */}
        <div className="lg:col-span-2">
          {selectedStdId ? (
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-semibold text-gray-900">
                  {selectedStd?.name} — Batches
                </h2>
                {isEditMode ? (
                  <button onClick={() => setShowDivModal(true)} className="btn-primary text-sm py-1.5">
                    + Add Batch
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => toast.error('Locked in View Mode: Please enable Edit Mode above to add batches.')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                    title="Locked in View Mode: Enable Edit Mode above to add batches"
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Add Batch (Locked)</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {divisions.length === 0 ? (
                  <p className="text-sm text-gray-400 col-span-2 text-center py-8">
                    No divisions for this standard.
                  </p>
                ) : (
                  divisions.map((div: any) => (
                    <div key={div.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">{div.name}</h3>
                          {div.room_number && (
                            <p className="text-sm text-gray-500">Room: {div.room_number}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary-600">
                            {div.student_count || 0}
                          </p>
                          <p className="text-xs text-gray-400">
                            / {div.capacity || 40} seats
                          </p>
                        </div>
                      </div>
                      {div.capacity && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Occupancy</span>
                            <span>
                              {Math.round(((div.student_count || 0) / div.capacity) * 100)}%
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                (div.student_count || 0) / div.capacity > 0.9
                                  ? 'bg-red-500'
                                  : (div.student_count || 0) / div.capacity > 0.7
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                              }`}
                              style={{
                                width: `${Math.min(
                                  ((div.student_count || 0) / div.capacity) * 100,
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="card flex items-center justify-center h-48 text-gray-400">
              <p>Select a standard to view its batches</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Standard Modal */}
      <Modal isOpen={showStdModal} onClose={() => setShowStdModal(false)} title="Add Standard">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Standard Name *</label>
            <input className="input" value={stdForm.name} onChange={(e) => setStdForm({ ...stdForm, name: e.target.value })} placeholder="e.g., Standard 1, Standard 10" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
            <input className="input" value={stdForm.code} onChange={(e) => setStdForm({ ...stdForm, code: e.target.value })} placeholder="e.g., STD1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
            <input type="number" className="input" value={stdForm.order_number} onChange={(e) => setStdForm({ ...stdForm, order_number: e.target.value })} placeholder="1" />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowStdModal(false)} className="btn-secondary">Cancel</button>
            <button
              onClick={() => stdMutation.mutate({ ...stdForm, institution_id: selectedInstitutionId, order_number: parseInt(stdForm.order_number) || 0 })}
              disabled={stdMutation.isPending || !stdForm.name}
              className="btn-primary"
            >
              {stdMutation.isPending ? 'Saving…' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Division Modal */}
      <Modal isOpen={showDivModal} onClose={() => setShowDivModal(false)} title={`Add Division to ${selectedStd?.name}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Division Name *</label>
            <input className="input" value={divForm.name} onChange={(e) => setDivForm({ ...divForm, name: e.target.value })} placeholder="e.g., A, B, C" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
            <input type="number" className="input" value={divForm.capacity} onChange={(e) => setDivForm({ ...divForm, capacity: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
            <input className="input" value={divForm.room_number} onChange={(e) => setDivForm({ ...divForm, room_number: e.target.value })} placeholder="e.g., Room 101" />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowDivModal(false)} className="btn-secondary">Cancel</button>
            <button
              onClick={() => divMutation.mutate({ ...divForm, standard_id: selectedStdId!, capacity: parseInt(divForm.capacity) })}
              disabled={divMutation.isPending || !divForm.name}
              className="btn-primary"
            >
              {divMutation.isPending ? 'Saving…' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

