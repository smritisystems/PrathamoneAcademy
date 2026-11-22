/**
 * @file        NepRoadmapModal.tsx
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
 * @created     2026-11-22
 * @updated     2026-11-22
 *
 * @description Lightweight NEP 2020 Alignment Roadmap Modal showcasing upcoming milestones: Competency-Based Test Analytics, Cross-Stream Modular Batching, and APAAR ID Support.
 */

import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  CheckCircle2,
  Bell,
  X,
  Layers,
  GraduationCap,
  ShieldCheck,
  BrainCircuit,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface NepRoadmapModalProps {
  isOpen: boolean
  onClose: () => void
}

export interface NepMilestone {
  id: string
  number: string
  title: string
  subtitle: string
  status: 'In Development' | 'Planned Phase 2' | 'Regulatory Sandbox'
  badgeColor: string
  icon: React.ComponentType<{ className?: string }>
  highlights: string[]
}

const NEP_MILESTONES: NepMilestone[] = [
  {
    id: 'competency-analytics',
    number: '01',
    title: 'Competency-Based Test Analytics',
    subtitle: "Moving beyond rote memorization into Bloom's taxonomy & conceptual mastery rubrics.",
    status: 'In Development',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: BrainCircuit,
    highlights: [
      "Bloom's taxonomy cognitive dimension tagging on question banks",
      'Individual student concept-gap heatmaps & remedial suggestions',
      'Holistic Progress Card (HPC) export format aligned with CBSE/NCERT',
    ],
  },
  {
    id: 'cross-stream-batching',
    number: '02',
    title: 'Cross-Stream Modular Batching',
    subtitle: 'Flexible subject combinations across traditional Science, Commerce, and Arts boundaries.',
    status: 'Planned Phase 2',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Layers,
    highlights: [
      'Multi-disciplinary batch allocations (e.g. Physics + Economics)',
      'Slot-matrix conflict shield for non-standard subject pairings',
      'Dynamic fee structures for personalized modular subject packages',
    ],
  },
  {
    id: 'apaar-id-integration',
    number: '03',
    title: 'APAAR ID & Academic Credit Bank Support',
    subtitle: 'Automated 12-digit Permanent Academic Account Registry & NCrF credit tracking.',
    status: 'Regulatory Sandbox',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: ShieldCheck,
    highlights: [
      'APAAR / EduLocker digital student identifier verification',
      'National Credit Framework (NCrF) instructional contact hour tracking',
      'Inter-institute student mobility & authenticated transfer dossiers',
    ],
  },
]

export default function NepRoadmapModal({ isOpen, onClose }: NepRoadmapModalProps) {
  const [isNotified, setIsNotified] = useState<boolean>(false)

  useEffect(() => {
    const saved = localStorage.getItem('prathamone_nep2020_notified') === 'true'
    setIsNotified(saved)
  }, [isOpen])

  if (!isOpen) return null

  const handleNotifyMe = () => {
    localStorage.setItem('prathamone_nep2020_notified', 'true')
    setIsNotified(true)
    toast.success("You're on the priority list for NEP 2020 updates!", {
      icon: '🎉',
      duration: 4000,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#071C44] via-[#0B2D6B] to-[#1E3A8A] text-white p-5 sm:p-6 relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-slate-950" />
              NEP 2020 Aligned
            </span>
            <span className="text-xs text-blue-200/80 font-mono">Future of Coaching</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            NEP 2020 Rollout Roadmap
          </h2>
          <p className="text-xs sm:text-sm text-blue-100/90 mt-1 max-w-lg leading-relaxed">
            Empowering your institute with progressive, competency-driven learning frameworks as national education policies evolve.
          </p>
        </div>

        {/* Milestone Cards Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            3 Core Innovation Milestones
          </p>

          <div className="space-y-3.5">
            {NEP_MILESTONES.map((milestone) => {
              const Icon = milestone.icon
              return (
                <div
                  key={milestone.id}
                  className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-blue-200 hover:shadow-xs transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-400">
                            {milestone.number}
                          </span>
                          <h3 className="text-sm font-bold text-slate-900">
                            {milestone.title}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                          {milestone.subtitle}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${milestone.badgeColor}`}
                    >
                      {milestone.status}
                    </span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
                    {milestone.highlights.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-tight">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Reassurance Disclaimer */}
          <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/60 text-xs text-blue-900 flex items-center gap-3">
            <GraduationCap className="w-5 h-5 text-blue-600 shrink-0" />
            <p className="leading-relaxed">
              <strong>Zero Disruption Promise:</strong> All NEP 2020 capabilities will be delivered as non-destructive in-place upgrades. Your existing batches, fees, and students will continue running seamlessly.
            </p>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            PrathamOne EduOS • Roadmap Preview
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNotifyMe}
              disabled={isNotified}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                isNotified
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                  : 'bg-primary-600 hover:bg-primary-700 text-white cursor-pointer'
              }`}
            >
              {isNotified ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Subscribed for Early Access ✓</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5" />
                  <span>Notify Me When Live</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
