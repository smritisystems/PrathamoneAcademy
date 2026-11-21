/**
 * @file        FlexibleFilterBuilder.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.components.reports
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-21
 * @updated     2026-11-21
 *
 * @description Dynamic multi-operator condition filter builder supporting Equal to, Greater than, Smaller than, and Contains across any report field.
 */

import React, { useState, useMemo } from 'react'
import {
  Filter,
  Plus,
  X,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  AlertTriangle,
  Award,
  CircleDollarSign,
} from 'lucide-react'

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'greater_equal'
  | 'less_than'
  | 'less_equal'
  | 'contains'

export interface FieldDefinition {
  id: string
  label: string
  type: 'text' | 'number' | 'currency' | 'percentage' | 'select'
  options?: { label: string; value: any }[]
}

export interface FilterRule {
  id: string
  fieldId: string
  operator: FilterOperator
  value: any
}

export interface FlexibleFilterBuilderProps {
  fields: FieldDefinition[]
  rules: FilterRule[]
  onAddRule: (rule: FilterRule) => void
  onRemoveRule: (id: string) => void
  onClearAll: () => void
  dataCount: number
  totalCount: number
}

const OPERATOR_LABELS: Record<FilterOperator, string> = {
  equals: '= (Equal to)',
  not_equals: '≠ (Not Equal to)',
  greater_than: '> (Greater than)',
  greater_equal: '≥ (Greater or equal)',
  less_than: '< (Smaller than)',
  less_equal: '≤ (Smaller or equal)',
  contains: '∋ (Contains text)',
}

