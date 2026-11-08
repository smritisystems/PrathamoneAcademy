/**
 * @file        CrmSettingsPage.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.pages.crm
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-08
 * @updated     2026-11-08
 *
 * @description Dedicated CRM Configuration workspace managing pipeline stage workflows, follow-up SLA thresholds, lost reasons catalog, and isolated Training Mode reset controls.
 */

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Settings as SettingsIcon, Sliders, Clock, AlertTriangle, ShieldCheck,
  RotateCcw, Save, Plus, Trash2, CheckCircle2, FlaskConical, Layers,
  Bell, UserCheck, ShieldAlert
} from 'lucide-react'
import toast from 'react-hot-toast'
import { leadsApi } from '../../api/endpoints'
import type { CrmConfigSettings } from '../../types'
import { useEnvironmentStore } from '../../store/environmentStore'
import { useEditModeStore } from '../../store/editModeStore'
import { LockedButton } from '../../components/common'
import Modal from '../../components/Modal'
import CrmHeader from './CrmHeader'

export default function CrmSettingsPage() {
  const queryClient = useQueryClient()
  const { isTrainingMode, activeDatasetVersion } = useEnvironmentStore()
  const editScope = 'crm:leads'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])

  const [isResetConfirmModalOpen, setIsResetConfirmModalOpen] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  // Local Form State
  const [slaHours, setSlaHours] = useState<number>(24)
  const [lossReasons, setLossReasons] = useState<string[]>([])
  const [newReason, setNewReason] = useState('')
  const [channels, setChannels] = useState<string[]>([])
  const [newChannel, setNewChannel] = useState('')
  const [autoAssign, setAutoAssign] = useState(true)
  const [notifyEnquiry, setNotifyEnquiry] = useState(true)

  // Query CRM Config
  const { data: crmConfig, isLoading, refetch } = useQuery({
    queryKey: ['crm', 'settings-config'],
    queryFn: async () => (await leadsApi.getCrmConfig()).data,
    staleTime: 30000,
  })

  useEffect(() => {
    if (crmConfig) {
      setSlaHours(crmConfig.sla_follow_up_hours || 24)
      setLossReasons(crmConfig.loss_reasons || [])
      setChannels(crmConfig.source_channels || [])
      setAutoAssign(crmConfig.auto_assign_counsellor ?? true)
      setNotifyEnquiry(crmConfig.notify_on_new_enquiry ?? true)
    }
  }, [crmConfig])

  // Save Settings Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      return leadsApi.updateCrmConfig({
        sla_follow_up_hours: slaHours,
        loss_reasons: lossReasons,
        source_channels: channels,
        auto_assign_counsellor: autoAssign,
        notify_on_new_enquiry: notifyEnquiry,
      })
    },
    onSuccess: () => {
      toast.success('CRM workflow configuration saved successfully.')
      queryClient.invalidateQueries({ queryKey: ['crm'] })
      refetch()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to update CRM settings.')
    },
  })

  // Seed Demo Data Mutation
  const handleResetTrainingData = async () => {
    try {
      setIsResetting(true)
      const res = await leadsApi.seedDemo(true)
      toast.success(res.data?.message || 'Demo CRM dataset reset successfully.')
      setIsResetConfirmModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['crm'] })
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to reset demo dataset.')
    } finally {
      setIsResetting(false)
    }
  }

  const handleAddReason = () => {
    if (!newReason.trim()) return
    setLossReasons([...lossReasons, newReason.trim()])
    setNewReason('')
  }

  const handleRemoveReason = (idx: number) => {
    setLossReasons(lossReasons.filter((_, i) => i !== idx))
  }

  const handleAddChannel = () => {
    if (!newChannel.trim()) return
    setChannels([...channels, newChannel.trim()])
    setNewChannel('')
  }

  const handleRemoveChannel = (idx: number) => {
    setChannels(channels.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* ─── CRM HEADER ─────────────────────────────────────────────────── */}
      <CrmHeader
        title="Settings — CRM Configuration"
        subtitle="Manage admissions pipeline stages, follow-up SLA escalation windows, lost reasons catalog, and demo data environment."
        activeTab="settings"
        onRefresh={() => refetch()}
        extraActions={
          <LockedButton
            isEditMode={isEditMode}
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saveMutation.isPending ? 'Saving...' : 'Save Configuration'}</span>
          </LockedButton>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 7/12: Pipeline & SLA Configuration */}
        <div className="lg:col-span-7 space-y-5">
          {/* Follow-up SLA Section */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Clock className="w-4 h-4 text-primary-600" />
              <h3 className="text-sm font-black text-slate-900">Follow-up SLA & Escalation Threshold</h3>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Overdue Escalation Window (Hours)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={slaHours}
                  disabled={!isEditMode}
                  onChange={(e) => setSlaHours(Number(e.target.value))}
                  className="w-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 disabled:opacity-60"
                />
                <span className="text-xs text-slate-500">
                  Follow-ups without scheduled activity will be marked overdue after this window.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoAssign}
                  disabled={!isEditMode}
                  onChange={(e) => setAutoAssign(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-primary-600"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Auto-Assign Counsellors</span>
                  <span className="text-[11px] text-slate-500">Distribute new incoming website enquiries round-robin</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyEnquiry}
                  disabled={!isEditMode}
                  onChange={(e) => setNotifyEnquiry(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-primary-600"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Inquiry Notifications</span>
                  <span className="text-[11px] text-slate-500">Alert admissions desk on high-priority hot enquiries</span>
                </div>
              </label>
            </div>
          </div>

          {/* Lost Reasons Catalog */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <h3 className="text-sm font-black text-slate-900">Standard Lost Reasons Catalog</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">For Pareto Analytics</span>
            </div>

            <div className="space-y-2">
              {lossReasons.map((reason, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 text-xs">
                  <span className="font-semibold text-slate-800">{reason}</span>
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={() => handleRemoveReason(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {isEditMode && (
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Add new lost reason..."
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
                <button
                  type="button"
                  onClick={handleAddReason}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold"
                >
                  Add
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right 5/12: Channel Catalog & Training Mode Controls */}
        <div className="lg:col-span-5 space-y-5">
          {/* Acquisition Channels Catalog */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary-600" />
                <h3 className="text-sm font-black text-slate-900">Lead Acquisition Channels</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">{channels.length} channels</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {channels.map((ch, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200"
                >
                  <span>{ch}</span>
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={() => handleRemoveChannel(idx)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>

            {isEditMode && (
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Add source channel..."
                  value={newChannel}
                  onChange={(e) => setNewChannel(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
                <button
                  type="button"
                  onClick={handleAddChannel}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Training & Demo Environment Controls */}
          <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200 space-y-4">
            <div className="flex items-center gap-2 text-amber-900">
              <FlaskConical className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-black">Training & Demo Lab Environment</h3>
            </div>

            <p className="text-xs text-amber-800 leading-relaxed">
              PrathamOne EduOS isolates demo prospects and trial classes in a protected environment ({activeDatasetVersion}). Demo actions will never alter live student admissions or accounting records.
            </p>

            <div className="pt-2">
              <LockedButton
                isEditMode={isEditMode}
                onClick={() => setIsResetConfirmModalOpen(true)}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Demo CRM Dataset</span>
              </LockedButton>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MODAL: RESET DEMO DATASET CONFIRMATION ───────────────────────── */}
      {isResetConfirmModalOpen && (
        <Modal
          isOpen={isResetConfirmModalOpen}
          onClose={() => setIsResetConfirmModalOpen(false)}
          title="Reset CRM Demo Dataset?"
          size="sm"
        >
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                This will reset the isolated demo dataset to default sample enquiries, trial demo schedules, and follow-up activities. Live customer data remains unaffected.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsResetConfirmModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleResetTrainingData}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-xs disabled:opacity-50"
              >
                {isResetting ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

