/**
 * @file        HomeworkTemplatesTab.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.homework
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-12
 * @updated     2026-11-12
 *
 * @description Reusable Homework Templates Library allowing one-click cloning into the Create Assignment form.
 */

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Copy, Sparkles } from 'lucide-react'
import { homeworkApi } from '../../api/endpoints'

interface HomeworkTemplatesTabProps {
  onUseTemplate: (template: any) => void
}

export default function HomeworkTemplatesTab({ onUseTemplate }: HomeworkTemplatesTabProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['hw-templates'],
    queryFn: () => homeworkApi.listTemplates().then((r) => r.data),
  })
  const templates = data?.templates || []

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary-600" />
            <span>Reusable Homework &amp; Worksheet Templates</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Select a previously saved template to pre-fill title, instructions, submission rules, and marks.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading saved templates...</div>
      ) : templates.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No Homework Templates Saved Yet</h3>
          <p className="text-xs text-slate-500 mt-1">
            Enable "Save a reusable copy in Templates library" while creating any assignment.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl: any) => (
            <div
              key={tpl.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 uppercase">
                    {tpl.assignment_type || 'Homework'}
                  </span>
                  {tpl.max_marks && (
                    <span className="text-xs font-mono font-bold text-slate-600">
                      Max Marks: {tpl.max_marks}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {tpl.template_name || tpl.title}
                </h3>
                {tpl.topic && (
                  <p className="text-xs text-slate-500">Topic: {tpl.topic}</p>
                )}
                {tpl.description && (
                  <p className="text-xs text-slate-600 line-clamp-2">{tpl.description}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => onUseTemplate(tpl)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Use Template</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