export default function FlexibleFilterBuilder({
  fields,
  rules,
  onAddRule,
  onRemoveRule,
  onClearAll,
  dataCount,
  totalCount,
}: FlexibleFilterBuilderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedFieldId, setSelectedFieldId] = useState<string>(fields[0]?.id || '')
  const [selectedOperator, setSelectedOperator] = useState<FilterOperator>('contains')
  const [inputValue, setInputValue] = useState<string>('')

  // Current field metadata
  const currentField = useMemo(() => {
    return fields.find((f) => f.id === selectedFieldId) || fields[0]
  }, [fields, selectedFieldId])

  // Available operators for the active field type
  const availableOperators = useMemo<FilterOperator[]>(() => {
    if (!currentField) return ['contains', 'equals']
    if (currentField.type === 'number' || currentField.type === 'currency' || currentField.type === 'percentage') {
      return ['equals', 'not_equals', 'greater_than', 'greater_equal', 'less_than', 'less_equal']
    }
    if (currentField.type === 'select') {
      return ['equals', 'not_equals']
    }
    return ['contains', 'equals', 'not_equals']
  }, [currentField])

  // Reset operator if current operator is invalid for the field
  const handleFieldChange = (newFieldId: string) => {
    setSelectedFieldId(newFieldId)
    const target = fields.find((f) => f.id === newFieldId)
    if (target?.type === 'number' || target?.type === 'currency' || target?.type === 'percentage') {
      setSelectedOperator('greater_than')
    } else if (target?.type === 'select') {
      setSelectedOperator('equals')
    } else {
      setSelectedOperator('contains')
    }
    setInputValue('')
  }

  const handleAddCondition = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() === '') return

    const newRule: FilterRule = {
      id: `${selectedFieldId}-${selectedOperator}-${Date.now()}`,
      fieldId: selectedFieldId,
      operator: selectedOperator,
      value:
        currentField.type === 'number' || currentField.type === 'currency' || currentField.type === 'percentage'
          ? Number(inputValue)
          : inputValue.trim(),
    }

    onAddRule(newRule)
    setInputValue('')
  }

  // Pre-set rule helper
  const handleApplyPreset = (preset: 'defaulters' | 'feeDues' | 'topPerformers') => {
    if (preset === 'defaulters') {
      onAddRule({
        id: `att-defaulter-${Date.now()}`,
        fieldId: 'attendance_percentage',
        operator: 'less_than',
        value: 75,
      })
    } else if (preset === 'feeDues') {
      onAddRule({
        id: `fee-dues-${Date.now()}`,
        fieldId: 'balance_fees',
        operator: 'greater_than',
        value: 0,
      })
    } else if (preset === 'topPerformers') {
      onAddRule({
        id: `top-perf-${Date.now()}`,
        fieldId: 'exam_percentage',
        operator: 'greater_equal',
        value: 85,
      })
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs mb-4 overflow-hidden transition-all">
      {/* Top Bar: Button & Preset Triggers */}
      <div className="p-3.5 bg-slate-50/70 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Main Filter Toggle Button */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
              isOpen || rules.length > 0
                ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-500/20'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Builder</span>
            {rules.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 bg-white text-primary-700 rounded-full text-[11px] font-extrabold">
                {rules.length}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Quick Preset Buttons */}
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Presets:
            </span>
            <button
              type="button"
              onClick={() => handleApplyPreset('defaulters')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 rounded-lg text-xs font-semibold transition-colors"
            >
              <AlertTriangle className="w-3 h-3 text-rose-500" />
              <span>Attendance &lt; 75%</span>
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('feeDues')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/60 rounded-lg text-xs font-semibold transition-colors"
            >
              <CircleDollarSign className="w-3 h-3 text-amber-500" />
              <span>Outstanding &gt; ₹0</span>
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('topPerformers')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 rounded-lg text-xs font-semibold transition-colors"
            >
              <Award className="w-3 h-3 text-emerald-500" />
              <span>Exam Score ≥ 85%</span>
            </button>
          </div>
        </div>

        {/* Counter & Clear All */}
        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
          <span>
            Matching <strong className="text-slate-800 font-bold">{dataCount}</strong> of{' '}
            <strong className="text-slate-800 font-bold">{totalCount}</strong> students
          </span>
          {rules.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-rose-600 font-semibold transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Filter Rule Form */}
      {isOpen && (
        <form onSubmit={handleAddCondition} className="p-4 bg-white border-b border-slate-200/80 animate-in fade-in duration-150">
          <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-primary-600" />
            <span>Add New Condition Filter:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
            {/* Field Selection */}
            <div className="sm:col-span-4">
              <label className="block text-[10.5px] font-bold text-slate-500 mb-1">Select Field</label>
              <select
                value={selectedFieldId}
                onChange={(e) => handleFieldChange(e.target.value)}
                className="w-full text-xs font-semibold text-slate-700 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
              >
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Operator Selection */}
            <div className="sm:col-span-3">
              <label className="block text-[10.5px] font-bold text-slate-500 mb-1">Operator</label>
              <select
                value={selectedOperator}
                onChange={(e) => setSelectedOperator(e.target.value as FilterOperator)}
                className="w-full text-xs font-semibold text-slate-700 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all font-mono"
              >
                {availableOperators.map((op) => (
                  <option key={op} value={op}>
                    {OPERATOR_LABELS[op]}
                  </option>
                ))}
              </select>
            </div>

            {/* Value Input */}
            <div className="sm:col-span-3">
              <label className="block text-[10.5px] font-bold text-slate-500 mb-1">Value</label>
              {currentField.type === 'select' && currentField.options ? (
                <select
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full text-xs font-semibold text-slate-700 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
                >
                  <option value="">Select value...</option>
                  {currentField.options.map((opt) => (
                    <option key={String(opt.value)} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={
                    currentField.type === 'number' || currentField.type === 'currency' || currentField.type === 'percentage'
                      ? 'number'
                      : 'text'
                  }
                  step="any"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={`Enter ${currentField.label.toLowerCase()}...`}
                  className="w-full text-xs font-semibold text-slate-700 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
                />
              )}
            </div>

            {/* Add Condition Button */}
            <div className="sm:col-span-2 pt-5 sm:pt-0">
              <button
                type="submit"
                disabled={inputValue.trim() === ''}
                className="w-full inline-flex items-center justify-center gap-1 px-3.5 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-200 text-white disabled:text-slate-400 text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Filter</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Active Rules Badge Chips */}
      {rules.length > 0 && (
        <div className="p-3 bg-white flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Rules:</span>
          {rules.map((rule) => {
            const field = fields.find((f) => f.id === rule.fieldId)
            const fieldLabel = field ? field.label : rule.fieldId
            return (
              <span
                key={rule.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 border border-primary-200 text-primary-900 rounded-full text-xs font-semibold shadow-2xs group"
              >
                <strong className="text-primary-700">{fieldLabel}</strong>
                <span className="font-mono text-[11px] text-primary-600 font-bold">
                  {OPERATOR_LABELS[rule.operator].split(' ')[0]}
                </span>
                <span className="bg-white/80 px-1.5 py-0.2 rounded font-bold text-slate-800">
                  {rule.value}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveRule(rule.id)}
                  title="Remove rule"
                  className="ml-0.5 text-primary-400 hover:text-rose-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
