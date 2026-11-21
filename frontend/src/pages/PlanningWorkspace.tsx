/**
 * @file        PlanningWorkspace.tsx
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
 * @created     2026-11-16
 * @updated     2026-11-21
 *
 * @description Unified, responsive planning workspace with calendar, Kanban, agenda, and timeline views.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, ArrowRight, CalendarDays, Clock3, GripVertical, KanbanSquare,
  Link2, X,
  ListTodo, Plus, RefreshCw, Rows3, Search, Timer,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  academicYearsApi,
  divisionsApi,
  examinationsApi,
  homeworkApi,
  leadsApi,
  planningApi,
  standardsApi,
  studentsApi,
  subjectsApi,
} from '../api/endpoints'
import { EditModeBar } from '../components/common'
import Modal from '../components/Modal'
import { hasPermission, useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import type { PlanningItem, PlanningPayload, PlanningReference, PlanningStatus } from '../types'
import {
  parsePlanningDateKey,
  planningDateKey,
  planningInstantFromWallTime,
  planningWallDateTime,
} from '../utils/planningDateTime'

type PlanningView = 'calendar' | 'week' | 'day' | 'kanban' | 'agenda' | 'timeline'
type FormValues = {
  title: string
  description: string
  activity_type: PlanningPayload['activity_type']
  category: PlanningPayload['category']
  start_at: string
  end_at: string
  due_at: string
  location: string
  all_day: boolean
  visibility: PlanningPayload['visibility']
  is_published: boolean
  priority: PlanningPayload['priority']
  academic_year_id: number | null
  division_id: number | null
  subject_id: number | null
  assignee_user_ids: number[]
  department_names: string[]
  references: PlanningReference[]
  recurrence_frequency: 'none' | 'daily' | 'weekly' | 'monthly'
  recurrence_interval: number
  recurrence_weekdays: number[]
  recurrence_until: string
}

const editScope = 'planning:workspace'
const statusColumns: Array<{ value: PlanningStatus; label: string }> = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Waiting / Blocked' },
  { value: 'completed', label: 'Completed' },
]
const calendarDateKey = (date: Date) => planningDateKey(date, 'UTC')
const calendarDateLabel = (date: Date, options: Intl.DateTimeFormatOptions) =>
  date.toLocaleDateString(undefined, { ...options, timeZone: 'UTC' })
const itemDateKey = (item: PlanningItem, fallbackTimeZone: string) => {
  if (item.occurrence_date) return item.occurrence_date
  const value = item.start_at || item.due_at
  return value ? planningDateKey(new Date(value), item.timezone || fallbackTimeZone) : ''
}
const referenceTypes = [
  ['student', 'Student'],
  ['lead', 'Admission lead'],
  ['fee_invoice', 'Fee invoice'],
  ['attendance', 'Attendance record'],
  ['academic_year', 'Academic year'],
  ['division', 'Class / batch'],
  ['subject', 'Subject'],
  ['examination', 'Examination'],
  ['timetable_entry', 'Timetable entry'],
  ['communication_log', 'Communication'],
  ['homework_assignment', 'Homework'],
] as const
const sourceLabels: Record<string, string> = {
  timetable_entry: 'Timetable',
  examination: 'Examination',
  homework_assignment: 'Homework',
  lead_follow_up: 'CRM follow-up',
  lead_demo_class: 'CRM demo class',
}
const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const views: Array<{ value: PlanningView; label: string; icon: typeof CalendarDays }> = [
  { value: 'calendar', label: 'Month', icon: CalendarDays },
  { value: 'week', label: 'Week', icon: CalendarDays },
  { value: 'day', label: 'Day', icon: CalendarDays },
  { value: 'kanban', label: 'Kanban', icon: KanbanSquare },
  { value: 'agenda', label: 'Agenda', icon: ListTodo },
  { value: 'timeline', label: 'Timeline', icon: Rows3 },
]

const formatDate = (value?: string | null, timeZone = 'Asia/Kolkata', options?: Intl.DateTimeFormatOptions) => {
  if (!value) return 'No date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No date'
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...options,
    timeZone,
  })
}

const initialForm = (academicYearId: number | null = null): FormValues => ({
  title: '',
  description: '',
  activity_type: 'task',
  category: 'administrative',
  start_at: '',
  end_at: '',
  due_at: '',
  location: '',
  all_day: false,
  visibility: 'institution',
  is_published: false,
  priority: 'normal',
  academic_year_id: academicYearId,
  division_id: null,
  subject_id: null,
  assignee_user_ids: [],
  department_names: [],
  references: [],
  recurrence_frequency: 'none',
  recurrence_interval: 1,
  recurrence_weekdays: [],
  recurrence_until: '',
})

function itemPayload(values: FormValues, timeZone: string, current?: PlanningItem): PlanningPayload {
  return {
    title: values.title.trim(),
    description: values.description.trim() || null,
    activity_type: values.activity_type,
    category: values.category,
    start_at: planningInstantFromWallTime(values.start_at, timeZone),
    end_at: planningInstantFromWallTime(values.end_at, timeZone),
    due_at: planningInstantFromWallTime(values.due_at, timeZone),
    timezone: timeZone,
    all_day: values.all_day,
    location: values.location.trim() || null,
    priority: values.priority,
    status: current?.status || 'backlog',
    visibility: values.visibility,
    is_published: values.is_published,
    academic_year_id: values.academic_year_id,
    division_id: values.division_id,
    subject_id: values.subject_id,
    assignee_user_ids: values.assignee_user_ids,
    department_names: values.department_names,
    references: values.references,
    recurrence: values.recurrence_frequency === 'none' ? null : {
      frequency: values.recurrence_frequency,
      interval: values.recurrence_interval,
      until: values.recurrence_until,
      weekdays: values.recurrence_weekdays,
    },
  }
}

const DRAG_TYPE_ACTIVITY = 'application/x-planning-activity'

type DragActivityData = {
  id: number | string
  key: string
  title: string
  is_recurrence: boolean
  occurrence_date?: string | null
  original_occurrence_date?: string | null
  start_at?: string | null
  end_at?: string | null
  timezone?: string | null
  version?: number | null
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`
}

function getItemDurationMinutes(item: PlanningItem): number | null {
  if (!item.start_at || !item.end_at) return null
  const start = new Date(item.start_at).getTime()
  const end = new Date(item.end_at).getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null
  return Math.round((end - start) / 60000)
}

function PlanningCard({
  item,
  timeZone,
  onClick,
  isEditMode = false,
  onDragStart,
  onAdjustDuration,
  showDurationControls = true,
}: {
  item: PlanningItem
  timeZone: string
  onClick: () => void
  isEditMode?: boolean
  onDragStart?: (event: React.DragEvent, item: PlanningItem) => void
  onAdjustDuration?: (item: PlanningItem, deltaMinutes: number, event: React.MouseEvent) => void
  showDurationControls?: boolean
}) {
  const sourceLabel = sourceLabels[item.source_type] || 'Linked record'
  const durationMinutes = getItemDurationMinutes(item)
  const canDrag = isEditMode && item.editable

  return (
    <div
      role="article"
      tabIndex={0}
      aria-label={item.title}
      draggable={canDrag}
      onDragStart={(event) => {
        if (canDrag && onDragStart) {
          onDragStart(event, item)
        }
      }}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
      className={`group relative w-full rounded-lg border bg-white p-3 text-left shadow-sm transition select-none ${
        canDrag
          ? 'cursor-grab border-slate-200 active:cursor-grabbing hover:border-indigo-400 hover:shadow-md'
          : 'cursor-pointer border-slate-200 hover:border-indigo-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-1.5 min-w-0">
          {canDrag && (
            <span
              className="mt-0.5 shrink-0 text-slate-300 group-hover:text-slate-500"
              title="Drag to reschedule"
              aria-hidden="true"
            >
              <GripVertical className="h-4 w-4" />
            </span>
          )}
          <span className="line-clamp-2 text-sm font-semibold text-slate-800">{item.title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {item.is_rescheduled && (
            <span
              className="inline-flex items-center gap-0.5 rounded border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900"
              title={item.original_occurrence_date ? `Rescheduled from ${item.original_occurrence_date}` : 'Rescheduled'}
            >
              <Clock3 className="h-2.5 w-2.5 text-amber-700" />
              Rescheduled
            </span>
          )}
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
            !item.editable ? 'bg-indigo-50 text-indigo-700'
              : item.priority === 'urgent' ? 'bg-rose-100 text-rose-700'
                : item.priority === 'high' ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-600'
          }`}>{item.editable ? item.priority : sourceLabel}</span>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span>{formatDate(item.start_at || item.due_at, item.timezone || timeZone)}</span>
        {durationMinutes !== null && (
          <span className="inline-flex items-center gap-1 font-medium text-slate-600">
            <Timer className="h-3 w-3 text-slate-400" />
            {formatDuration(durationMinutes)}
          </span>
        )}
        {item.assignees.length > 0 && <span>{item.assignees.map((person) => person.name).join(', ')}</span>}
        {!item.editable && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">Read-only source</span>}
      </div>

      {isEditMode && item.editable && showDurationControls && durationMinutes !== null && onAdjustDuration && (
        <div
          className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2"
          onClick={(event) => event.stopPropagation()}
        >
          <span className="text-[10px] font-medium text-slate-500">Duration ({formatDuration(durationMinutes)})</span>
          <div className="flex items-center gap-1">
            {durationMinutes > 30 && (
              <button
                type="button"
                aria-label={`Decrease duration of ${item.title} by 30 minutes`}
                onClick={(event) => onAdjustDuration(item, -30, event)}
                className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-200 active:scale-95 transition"
              >
                -30m
              </button>
            )}
            {durationMinutes > 15 && (
              <button
                type="button"
                aria-label={`Decrease duration of ${item.title} by 15 minutes`}
                onClick={(event) => onAdjustDuration(item, -15, event)}
                className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-200 active:scale-95 transition"
              >
                -15m
              </button>
            )}
            <button
              type="button"
              aria-label={`Increase duration of ${item.title} by 15 minutes`}
              onClick={(event) => onAdjustDuration(item, 15, event)}
              className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100 active:scale-95 transition"
            >
              +15m
            </button>
            <button
              type="button"
              aria-label={`Increase duration of ${item.title} by 30 minutes`}
              onClick={(event) => onAdjustDuration(item, 30, event)}
              className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100 active:scale-95 transition"
            >
              +30m
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PlanningWorkspace() {
  const queryClient = useQueryClient()
  const { selectedInstitutionId, selectedAcademicYearId, user } = useAuthStore()
  const isEditMode = useEditModeStore((state) => !!state.scopes[editScope])
  const [searchParams, setSearchParams] = useSearchParams()
  const viewParam = searchParams.get('view') as PlanningView | null
  const isValidView = (v: string | null): v is PlanningView =>
    v !== null && ['calendar', 'week', 'day', 'kanban', 'agenda', 'timeline'].includes(v)

  const [view, setView] = useState<PlanningView>(() => {
    if (isValidView(viewParam)) {
      return viewParam
    }
    if (typeof window !== 'undefined' && window.matchMedia?.('(min-width: 768px)').matches) {
      return 'calendar'
    }
    return 'agenda'
  })

  // Synchronize view state if URL query param changes
  useEffect(() => {
    if (isValidView(viewParam) && viewParam !== view) {
      setView(viewParam)
    }
  }, [viewParam])

  const handleSelectView = (newView: PlanningView) => {
    setView(newView)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('view', newView)
      return next
    }, { replace: true })
  }
  const [focusDate, setFocusDate] = useState(() =>
    parsePlanningDateKey(planningDateKey(new Date(), 'Asia/Kolkata')),
  )
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [activeItem, setActiveItem] = useState<PlanningItem | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PlanningItem | null>(null)
  const [form, setForm] = useState<FormValues>(() => initialForm(selectedAcademicYearId))
  const [historyOpen, setHistoryOpen] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [attachmentToRemove, setAttachmentToRemove] = useState<number | null>(null)
  const [referenceType, setReferenceType] = useState<(typeof referenceTypes)[number][0]>('student')
  const [referenceId, setReferenceId] = useState('')
  const [pickerSearchQuery, setPickerSearchQuery] = useState('')
  const [manualIdMode, setManualIdMode] = useState(false)
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false)
  const [rescheduleForm, setRescheduleForm] = useState({
    date: '',
    startTime: '09:00',
    endTime: '10:00',
  })
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null)

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)')
    const updateView = () => {
      if (!isValidView(viewParam)) {
        setView((current) => current === 'agenda' && media.matches ? 'calendar' : current)
      }
    }
    media.addEventListener('change', updateView)
    return () => media.removeEventListener('change', updateView)
  }, [viewParam])

  const { startDate, endDate, calendarDays } = useMemo(() => {
    if (view === 'day') {
      const current = new Date(focusDate)
      return { startDate: current, endDate: current, calendarDays: [current] }
    }
    if (view === 'week') {
      const first = new Date(focusDate)
      first.setUTCDate(first.getUTCDate() - first.getUTCDay())
      const days = Array.from({ length: 7 }, (_, index) => {
        const day = new Date(first)
        day.setUTCDate(first.getUTCDate() + index)
        return day
      })
      return { startDate: days[0], endDate: days[6], calendarDays: days }
    }
    if (view === 'calendar') {
      const firstOfMonth = new Date(Date.UTC(focusDate.getUTCFullYear(), focusDate.getUTCMonth(), 1))
      const first = new Date(firstOfMonth)
      first.setUTCDate(first.getUTCDate() - first.getUTCDay())
      const days = Array.from({ length: 42 }, (_, index) => {
        const day = new Date(first)
        day.setUTCDate(first.getUTCDate() + index)
        return day
      })
      return { startDate: days[0], endDate: days[41], calendarDays: days }
    }
    const first = new Date(focusDate)
    first.setUTCDate(first.getUTCDate() - 7)
    const last = new Date(focusDate)
    last.setUTCDate(last.getUTCDate() + 30)
    return { startDate: first, endDate: last, calendarDays: [] }
  }, [focusDate, view])

  const queryParams = useMemo(() => ({
    start: calendarDateKey(startDate),
    end: calendarDateKey(endDate),
    include_sources: view !== 'kanban',
    include_cancelled: statusFilter === 'cancelled',
    institution_id: selectedInstitutionId || undefined,
  }), [startDate, endDate, selectedInstitutionId, statusFilter, view])

  const { data: activitiesResponse, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['planning-activities', queryParams],
    queryFn: () => planningApi.listActivities(queryParams),
    staleTime: 60_000,
    gcTime: 300_000,
    placeholderData: (prev) => prev,
  })
  const timeZone = activitiesResponse?.data.timezone || 'Asia/Kolkata'
  const prevTimeZoneRef = useRef(timeZone)
  useEffect(() => {
    if (prevTimeZoneRef.current !== timeZone) {
      prevTimeZoneRef.current = timeZone
      setFocusDate(parsePlanningDateKey(planningDateKey(new Date(), timeZone)))
    }
  }, [timeZone])
  useEffect(() => {
    setConfirmCancel(false)
    setAttachmentToRemove(null)
    setHistoryOpen(false)
  }, [activeItem?.key])

  const { data: assigneesResponse } = useQuery({
    queryKey: ['planning-assignees'],
    queryFn: () => planningApi.getAssignees(),
    enabled: isEditMode,
  })
  const { data: academicYearsResponse, isLoading: isAcademicYearsLoading, isError: isAcademicYearsError } = useQuery({
    queryKey: ['planning-academic-years', selectedInstitutionId],
    queryFn: () => academicYearsApi.list(selectedInstitutionId ?? undefined),
    enabled: formOpen,
    staleTime: 300_000,
  })
  const { data: standardsResponse, isLoading: areStandardsLoading, isError: areStandardsError } = useQuery({
    queryKey: ['planning-standards', selectedInstitutionId],
    queryFn: () => standardsApi.list({ institution_id: selectedInstitutionId ?? undefined }),
    enabled: formOpen,
    staleTime: 300_000,
  })
  const standards = standardsResponse?.data || []
  const standardIds = useMemo(() => new Set(standards.map((standard) => standard.id)), [standards])
  const { data: divisionsResponse, isLoading: areDivisionsLoading, isError: areDivisionsError } = useQuery({
    queryKey: ['planning-divisions', selectedInstitutionId],
    queryFn: () => divisionsApi.list(),
    enabled: formOpen,
    staleTime: 300_000,
  })
  const divisions = (divisionsResponse?.data || []).filter((division) => standardIds.has(division.standard_id))
  const selectedDivision = divisions.find((division) => division.id === form.division_id)
  const { data: subjectsResponse, isLoading: areSubjectsLoading, isError: areSubjectsError } = useQuery({
    queryKey: ['planning-subjects', selectedInstitutionId, selectedDivision?.standard_id],
    queryFn: () => subjectsApi.list({ standard_id: selectedDivision!.standard_id }),
    enabled: formOpen && !!selectedDivision,
    staleTime: 300_000,
  })

  const { data: studentSearchResults, isFetching: isSearchingStudents } = useQuery({
    queryKey: ['planning-search-students', pickerSearchQuery],
    queryFn: async () => {
      const res = await studentsApi.list({ search: pickerSearchQuery.trim(), page_size: 8 })
      return res.data?.data || []
    },
    enabled: formOpen && referenceType === 'student' && !manualIdMode && pickerSearchQuery.trim().length >= 1,
    staleTime: 30000,
  })

  const { data: leadSearchResults, isFetching: isSearchingLeads } = useQuery({
    queryKey: ['planning-search-leads', pickerSearchQuery],
    queryFn: async () => {
      const res = await leadsApi.getLeads({ search: pickerSearchQuery.trim(), limit: 8 })
      return res.data?.items || []
    },
    enabled: formOpen && referenceType === 'lead' && !manualIdMode && pickerSearchQuery.trim().length >= 1,
    staleTime: 30000,
  })

  const { data: examSearchResults, isFetching: isSearchingExams } = useQuery({
    queryKey: ['planning-search-exams', selectedInstitutionId],
    queryFn: async () => {
      const res = await examinationsApi.list()
      return Array.isArray(res.data) ? res.data : []
    },
    enabled: formOpen && referenceType === 'examination' && !manualIdMode,
    staleTime: 60000,
  })

  const { data: hwSearchResults, isFetching: isSearchingHw } = useQuery({
    queryKey: ['planning-search-hw', pickerSearchQuery],
    queryFn: async () => {
      const res = await homeworkApi.listAssignments({ search: pickerSearchQuery.trim(), limit: 8 })
      return res.data?.items || []
    },
    enabled: formOpen && referenceType === 'homework_assignment' && !manualIdMode && pickerSearchQuery.trim().length >= 1,
    staleTime: 30000,
  })

  const addReference = (sourceType: string, sourceRecordId: number, label?: string) => {
    if (!Number.isSafeInteger(sourceRecordId) || sourceRecordId < 1) {
      toast.error('Enter a valid linked record ID.')
      return
    }
    if (form.references.some((reference) => reference.source_type === sourceType && reference.source_record_id === sourceRecordId)) {
      toast.error('That record is already linked.')
      return
    }
    setForm({
      ...form,
      references: [
        ...form.references,
        {
          source_type: sourceType,
          source_record_id: sourceRecordId,
          label: label || undefined,
        },
      ],
    })
    setReferenceId('')
    setPickerSearchQuery('')
  }
  const { data: historyResponse, isFetching: isHistoryLoading, refetch: loadHistory } = useQuery({
    queryKey: ['planning-history', activeItem?.source_id],
    queryFn: () => planningApi.getHistory(Number(activeItem!.source_id)),
    enabled: false,
  })
  const items = activitiesResponse?.data.items || []
  const filteredItems = useMemo(() => items.filter((item) => {
    if (statusFilter !== 'all' && (!item.editable || item.status !== statusFilter)) return false
    if (typeFilter !== 'all' && item.activity_type !== typeFilter) return false
    const normalized = search.trim().toLowerCase()
    return !normalized || `${item.title} ${item.description || ''} ${item.assignees.map((a) => a.name).join(' ')}`
      .toLowerCase().includes(normalized)
  }), [items, search, statusFilter, typeFilter])

  const itemsByDateKey = useMemo(() => {
    const map = new Map<string, PlanningItem[]>()
    for (const item of filteredItems) {
      const key = itemDateKey(item, timeZone)
      if (key) {
        let list = map.get(key)
        if (!list) {
          list = []
          map.set(key, list)
        }
        list.push(item)
      }
    }
    return map
  }, [filteredItems, timeZone])

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['planning-activities'] })
    queryClient.invalidateQueries({ queryKey: ['planning-task-summary'] })
  }

  const { data: taskSummary } = useQuery({
    queryKey: ['planning-task-summary', selectedInstitutionId],
    queryFn: async () => {
      const res = await planningApi.getTasksSummary(selectedInstitutionId || undefined)
      return res.data
    },
    enabled: !!selectedInstitutionId,
  })

  const syncAllMutation = useMutation({
    mutationFn: async () => {
      const res = await planningApi.syncAllTasks(selectedInstitutionId || undefined, selectedAcademicYearId || undefined)
      return res.data
    },
    onSuccess: (data) => {
      toast.success(
        `Operational Sync: ${data.total_created} new task(s) created, ${data.total_already_active} active across Fees, Homework, Timetable & Truancy.`
      )
      refresh()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to sync institutional tasks.')
    },
  })

  const createMutation = useMutation({
    mutationFn: (payload: PlanningPayload) => planningApi.createActivity(payload),
    onSuccess: () => {
      toast.success('Activity created.')
      setFormOpen(false)
      setForm(initialForm(selectedAcademicYearId))
      refresh()
    },
    onError: (error: any) => toast.error(error.response?.data?.detail?.message || error.response?.data?.detail || 'Could not create activity.'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ item, payload }: { item: PlanningItem; payload: PlanningPayload }) =>
      planningApi.updateActivity(Number(item.source_id), {
        ...payload,
        expected_version: item.version || 1,
      }),
    onSuccess: (response) => {
      toast.success('Activity updated.')
      setActiveItem(response.data.item)
      setFormOpen(false)
      setEditingItem(null)
      refresh()
    },
    onError: (error: any) => toast.error(error.response?.data?.detail?.message || error.response?.data?.detail || 'Could not update activity.'),
  })
  const statusMutation = useMutation({
    mutationFn: ({ item, status }: { item: PlanningItem; status: PlanningStatus }) =>
      planningApi.transitionActivity(Number(item.source_id), { status, expected_version: item.version || 1 }),
    onMutate: async ({ item, status }) => {
      await queryClient.cancelQueries({ queryKey: ['planning-activities'] })
      const previousData = queryClient.getQueriesData({ queryKey: ['planning-activities'] })
      queryClient.setQueriesData({ queryKey: ['planning-activities'] }, (old: any) => {
        if (!old?.data?.items) return old
        return {
          ...old,
          data: {
            ...old.data,
            items: old.data.items.map((i: PlanningItem) => {
              if (i.key === item.key || (i.source_type === 'activity' && Number(i.source_id) === Number(item.source_id))) {
                return { ...i, status }
              }
              return i
            }),
          },
        }
      })
      return { previousData }
    },
    onError: (error: any, _variables, context) => {
      if (context?.previousData) {
        for (const [key, val] of context.previousData) {
          queryClient.setQueryData(key, val)
        }
      }
      toast.error(error.response?.data?.detail || 'Could not update status.')
    },
    onSuccess: () => {
      toast.success('Activity status updated.')
      setActiveItem(null)
    },
    onSettled: () => {
      refresh()
    },
  })
  const cancelOccurrenceMutation = useMutation({
    mutationFn: async ({ item, occurrenceDate }: { item: PlanningItem; occurrenceDate: string }) => {
      return planningApi.cancelOccurrence(Number(item.source_id), occurrenceDate)
    },
    onSuccess: () => {
      toast.success('Occurrence cancelled.')
      setConfirmCancel(false)
      setActiveItem(null)
      refresh()
    },
    onError: (error: any) => toast.error(error.response?.data?.detail || 'Could not cancel occurrence.'),
  })
  const cancelSeriesMutation = useMutation({
    mutationFn: async (item: PlanningItem) => {
      return planningApi.cancelActivity(Number(item.source_id))
    },
    onSuccess: () => {
      toast.success('Activity cancelled.')
      setConfirmCancel(false)
      setActiveItem(null)
      refresh()
    },
    onError: (error: any) => toast.error(error.response?.data?.detail || 'Could not cancel activity.'),
  })
  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      if (!activeItem || !activeItem.occurrence_date) return
      const itemTimeZone = activeItem.timezone || timeZone
      const originalOccDate = activeItem.original_occurrence_date || activeItem.occurrence_date
      const startIso = planningInstantFromWallTime(`${rescheduleForm.date}T${rescheduleForm.startTime}`, itemTimeZone)
      const endIso = rescheduleForm.endTime
        ? planningInstantFromWallTime(`${rescheduleForm.date}T${rescheduleForm.endTime}`, itemTimeZone)
        : undefined
      if (!startIso) return
      return planningApi.rescheduleOccurrence(Number(activeItem.source_id), {
        occurrence_date: originalOccDate,
        rescheduled_start_at: startIso,
        rescheduled_end_at: endIso || undefined,
      })
    },
    onSuccess: () => {
      toast.success('Occurrence rescheduled.')
      setRescheduleModalOpen(false)
      setActiveItem(null)
      refresh()
    },
    onError: (error: any) => {
      const msg = error.response?.data?.detail?.message || error.response?.data?.detail || 'Could not reschedule occurrence.'
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg))
    },
  })
  const restoreOccurrenceMutation = useMutation({
    mutationFn: async ({ item }: { item: PlanningItem }) => {
      const occDate = item.original_occurrence_date || item.occurrence_date!
      return planningApi.deleteOccurrenceException(Number(item.source_id), occDate)
    },
    onSuccess: () => {
      toast.success('Occurrence restored to original recurring schedule.')
      setActiveItem(null)
      refresh()
    },
    onError: (error: any) => {
      const msg = error.response?.data?.detail || 'Could not restore occurrence.'
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg))
    },
  })
  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: number) => planningApi.deleteAttachment(attachmentId),
    onSuccess: (response, attachmentId) => {
      toast.success('Attachment removed.')
      setAttachmentToRemove(null)
      setActiveItem((current) => current ? {
        ...current,
        attachments: current.attachments.filter((attachment) => attachment.id !== attachmentId),
        version: response.data.version,
      } : current)
      refresh()
    },
    onError: (error: any) => toast.error(error.response?.data?.detail || 'Could not remove attachment.'),
  })

  const rescheduleOccurrenceMutation = useMutation({
    mutationFn: async ({
      activityId,
      occurrenceDate,
      startIso,
      endIso,
    }: {
      activityId: number
      occurrenceDate: string
      startIso: string
      endIso?: string
    }) => {
      return planningApi.rescheduleOccurrence(activityId, {
        occurrence_date: occurrenceDate,
        rescheduled_start_at: startIso,
        rescheduled_end_at: endIso,
      })
    },
    onMutate: async ({ activityId, occurrenceDate, startIso, endIso }) => {
      await queryClient.cancelQueries({ queryKey: ['planning-activities'] })
      const previousData = queryClient.getQueriesData({ queryKey: ['planning-activities'] })
      queryClient.setQueriesData({ queryKey: ['planning-activities'] }, (old: any) => {
        if (!old?.data?.items) return old
        return {
          ...old,
          data: {
            ...old.data,
            items: old.data.items.map((i: PlanningItem) => {
              if (
                Number(i.source_id) === activityId &&
                (i.occurrence_date === occurrenceDate || i.original_occurrence_date === occurrenceDate)
              ) {
                return {
                  ...i,
                  start_at: startIso,
                  end_at: endIso || null,
                  is_rescheduled: true,
                  original_occurrence_date: i.original_occurrence_date || occurrenceDate,
                }
              }
              return i
            }),
          },
        }
      })
      return { previousData }
    },
    onError: (error: any, _variables, context) => {
      if (context?.previousData) {
        for (const [key, val] of context.previousData) {
          queryClient.setQueryData(key, val)
        }
      }
      const msg = error.response?.data?.detail?.message || error.response?.data?.detail || 'Could not reschedule occurrence.'
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg))
    },
    onSettled: () => {
      refresh()
    },
  })

  const rescheduleActivityMutation = useMutation({
    mutationFn: async ({
      activityId,
      expectedVersion,
      startIso,
      endIso,
    }: {
      activityId: number
      expectedVersion: number
      startIso?: string
      endIso?: string
    }) => {
      return planningApi.updateActivity(activityId, {
        expected_version: expectedVersion,
        ...(startIso ? { start_at: startIso } : {}),
        ...(endIso ? { end_at: endIso } : {}),
      })
    },
    onMutate: async ({ activityId, startIso, endIso }) => {
      await queryClient.cancelQueries({ queryKey: ['planning-activities'] })
      const previousData = queryClient.getQueriesData({ queryKey: ['planning-activities'] })
      queryClient.setQueriesData({ queryKey: ['planning-activities'] }, (old: any) => {
        if (!old?.data?.items) return old
        return {
          ...old,
          data: {
            ...old.data,
            items: old.data.items.map((i: PlanningItem) => {
              if (Number(i.source_id) === activityId && i.source_type === 'activity') {
                return {
                  ...i,
                  start_at: startIso !== undefined ? startIso : i.start_at,
                  end_at: endIso !== undefined ? endIso : i.end_at,
                  version: (i.version || 1) + 1,
                }
              }
              return i
            }),
          },
        }
      })
      return { previousData }
    },
    onError: (error: any, _variables, context) => {
      if (context?.previousData) {
        for (const [key, val] of context.previousData) {
          queryClient.setQueryData(key, val)
        }
      }
      const msg = error.response?.data?.detail?.message || error.response?.data?.detail || 'Could not update activity schedule.'
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg))
    },
    onSettled: () => {
      refresh()
    },
  })

  const handleDragStart = (event: React.DragEvent, item: PlanningItem) => {
    if (!isEditMode || !item.editable) {
      event.preventDefault()
      return
    }
    const payload: DragActivityData = {
      id: item.source_id,
      key: item.key,
      title: item.title,
      is_recurrence: !!item.recurrence,
      occurrence_date: item.occurrence_date || null,
      original_occurrence_date: item.original_occurrence_date || null,
      start_at: item.start_at || null,
      end_at: item.end_at || null,
      timezone: item.timezone || timeZone,
      version: item.version,
    }
    event.dataTransfer.setData(DRAG_TYPE_ACTIVITY, JSON.stringify(payload))
    event.dataTransfer.setData('text/plain', item.title)
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (event: React.DragEvent, targetId: string) => {
    if (!isEditMode) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (dragOverTarget !== targetId) {
      setDragOverTarget(targetId)
    }
  }

  const handleDragLeave = (event: React.DragEvent, targetId: string) => {
    if (dragOverTarget === targetId) {
      setDragOverTarget(null)
    }
  }

  const handleDropOnDate = async (targetDateKey: string, event: React.DragEvent) => {
    event.preventDefault()
    setDragOverTarget(null)
    if (!isEditMode) return

    const raw = event.dataTransfer.getData(DRAG_TYPE_ACTIVITY)
    if (!raw) return

    try {
      const dragged: DragActivityData = JSON.parse(raw)
      const itemTz = dragged.timezone || timeZone
      const startWall = planningWallDateTime(dragged.start_at, itemTz)
      const endWall = planningWallDateTime(dragged.end_at, itemTz)
      const currentDateKey = startWall ? startWall.slice(0, 10) : (dragged.occurrence_date || '')

      if (currentDateKey === targetDateKey) return

      const startTimePart = startWall && startWall.length >= 16 ? startWall.slice(11, 16) : '09:00'
      const endTimePart = endWall && endWall.length >= 16 ? endWall.slice(11, 16) : '10:00'

      const newStartIso = planningInstantFromWallTime(`${targetDateKey}T${startTimePart}`, itemTz)
      const newEndIso = planningInstantFromWallTime(`${targetDateKey}T${endTimePart}`, itemTz)
      if (!newStartIso) return

      if (dragged.is_recurrence) {
        const originalOccDate = dragged.original_occurrence_date || dragged.occurrence_date
        if (!originalOccDate) return
        await rescheduleOccurrenceMutation.mutateAsync({
          activityId: Number(dragged.id),
          occurrenceDate: originalOccDate,
          startIso: newStartIso,
          endIso: newEndIso || undefined,
        })
        toast.success(`Occurrence rescheduled to ${targetDateKey}.`)
      } else {
        await rescheduleActivityMutation.mutateAsync({
          activityId: Number(dragged.id),
          expectedVersion: dragged.version || 1,
          startIso: newStartIso,
          endIso: newEndIso || undefined,
        })
        toast.success(`Activity rescheduled to ${targetDateKey}.`)
      }
    } catch (err) {}
  }

  const handleDropOnHourSlot = async (hourString: string, event: React.DragEvent) => {
    event.preventDefault()
    setDragOverTarget(null)
    if (!isEditMode) return

    const raw = event.dataTransfer.getData(DRAG_TYPE_ACTIVITY)
    if (!raw) return

    try {
      const dragged: DragActivityData = JSON.parse(raw)
      const itemTz = dragged.timezone || timeZone
      const targetDateKey = calendarDateKey(focusDate)

      const durationMs = (dragged.start_at && dragged.end_at)
        ? new Date(dragged.end_at).getTime() - new Date(dragged.start_at).getTime()
        : 60 * 60 * 1000

      const newStartIso = planningInstantFromWallTime(`${targetDateKey}T${hourString}`, itemTz)
      if (!newStartIso) return
      const newEndIso = new Date(new Date(newStartIso).getTime() + durationMs).toISOString()

      if (dragged.is_recurrence) {
        const originalOccDate = dragged.original_occurrence_date || dragged.occurrence_date
        if (!originalOccDate) return
        await rescheduleOccurrenceMutation.mutateAsync({
          activityId: Number(dragged.id),
          occurrenceDate: originalOccDate,
          startIso: newStartIso,
          endIso: newEndIso,
        })
        toast.success(`Occurrence moved to ${hourString}.`)
      } else {
        await rescheduleActivityMutation.mutateAsync({
          activityId: Number(dragged.id),
          expectedVersion: dragged.version || 1,
          startIso: newStartIso,
          endIso: newEndIso,
        })
        toast.success(`Activity moved to ${hourString}.`)
      }
    } catch (err) {}
  }

  const handleAdjustDuration = async (item: PlanningItem, deltaMinutes: number, event: React.MouseEvent) => {
    event.stopPropagation()
    if (!isEditMode) {
      toast.error('Enable Edit Mode to resize activity duration.')
      return
    }
    if (!item.editable) {
      toast.error('This activity is read-only.')
      return
    }
    const currentMinutes = getItemDurationMinutes(item)
    if (currentMinutes === null || !item.start_at) {
      toast.error('Activity does not have a measurable duration.')
      return
    }
    const targetMinutes = currentMinutes + deltaMinutes
    if (targetMinutes < 15) {
      toast.error('Duration must be at least 15 minutes.')
      return
    }
    if (targetMinutes > 24 * 60) {
      toast.error('Duration cannot exceed 24 hours.')
      return
    }
    const newEndIso = new Date(new Date(item.start_at).getTime() + targetMinutes * 60000).toISOString()
    if (item.recurrence) {
      const originalOccDate = item.original_occurrence_date || item.occurrence_date!
      await rescheduleOccurrenceMutation.mutateAsync({
        activityId: Number(item.source_id),
        occurrenceDate: originalOccDate,
        startIso: item.start_at,
        endIso: newEndIso,
      })
      toast.success(`Duration updated to ${formatDuration(targetMinutes)}.`)
    } else {
      await rescheduleActivityMutation.mutateAsync({
        activityId: Number(item.source_id),
        expectedVersion: item.version || 1,
        endIso: newEndIso,
      })
      toast.success(`Duration updated to ${formatDuration(targetMinutes)}.`)
    }
  }

  const openCreate = () => {
    if (!isEditMode) {
      toast.error('Enable Edit Mode before creating an activity.')
      return
    }
    setEditingItem(null)
    setForm(initialForm(selectedAcademicYearId))
    setReferenceId('')
    setPickerSearchQuery('')
    setManualIdMode(false)
    setFormOpen(true)
  }

  const openEdit = (item: PlanningItem) => {
    if (!isEditMode || !item.editable) return
    setEditingItem(item)
    setActiveItem(null)
    setConfirmCancel(false)
    setAttachmentToRemove(null)
    setReferenceId('')
    setPickerSearchQuery('')
    setManualIdMode(false)
    const itemTimeZone = item.timezone || timeZone
    setForm({
      title: item.title,
      description: item.description || '',
      activity_type: item.activity_type,
      category: item.category as FormValues['category'],
      start_at: planningWallDateTime(item.start_at, itemTimeZone),
      end_at: planningWallDateTime(item.end_at, itemTimeZone),
      due_at: planningWallDateTime(item.due_at, itemTimeZone),
      location: item.location || '',
      all_day: item.all_day,
      visibility: item.visibility,
      is_published: item.is_published,
      priority: item.priority,
      academic_year_id: item.academic_year_id ?? null,
      division_id: item.division_id ?? null,
      subject_id: item.subject_id ?? null,
      assignee_user_ids: item.assignees.map((assignee) => assignee.user_id),
      department_names: [],
      references: item.references,
      recurrence_frequency: item.recurrence?.frequency || 'none',
      recurrence_interval: item.recurrence?.interval || 1,
      recurrence_weekdays: item.recurrence?.weekdays || [],
      recurrence_until: item.recurrence?.until || '',
    })
    setFormOpen(true)
  }

  const openRescheduleModal = (item: PlanningItem) => {
    const itemTimeZone = item.timezone || timeZone
    const currentStartWall = planningWallDateTime(item.start_at, itemTimeZone)
    const currentEndWall = planningWallDateTime(item.end_at, itemTimeZone)
    const occDate = item.occurrence_date || (currentStartWall.length >= 10 ? currentStartWall.slice(0, 10) : planningDateKey(new Date(), itemTimeZone))
    const startTimePart = currentStartWall.length >= 16 ? currentStartWall.slice(11, 16) : '09:00'
    const endTimePart = currentEndWall.length >= 16 ? currentEndWall.slice(11, 16) : '10:00'
    setRescheduleForm({
      date: occDate,
      startTime: startTimePart,
      endTime: endTimePart,
    })
    setRescheduleModalOpen(true)
  }

  const shiftDate = (direction: number) => {
    const next = new Date(focusDate)
    if (view === 'week') next.setUTCDate(next.getUTCDate() + direction * 7)
    else if (view === 'agenda' || view === 'timeline') next.setUTCDate(next.getUTCDate() + direction * 7)
    else if (view === 'day') next.setUTCDate(next.getUTCDate() + direction)
    else next.setUTCMonth(next.getUTCMonth() + direction)
    setFocusDate(next)
  }

  const rangeLabel = view === 'calendar'
    ? calendarDateLabel(focusDate, { month: 'long', year: 'numeric' })
    : `${calendarDateLabel(startDate, { month: 'short', day: 'numeric' })} – ${calendarDateLabel(endDate, { month: 'short', day: 'numeric', year: 'numeric' })}`

  const itemsForDay = (day: Date) => itemsByDateKey.get(calendarDateKey(day)) || []

  const openFormSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.title.trim()) {
      toast.error('Enter an activity title.')
      return
    }
    if (form.activity_type !== 'task' && (!form.start_at || !form.end_at)) {
      toast.error('Events and holidays need a start and end time.')
      return
    }
    if (form.recurrence_frequency !== 'none' && (
      !form.recurrence_until || form.recurrence_interval < 1 || form.recurrence_interval > 30
    )) {
      toast.error('Set a valid recurrence end date and interval.')
      return
    }
    try {
      const payload = itemPayload(form, editingItem?.timezone || timeZone, editingItem || undefined)
      if (editingItem) updateMutation.mutate({ item: editingItem, payload })
      else createMutation.mutate(payload)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Enter valid activity dates and times.')
    }
  }

  const renderCalendar = () => (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="grid grid-cols-7 border-b bg-slate-50 text-center text-xs font-semibold text-slate-500">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day} className="py-2">{day}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {calendarDays.map((day) => {
          const dateKey = calendarDateKey(day)
          const dayItems = itemsForDay(day)
          const isOver = dragOverTarget === dateKey
          return (
            <div
              key={dateKey}
              onDragOver={(event) => handleDragOver(event, dateKey)}
              onDragLeave={(event) => handleDragLeave(event, dateKey)}
              onDrop={(event) => handleDropOnDate(dateKey, event)}
              className={`min-h-24 border-b border-r border-slate-100 p-1.5 sm:min-h-32 transition-colors ${
                day.getUTCMonth() !== focusDate.getUTCMonth() ? 'bg-slate-50/70 text-slate-400' : ''
              } ${dateKey === planningDateKey(new Date(), timeZone) ? 'bg-indigo-50/50' : ''} ${
                isOver ? 'bg-indigo-100/80 ring-2 ring-indigo-500 ring-inset border-indigo-400' : ''
              }`}
            >
              <button type="button" onClick={() => setFocusDate(day)} className="mb-1 px-1 text-xs font-semibold">
                {day.getUTCDate()}
              </button>
              <div className="space-y-1">
                {dayItems.slice(0, 3).map((item) => (
                  <button
                    type="button"
                    key={item.key || item.id}
                    draggable={isEditMode && item.editable}
                    onDragStart={(event) => handleDragStart(event, item)}
                    onClick={() => setActiveItem(item)}
                    className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] ${
                      isEditMode && item.editable ? 'cursor-grab active:cursor-grabbing hover:ring-1 hover:ring-indigo-400' : ''
                    } ${
                      item.is_rescheduled
                        ? 'border border-amber-300 bg-amber-100 font-medium text-amber-900'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                    title={`${item.title}${item.is_rescheduled && item.original_occurrence_date ? ` (Rescheduled from ${item.original_occurrence_date})` : ''}`}
                  >
                    {item.is_rescheduled ? '↻ ' : ''}{item.title}
                  </button>
                ))}
                {dayItems.length > 3 && <span className="px-1 text-[10px] text-slate-500">+{dayItems.length - 3} more</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderWeek = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
        {calendarDays.map((day) => {
          const dateKey = calendarDateKey(day)
          const dayItems = itemsForDay(day)
          const isToday = dateKey === planningDateKey(new Date(), timeZone)
          const isOver = dragOverTarget === dateKey
          return (
            <div
              key={dateKey}
              onDragOver={(event) => handleDragOver(event, dateKey)}
              onDragLeave={(event) => handleDragLeave(event, dateKey)}
              onDrop={(event) => handleDropOnDate(dateKey, event)}
              className={`flex flex-col min-h-64 rounded-xl border p-2.5 transition-all ${
                isOver
                  ? 'border-indigo-400 bg-indigo-50/90 ring-2 ring-indigo-400 ring-inset shadow-md'
                  : isToday
                    ? 'border-indigo-300 bg-indigo-50/30'
                    : 'border-slate-200 bg-white'
              }`}
            >
              <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <span className="block text-[11px] font-medium uppercase text-slate-400">
                    {calendarDateLabel(day, { weekday: 'short' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setFocusDate(day); handleSelectView('day') }}
                    className={`text-sm font-bold ${isToday ? 'text-indigo-600' : 'text-slate-800'} hover:underline`}
                  >
                    {calendarDateLabel(day, { month: 'short', day: 'numeric' })}
                  </button>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  {dayItems.length}
                </span>
              </div>
              <div className="flex-1 space-y-2">
                {dayItems.map((item) => (
                  <PlanningCard
                    key={item.key || item.id}
                    item={item}
                    timeZone={timeZone}
                    onClick={() => setActiveItem(item)}
                    isEditMode={isEditMode}
                    onDragStart={handleDragStart}
                    onAdjustDuration={handleAdjustDuration}
                  />
                ))}
                {dayItems.length === 0 && (
                  <div className={`flex h-28 items-center justify-center rounded-lg border border-dashed text-center text-xs ${
                    isOver ? 'border-indigo-400 text-indigo-700 bg-indigo-100/50' : 'border-slate-200 text-slate-400'
                  }`}>
                    {isOver ? 'Drop to reschedule here' : isEditMode ? 'Drag here to reschedule' : 'No activities'}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderDay = () => {
    const dayItems = itemsForDay(focusDate)
    const timedItems = dayItems.filter((i) => i.start_at && !i.all_day)
    const allDayOrUnscheduled = dayItems.filter((i) => !i.start_at || i.all_day)
    const dayHours = Array.from({ length: 14 }, (_, i) => i + 7)

    const prevDate = new Date(focusDate)
    prevDate.setUTCDate(prevDate.getUTCDate() - 1)
    const prevKey = calendarDateKey(prevDate)

    const nextDate = new Date(focusDate)
    nextDate.setUTCDate(nextDate.getUTCDate() + 1)
    const nextKey = calendarDateKey(nextDate)

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3">
          <button
            type="button"
            onClick={() => shiftDate(-1)}
            onDragOver={(event) => handleDragOver(event, `day-nav:${prevKey}`)}
            onDragLeave={(event) => handleDragLeave(event, `day-nav:${prevKey}`)}
            onDrop={(event) => handleDropOnDate(prevKey, event)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              dragOverTarget === `day-nav:${prevKey}`
                ? 'border-indigo-500 bg-indigo-100 text-indigo-800 ring-2 ring-indigo-400'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Drop here to shift to previous day"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{calendarDateLabel(prevDate, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </button>

          <h2 className="text-sm font-bold text-slate-800 sm:text-base">
            {calendarDateLabel(focusDate, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h2>

          <button
            type="button"
            onClick={() => shiftDate(1)}
            onDragOver={(event) => handleDragOver(event, `day-nav:${nextKey}`)}
            onDragLeave={(event) => handleDragLeave(event, `day-nav:${nextKey}`)}
            onDrop={(event) => handleDropOnDate(nextKey, event)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              dragOverTarget === `day-nav:${nextKey}`
                ? 'border-indigo-500 bg-indigo-100 text-indigo-800 ring-2 ring-indigo-400'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Drop here to shift to next day"
          >
            <span>{calendarDateLabel(nextDate, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {allDayOrUnscheduled.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              All-Day & Tasks ({allDayOrUnscheduled.length})
            </h3>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {allDayOrUnscheduled.map((item) => (
                <PlanningCard
                  key={item.key || item.id}
                  item={item}
                  timeZone={timeZone}
                  onClick={() => setActiveItem(item)}
                  isEditMode={isEditMode}
                  onDragStart={handleDragStart}
                  onAdjustDuration={handleAdjustDuration}
                />
              ))}
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="divide-y divide-slate-100">
            {dayHours.map((h) => {
              const hourStr = `${String(h).padStart(2, '0')}:00`
              const hourLabel = `${h % 12 === 0 ? 12 : h % 12}:00 ${h >= 12 ? 'PM' : 'AM'}`
              const isOver = dragOverTarget === `hour:${hourStr}`

              const slotItems = timedItems.filter((i) => {
                const wall = planningWallDateTime(i.start_at, i.timezone || timeZone)
                return wall.length >= 13 && Number(wall.slice(11, 13)) === h
              })

              return (
                <div
                  key={hourStr}
                  onDragOver={(event) => handleDragOver(event, `hour:${hourStr}`)}
                  onDragLeave={(event) => handleDragLeave(event, `hour:${hourStr}`)}
                  onDrop={(event) => handleDropOnHourSlot(hourStr, event)}
                  className={`flex flex-col gap-2 p-2.5 transition sm:flex-row sm:items-start ${
                    isOver ? 'bg-indigo-50/90 ring-2 ring-indigo-400 ring-inset' : 'hover:bg-slate-50/50'
                  }`}
                >
                  <div className="w-20 shrink-0 pt-1 text-xs font-semibold text-slate-400 sm:text-right sm:pr-4">
                    {hourLabel}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    {slotItems.map((item) => (
                      <PlanningCard
                        key={item.key || item.id}
                        item={item}
                        timeZone={timeZone}
                        onClick={() => setActiveItem(item)}
                        isEditMode={isEditMode}
                        onDragStart={handleDragStart}
                        onAdjustDuration={handleAdjustDuration}
                      />
                    ))}
                    {slotItems.length === 0 && (
                      <div
                        className={`rounded-lg border border-dashed py-2 text-center text-xs transition ${
                          isOver
                            ? 'border-indigo-400 bg-indigo-100/60 font-semibold text-indigo-700'
                            : isEditMode
                              ? 'border-slate-200 text-slate-400'
                              : 'border-transparent text-slate-300'
                        }`}
                      >
                        {isOver ? `Drop to reschedule to ${hourLabel}` : isEditMode ? `Empty (${hourLabel})` : ''}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {dayItems.length === 0 && (
          <p className="py-4 text-center text-sm text-slate-500">No activities scheduled for this day.</p>
        )}
      </div>
    )
  }

  const renderKanban = () => (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {statusColumns.map((column) => {
        const columnItems = filteredItems.filter((item) => item.editable && item.status === column.value)
        return (
          <section
            key={column.value}
            className="min-w-0 rounded-xl bg-slate-100/80 p-3"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              if (!isEditMode) return
              const activityId = Number(event.dataTransfer.getData('text/planning-activity-id'))
              const item = items.find((candidate) => candidate.editable && Number(candidate.source_id) === activityId)
              if (item && item.status !== column.value && item.allowed_transitions?.includes(column.value)) {
                statusMutation.mutate({ item, status: column.value })
              }
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700">{column.label}</h2>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600">{columnItems.length}</span>
            </div>
            <div className="space-y-2">
              {columnItems.map((item) => (
                <div
                  key={item.key}
                  draggable={isEditMode && item.editable}
                  onDragStart={(event) => {
                    if (isEditMode && item.editable) event.dataTransfer.setData('text/planning-activity-id', String(item.source_id))
                  }}
                  className={isEditMode && item.editable ? 'cursor-grab active:cursor-grabbing' : ''}
                >
                  <PlanningCard
                    item={item}
                    timeZone={timeZone}
                    onClick={() => setActiveItem(item)}
                    isEditMode={isEditMode}
                    onAdjustDuration={handleAdjustDuration}
                  />
                </div>
              ))}
              {columnItems.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">No activities</p>}
            </div>
          </section>
        )
      })}
    </div>
  )

  const renderAgendaOrTimeline = () => {
    if (view === 'agenda') {
      const todayKey = planningDateKey(new Date(), timeZone)
      const visible = filteredItems
      const scheduledKey = (item: PlanningItem) => itemDateKey(item, timeZone)
      const pending = visible.filter((item) => item.activity_type === 'task' && !['completed', 'cancelled'].includes(item.status))
      const sections: Array<{ title: string; items: PlanningItem[] }> = [
        { title: 'Today', items: visible.filter((item) => scheduledKey(item) === todayKey) },
        {
          title: 'Overdue',
          items: visible.filter((item) =>
            item.due_at && scheduledKey(item) < todayKey && !['completed', 'cancelled'].includes(item.status),
          ),
        },
        { title: 'Upcoming', items: visible.filter((item) => scheduledKey(item) > todayKey) },
        { title: 'Pending tasks', items: pending },
        {
          title: 'Assigned work',
          items: visible.filter((item) => item.assignees.some((assignee) => assignee.user_id === user?.id)),
        },
        {
          title: 'Institutional events',
          items: visible.filter((item) => item.activity_type === 'event' || item.activity_type === 'holiday'),
        },
      ]
      return (
        <div className="space-y-5">
          {sections.map((section) => (
            <section key={section.title} className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="mb-3 flex items-center justify-between text-sm font-bold text-slate-700">
                {section.title}
                <span className="text-xs font-normal text-slate-500">{section.items.length}</span>
              </h2>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {section.items.map((item) => (
                  <PlanningCard
                    key={`${section.title}:${item.key}`}
                    item={item}
                    timeZone={timeZone}
                    onClick={() => setActiveItem(item)}
                    isEditMode={isEditMode}
                    onDragStart={handleDragStart}
                    onAdjustDuration={handleAdjustDuration}
                  />
                ))}
                {section.items.length === 0 && <p className="text-sm text-slate-500">Nothing to show.</p>}
              </div>
            </section>
          ))}
        </div>
      )
    }

    const groups = new Map<string, { date: Date; items: PlanningItem[] }>()
    for (const item of filteredItems) {
      const key = itemDateKey(item, timeZone) || 'unscheduled'
      const date = key === 'unscheduled' ? null : parsePlanningDateKey(key)
      const group = groups.get(key) || { date: date || new Date(0), items: [] }
      group.items.push(item)
      groups.set(key, group)
    }
    const ordered = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
    return (
      <div className="space-y-5">
        {ordered.map(([key, group]) => {
          const isOver = dragOverTarget === `timeline:${key}`
          return (
            <section
              key={key}
              onDragOver={(event) => key !== 'unscheduled' && handleDragOver(event, `timeline:${key}`)}
              onDragLeave={(event) => key !== 'unscheduled' && handleDragLeave(event, `timeline:${key}`)}
              onDrop={(event) => key !== 'unscheduled' && handleDropOnDate(key, event)}
              className={`transition-all ${
                view === 'timeline' ? 'border-l-2 border-indigo-200 pl-4' : ''
              } ${
                isOver ? 'rounded-xl bg-indigo-50/70 ring-2 ring-indigo-400 ring-inset p-3' : ''
              }`}
            >
              <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                {view === 'timeline' && <span className="h-2 w-2 -ml-[21px] rounded-full bg-indigo-500" />}
                {key === 'unscheduled' ? 'Unscheduled' : calendarDateLabel(group.date, { weekday: 'long', month: 'long', day: 'numeric' })}
                <span className="text-xs font-normal text-slate-500">{group.items.length}</span>
                {isOver && <span className="ml-2 text-xs font-medium text-indigo-600">Drop to reschedule to this date</span>}
              </h2>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {group.items.map((item) => (
                  <PlanningCard
                    key={item.key || item.id}
                    item={item}
                    timeZone={timeZone}
                    onClick={() => setActiveItem(item)}
                    isEditMode={isEditMode}
                    onDragStart={handleDragStart}
                    onAdjustDuration={handleAdjustDuration}
                  />
                ))}
              </div>
            </section>
          )
        })}
        {ordered.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">No activities in this date range.</p>}
      </div>
    )
  }

  const isSaving = createMutation.isPending || updateMutation.isPending
  return (
    <div className="mx-auto max-w-[1600px] space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-indigo-700">
            <CalendarDays className="h-4 w-4" />
            <span className="font-semibold">PrathamOne EduOS</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Tasks & Planning Center</h1>
          <p className="mt-1 text-sm text-slate-500">Universal institutional task management, Kanban board, calendar deadlines, and cross-module activity tracking.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EditModeBar
            scope={editScope}
            title="Tasks & Planning Center"
            requiredPermission="planning:create,planning:edit,planning:edit_any,planning:complete,planning:cancel,planning:delete"
            compact
          />
          <button
            type="button"
            onClick={() => syncAllMutation.mutate()}
            disabled={!isEditMode || syncAllMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            title={!isEditMode ? 'Enable Edit Mode to sync automated tasks' : 'Scan and generate automated tasks across Fees, Homework, Timetable, and Truancy'}
          >
            <RefreshCw className={`h-4 w-4 ${syncAllMutation.isPending ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">Sync All Tasks</span>
          </button>
          <button
            type="button"
            onClick={openCreate}
            disabled={!isEditMode}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            title={!isEditMode ? 'Enable Edit Mode to create an activity' : undefined}
          >
            <Plus className="h-4 w-4" /> New activity
          </button>
        </div>
      </div>

      {taskSummary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="text-xs font-medium text-slate-500">Total Tasks</div>
            <div className="mt-1 text-xl font-bold text-slate-800">{taskSummary.total_tasks}</div>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 shadow-sm">
            <div className="text-xs font-medium text-blue-600">To Do</div>
            <div className="mt-1 text-xl font-bold text-blue-800">{taskSummary.todo}</div>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 shadow-sm">
            <div className="text-xs font-medium text-amber-600">In Progress</div>
            <div className="mt-1 text-xl font-bold text-amber-800">{taskSummary.in_progress}</div>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 shadow-sm">
            <div className="text-xs font-medium text-emerald-600">Completed</div>
            <div className="mt-1 text-xl font-bold text-emerald-800">{taskSummary.completed}</div>
          </div>
          <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3 shadow-sm">
            <div className="text-xs font-medium text-rose-600">Urgent</div>
            <div className="mt-1 text-xl font-bold text-rose-800">{taskSummary.urgent}</div>
          </div>
          <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-3 shadow-sm">
            <div className="text-xs font-medium text-orange-600">Overdue</div>
            <div className="mt-1 text-xl font-bold text-orange-800">{taskSummary.overdue}</div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Planning views" className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {views.map(({ value, label, icon: Icon }) => (
              <button
                type="button"
                key={value}
                onClick={() => handleSelectView(value)}
                aria-label={label}
                aria-pressed={view === value}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                  view === value ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="h-3.5 w-3.5" /><span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setFocusDate(parsePlanningDateKey(planningDateKey(new Date(), timeZone)))}
            className="rounded-lg border px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Today
          </button>
          <button type="button" aria-label="Previous date range" onClick={() => shiftDate(-1)} className="rounded-lg border p-2 text-slate-600 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /></button>
          <button type="button" aria-label="Next date range" onClick={() => shiftDate(1)} className="rounded-lg border p-2 text-slate-600 hover:bg-slate-50"><ArrowRight className="h-4 w-4" /></button>
          <strong className="min-w-32 text-sm text-slate-800">{rangeLabel}</strong>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-40 flex-1 lg:flex-none">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search activities" className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm" />
          </label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm">
            <option value="all">All statuses</option>
            {statusColumns.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm">
            <option value="all">All types</option>
            <option value="task">Tasks</option>
            <option value="event">Events</option>
            <option value="holiday">Holidays</option>
          </select>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
            aria-label="Refresh activities"
            title={isFetching ? 'Updating activities…' : 'Refresh activities'}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading && !activitiesResponse ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Loading activities…</div>
      ) : isError && !activitiesResponse ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-800">
          Planning activities could not be loaded. Check access or retry.
          <button type="button" onClick={() => refetch()} className="ml-2 font-semibold underline">Retry</button>
        </div>
      ) : view === 'day' ? renderDay()
        : view === 'week' ? renderWeek()
        : view === 'calendar' ? renderCalendar()
        : view === 'kanban' ? renderKanban()
          : renderAgendaOrTimeline()}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editingItem ? 'Edit activity' : 'Create activity'} size="2xl">
        <form onSubmit={openFormSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="md:col-span-2 text-sm font-medium text-slate-700">
              Title *
              <input autoFocus required maxLength={200} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-slate-700">Activity type
              <select value={form.activity_type} onChange={(event) => setForm({ ...form, activity_type: event.target.value as FormValues['activity_type'] })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
                <option value="task">Task</option><option value="event">Event</option><option value="holiday">Holiday</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">Category
              <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as FormValues['category'] })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
                <option value="academic">Academic</option><option value="administrative">Administrative</option><option value="institutional">Institutional</option><option value="meeting">Meeting</option><option value="other">Other</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">Start
              <input type="datetime-local" value={form.start_at} onChange={(event) => setForm({ ...form, start_at: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-slate-700">End
              <input type="datetime-local" value={form.end_at} onChange={(event) => setForm({ ...form, end_at: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-slate-700">Due date
              <input type="datetime-local" value={form.due_at} onChange={(event) => setForm({ ...form, due_at: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-slate-700">Priority
              <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as FormValues['priority'] })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
                <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">Location
              <input maxLength={200} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-slate-700">Academic year
              <select
                value={form.academic_year_id ?? ''}
                disabled={isAcademicYearsLoading || isAcademicYearsError}
                onChange={(event) => setForm({ ...form, academic_year_id: event.target.value ? Number(event.target.value) : null })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
              >
                <option value="">{isAcademicYearsLoading ? 'Loading academic years…' : 'No academic year'}</option>
                {(academicYearsResponse?.data || []).map((year) => (
                  <option key={year.id} value={year.id}>{year.name}{year.is_current ? ' (Current)' : ''}</option>
                ))}
              </select>
              {isAcademicYearsError && <span role="alert" className="text-xs font-normal text-rose-700">Academic years could not be loaded.</span>}
            </label>
            <label className="text-sm font-medium text-slate-700">Class / batch
              <select
                value={form.division_id ?? ''}
                disabled={areStandardsLoading || areDivisionsLoading || areStandardsError || areDivisionsError}
                onChange={(event) => setForm({
                  ...form,
                  division_id: event.target.value ? Number(event.target.value) : null,
                  subject_id: null,
                })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
              >
                <option value="">
                  {areStandardsLoading || areDivisionsLoading ? 'Loading classes…' : 'No class / batch'}
                </option>
                {divisions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {[division.standard_name, division.name].filter(Boolean).join(' · ')}
                  </option>
                ))}
              </select>
              {(areStandardsError || areDivisionsError) && <span role="alert" className="text-xs font-normal text-rose-700">Classes could not be loaded.</span>}
            </label>
            <label className="text-sm font-medium text-slate-700">Subject
              <select
                value={form.subject_id ?? ''}
                disabled={!selectedDivision || areSubjectsLoading || areSubjectsError}
                onChange={(event) => setForm({ ...form, subject_id: event.target.value ? Number(event.target.value) : null })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
              >
                <option value="">
                  {!selectedDivision ? 'Select a class first' : areSubjectsLoading ? 'Loading subjects…' : 'No subject'}
                </option>
                {(subjectsResponse?.data || []).map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.name}{subject.code ? ` (${subject.code})` : ''}</option>
                ))}
              </select>
              {areSubjectsError && <span role="alert" className="text-xs font-normal text-rose-700">Subjects could not be loaded.</span>}
            </label>
            <label className="inline-flex items-center gap-2 self-end pb-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={form.all_day} onChange={(event) => setForm({ ...form, all_day: event.target.checked })} />
              All-day activity
            </label>
            <label className="text-sm font-medium text-slate-700">Visibility
              <select value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value as FormValues['visibility'] })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
                <option value="institution">Institution</option>
                <option value="assignees">Assigned users only</option>
              </select>
            </label>
            <label className="inline-flex items-center gap-2 self-end pb-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.is_published}
                disabled={!hasPermission(user, 'planning:publish')}
                onChange={(event) => setForm({ ...form, is_published: event.target.checked })}
              />
              Publish to the institution
            </label>
            <p className="md:col-span-2 -mt-2 text-xs text-slate-500">
              Times are entered in {editingItem?.timezone || timeZone}. Publishing requires the planning publish permission.
            </p>
            <label className="text-sm font-medium text-slate-700">Assigned users
              <select multiple value={form.assignee_user_ids.map(String)} onChange={(event) => setForm({ ...form, assignee_user_ids: Array.from(event.target.selectedOptions, (option) => Number(option.value)) })} className="mt-1 h-24 w-full rounded-lg border border-slate-300 px-3 py-2">
                {(assigneesResponse?.data.users || []).map((person) => <option key={person.id} value={person.id}>{person.name} · {person.role}</option>)}
              </select>
              <span className="text-xs font-normal text-slate-500">Use Ctrl/Cmd to select more than one person.</span>
            </label>
            <label className="text-sm font-medium text-slate-700">Assigned departments
              <select multiple value={form.department_names} onChange={(event) => setForm({ ...form, department_names: Array.from(event.target.selectedOptions, (option) => option.value) })} className="mt-1 h-24 w-full rounded-lg border border-slate-300 px-3 py-2">
                {(assigneesResponse?.data.departments || []).map((department) => <option key={department} value={department}>{department}</option>)}
              </select>
              <span className="text-xs font-normal text-slate-500">Staff in selected departments are resolved to canonical user records.</span>
            </label>
            <label className="text-sm font-medium text-slate-700">Repeat
              <select value={form.recurrence_frequency} onChange={(event) => setForm({ ...form, recurrence_frequency: event.target.value as FormValues['recurrence_frequency'] })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
                <option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
              </select>
            </label>
            {form.recurrence_frequency !== 'none' && (
              <>
                <label className="text-sm font-medium text-slate-700">Repeat every
                  <span className="mt-1 flex items-center gap-2">
                    <input type="number" min={1} max={30} value={form.recurrence_interval} onChange={(event) => setForm({ ...form, recurrence_interval: Number(event.target.value) })} className="w-24 rounded-lg border border-slate-300 px-3 py-2" />
                    <span className="text-xs font-normal text-slate-500">{form.recurrence_frequency === 'daily' ? 'day(s)' : form.recurrence_frequency === 'weekly' ? 'week(s)' : 'month(s)'}</span>
                  </span>
                </label>
                <label className="text-sm font-medium text-slate-700">Repeat until
                  <input type="date" required value={form.recurrence_until} onChange={(event) => setForm({ ...form, recurrence_until: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
                </label>
                {form.recurrence_frequency === 'weekly' && (
                  <fieldset className="md:col-span-2">
                    <legend className="mb-2 text-sm font-medium text-slate-700">Repeat on</legend>
                    <div className="flex flex-wrap gap-3">
                      {weekDays.map((day, index) => (
                        <label key={day} className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                          <input
                            type="checkbox"
                            checked={form.recurrence_weekdays.includes(index)}
                            onChange={(event) => setForm({
                              ...form,
                              recurrence_weekdays: event.target.checked
                                ? [...new Set([...form.recurrence_weekdays, index])].sort()
                                : form.recurrence_weekdays.filter((selected) => selected !== index),
                            })}
                          />
                          {day}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}
              </>
            )}
            <fieldset className="md:col-span-2 rounded-lg border border-slate-200 p-3">
              <legend className="px-1 text-sm font-medium text-slate-700">Linked institutional records</legend>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="flex-1 text-xs font-medium text-slate-600 sm:max-w-xs">Record type
                  <select
                    value={referenceType}
                    onChange={(event) => {
                      setReferenceType(event.target.value as typeof referenceType)
                      setPickerSearchQuery('')
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {referenceTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>

                {!manualIdMode && ['student', 'lead', 'examination', 'homework_assignment'].includes(referenceType) ? (
                  <div className="relative flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-600">
                        {referenceType === 'student' && 'Search student by name or admission #'}
                        {referenceType === 'lead' && 'Search lead by applicant name'}
                        {referenceType === 'examination' && 'Search examination by name'}
                        {referenceType === 'homework_assignment' && 'Search homework assignment'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setManualIdMode(true)}
                        className="text-[11px] text-indigo-600 hover:underline"
                      >
                        Enter ID manually
                      </button>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={pickerSearchQuery}
                        onChange={(e) => setPickerSearchQuery(e.target.value)}
                        placeholder={
                          referenceType === 'student' ? 'e.g. Ashwin, PA-2024...' :
                          referenceType === 'lead' ? 'e.g. Candidate name...' :
                          referenceType === 'examination' ? 'e.g. Mock test...' : 'e.g. Assignment title...'
                        }
                        className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-sm focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    {/* Autocomplete Dropdown */}
                    {referenceType === 'student' && pickerSearchQuery.trim().length >= 1 && (
                      <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                        {isSearchingStudents && <div className="p-3 text-xs text-slate-500">Searching students…</div>}
                        {!isSearchingStudents && (studentSearchResults || []).length === 0 && (
                          <div className="p-3 text-xs text-slate-500">No students found matching "{pickerSearchQuery}".</div>
                        )}
                        {(studentSearchResults || []).map((s: any) => {
                          const fullName = `${s.first_name || ''} ${s.last_name || ''}`.trim()
                          const label = `${fullName} (${s.admission_number || s.id})`
                          return (
                            <button
                              type="button"
                              key={s.id}
                              onClick={() => addReference('student', s.id, label)}
                              className="flex w-full items-center justify-between border-b border-slate-100 p-2 text-left text-xs hover:bg-indigo-50"
                            >
                              <span className="font-medium text-slate-800">{fullName} <span className="text-slate-500">· {s.admission_number}</span></span>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">ID #{s.id}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {referenceType === 'lead' && pickerSearchQuery.trim().length >= 1 && (
                      <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                        {isSearchingLeads && <div className="p-3 text-xs text-slate-500">Searching leads…</div>}
                        {!isSearchingLeads && (leadSearchResults || []).length === 0 && (
                          <div className="p-3 text-xs text-slate-500">No leads found matching "{pickerSearchQuery}".</div>
                        )}
                        {(leadSearchResults || []).map((l: any) => {
                          const label = `${l.student_name} (${l.stage || 'lead'})`
                          return (
                            <button
                              type="button"
                              key={l.id}
                              onClick={() => addReference('lead', l.id, label)}
                              className="flex w-full items-center justify-between border-b border-slate-100 p-2 text-left text-xs hover:bg-indigo-50"
                            >
                              <span className="font-medium text-slate-800">{l.student_name} <span className="text-slate-500">· {l.stage}</span></span>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">ID #{l.id}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {referenceType === 'examination' && (
                      <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                        {isSearchingExams && <div className="p-3 text-xs text-slate-500">Loading examinations…</div>}
                        {((examSearchResults || []) as any[])
                          .filter((e) => !pickerSearchQuery.trim() || e.name?.toLowerCase().includes(pickerSearchQuery.trim().toLowerCase()))
                          .slice(0, 8)
                          .map((e: any) => (
                            <button
                              type="button"
                              key={e.id}
                              onClick={() => addReference('examination', e.id, e.name)}
                              className="flex w-full items-center justify-between border-b border-slate-100 p-2 text-left text-xs hover:bg-indigo-50"
                            >
                              <span className="font-medium text-slate-800">{e.name}</span>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">ID #{e.id}</span>
                            </button>
                          ))}
                      </div>
                    )}

                    {referenceType === 'homework_assignment' && pickerSearchQuery.trim().length >= 1 && (
                      <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                        {isSearchingHw && <div className="p-3 text-xs text-slate-500">Searching assignments…</div>}
                        {!isSearchingHw && (hwSearchResults || []).length === 0 && (
                          <div className="p-3 text-xs text-slate-500">No assignments found matching "{pickerSearchQuery}".</div>
                        )}
                        {(hwSearchResults || []).map((h: any) => (
                          <button
                            type="button"
                            key={h.id}
                            onClick={() => addReference('homework_assignment', h.id, h.title)}
                            className="flex w-full items-center justify-between border-b border-slate-100 p-2 text-left text-xs hover:bg-indigo-50"
                          >
                            <span className="font-medium text-slate-800">{h.title}</span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">ID #{h.id}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <label className="w-full text-xs font-medium text-slate-600 sm:w-44">
                      <div className="mb-1 flex items-center justify-between">
                        <span>Record ID</span>
                        {['student', 'lead', 'examination', 'homework_assignment'].includes(referenceType) && (
                          <button
                            type="button"
                            onClick={() => setManualIdMode(false)}
                            className="text-[11px] text-indigo-600 hover:underline"
                          >
                            Search by name
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        min={1}
                        value={referenceId}
                        onChange={(event) => setReferenceId(event.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const sourceRecordId = Number(referenceId)
                        addReference(referenceType, sourceRecordId)
                      }}
                      className="inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                    >
                      <Link2 className="h-4 w-4" /> Add link
                    </button>
                  </>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-500">The server verifies the record exists in this institution; linked module records remain authoritative.</p>
              {form.references.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {form.references.map((reference) => {
                    const label = referenceTypes.find(([value]) => value === reference.source_type)?.[1] || reference.source_type
                    return (
                      <li key={`${reference.source_type}:${reference.source_record_id}`} className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs text-indigo-900">
                        <span className="font-semibold text-indigo-700">{label}:</span>
                        <span>{reference.label || `#${reference.source_record_id}`}</span>
                        {reference.label && <span className="font-mono text-[10px] text-indigo-400">#{reference.source_record_id}</span>}
                        <button
                          type="button"
                          aria-label={`Remove ${label} ${reference.source_record_id}`}
                          onClick={() => setForm({
                            ...form,
                            references: form.references.filter((item) =>
                              item.source_type !== reference.source_type || item.source_record_id !== reference.source_record_id,
                            ),
                          })}
                          className="rounded-full p-0.5 hover:bg-indigo-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </fieldset>
            <label className="md:col-span-2 text-sm font-medium text-slate-700">Description
              <textarea rows={3} maxLength={10000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border px-4 py-2 text-sm font-medium">Cancel</button>
            <button type="submit" disabled={isSaving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{isSaving ? 'Saving…' : editingItem ? 'Save activity' : 'Create activity'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!activeItem} onClose={() => {
        setActiveItem(null)
        setConfirmCancel(false)
        setAttachmentToRemove(null)
        setRescheduleModalOpen(false)
      }} title={activeItem?.title || 'Activity'} size="xl">
        {activeItem && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700">{activeItem.activity_type}</span>
              {activeItem.editable ? (
                <>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">{activeItem.status.replace('_', ' ')}</span>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800">{activeItem.priority} priority</span>
                </>
              ) : (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                  {sourceLabels[activeItem.source_type] || 'Linked record'} · read-only source
                </span>
              )}
              {activeItem.is_rescheduled && (
                <span
                  data-testid="rescheduled-badge"
                  className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900"
                  title={activeItem.original_occurrence_date ? `Rescheduled from ${activeItem.original_occurrence_date}` : 'Rescheduled occurrence'}
                >
                  <Clock3 className="h-3 w-3 text-amber-700" />
                  Rescheduled {activeItem.original_occurrence_date ? `(was ${activeItem.original_occurrence_date})` : ''}
                </span>
              )}
            </div>
            {activeItem.description && <p className="whitespace-pre-wrap text-sm text-slate-700">{activeItem.description}</p>}
            <div className="grid gap-3 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-2">
              <p><Clock3 className="mr-1 inline h-4 w-4 text-slate-500" />{formatDate(activeItem.start_at || activeItem.due_at, activeItem.timezone || timeZone)}</p>
              {activeItem.end_at && <p>Ends {formatDate(activeItem.end_at, activeItem.timezone || timeZone)}</p>}
              {activeItem.location && <p>Location: {activeItem.location}</p>}
              {activeItem.assignees.length > 0 && <p>Assigned: {activeItem.assignees.map((person) => person.name).join(', ')}</p>}
            </div>
            {activeItem.references.length > 0 && (
              <div>
                <h3 className="mb-1 text-sm font-semibold">Linked institutional records</h3>
                <div className="flex flex-wrap gap-2">
                  {activeItem.references.map((reference) => {
                    const typeLabel = referenceTypes.find(([v]) => v === reference.source_type)?.[1] || reference.source_type
                    return (
                      <span key={`${reference.source_type}:${reference.source_record_id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-800">
                        <span className="font-semibold text-slate-600">{typeLabel}:</span>
                        <span>{reference.label || `#${reference.source_record_id}`}</span>
                        {reference.label && <span className="font-mono text-[10px] text-slate-400">#{reference.source_record_id}</span>}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
            {activeItem.attachments.length > 0 && (
              <div>
                <h3 className="mb-1 text-sm font-semibold">Attachments</h3>
                <div className="flex flex-wrap gap-2">
                  {activeItem.attachments.map((file) => (
                    <span key={file.id} className="inline-flex items-center gap-1">
                      <button type="button" onClick={async () => {
                        try {
                          const response = await planningApi.downloadAttachment(file.id)
                          const url = URL.createObjectURL(response.data)
                          const link = document.createElement('a')
                          link.href = url
                          link.download = file.filename
                          link.click()
                          URL.revokeObjectURL(url)
                        } catch {
                          toast.error('Could not download attachment.')
                        }
                      }} className="rounded border px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-50">{file.filename}</button>
                      {isEditMode && activeItem.editable && (
                        <button
                          type="button"
                          aria-label={`Remove attachment ${file.filename}`}
                          onClick={() => setAttachmentToRemove(file.id)}
                          className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                        >
                          Remove
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                {attachmentToRemove !== null && (
                  <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
                    <p className="text-sm text-rose-800">
                      Remove “{activeItem.attachments.find((file) => file.id === attachmentToRemove)?.filename || 'this attachment'}”?
                    </p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setAttachmentToRemove(null)} className="rounded-lg border px-3 py-2 text-sm">Keep attachment</button>
                      <button
                        type="button"
                        disabled={deleteAttachmentMutation.isPending}
                        onClick={() => deleteAttachmentMutation.mutate(attachmentToRemove)}
                        className="rounded-lg bg-rose-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {deleteAttachmentMutation.isPending ? 'Removing…' : 'Confirm removal'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
              {isEditMode && activeItem.editable && activeItem.status !== 'completed' && activeItem.status !== 'cancelled' && (
                <select
                  aria-label="Change activity status"
                  value={activeItem.status}
                  onChange={(event) => statusMutation.mutate({ item: activeItem, status: event.target.value as PlanningStatus })}
                  disabled={statusMutation.isPending}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  {statusColumns.filter(({ value }) =>
                    value === activeItem.status || activeItem.allowed_transitions?.includes(value),
                  ).map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                </select>
              )}
              {isEditMode && activeItem.editable && (
                <>
                  <button type="button" onClick={() => openEdit(activeItem)} className="rounded-lg border px-3 py-2 text-sm font-semibold text-slate-700">Edit</button>
                  {activeItem.recurrence && activeItem.occurrence_date && (
                    <button
                      type="button"
                      onClick={() => openRescheduleModal(activeItem)}
                      disabled={rescheduleMutation.isPending || cancelOccurrenceMutation.isPending || cancelSeriesMutation.isPending}
                      className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                    >
                      Reschedule occurrence
                    </button>
                  )}
                  {activeItem.is_rescheduled && (
                    <button
                      type="button"
                      onClick={() => restoreOccurrenceMutation.mutate({ item: activeItem })}
                      disabled={restoreOccurrenceMutation.isPending}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                      title="Restore this occurrence to its original recurring schedule"
                    >
                      {restoreOccurrenceMutation.isPending ? 'Restoring…' : 'Restore original schedule'}
                    </button>
                  )}
                  <button type="button" onClick={() => setConfirmCancel(true)} disabled={cancelOccurrenceMutation.isPending || cancelSeriesMutation.isPending} className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700">Cancel activity</button>
                </>
              )}
              <button type="button" onClick={() => setActiveItem(null)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">Close</button>
            </div>
            {confirmCancel && (
              <div role="alert" className="flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-rose-900">
                    {activeItem.recurrence && activeItem.occurrence_date
                      ? 'Cancel Recurring Activity'
                      : 'Confirm Cancellation'}
                  </p>
                  <p className="text-xs text-rose-700">
                    {activeItem.recurrence && activeItem.occurrence_date
                      ? `Select whether to cancel only this single occurrence on ${activeItem.occurrence_date} or cancel the entire recurring series.`
                      : 'Are you sure you want to cancel this activity?'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmCancel(false)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Keep
                  </button>
                  {activeItem.recurrence && activeItem.occurrence_date ? (
                    <>
                      <button
                        type="button"
                        disabled={cancelOccurrenceMutation.isPending || cancelSeriesMutation.isPending}
                        onClick={() => cancelOccurrenceMutation.mutate({ item: activeItem, occurrenceDate: activeItem.occurrence_date! })}
                        className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                      >
                        {cancelOccurrenceMutation.isPending ? 'Cancelling occurrence…' : `Cancel only ${activeItem.occurrence_date}`}
                      </button>
                      <button
                        type="button"
                        disabled={cancelOccurrenceMutation.isPending || cancelSeriesMutation.isPending}
                        onClick={() => cancelSeriesMutation.mutate(activeItem)}
                        className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
                      >
                        {cancelSeriesMutation.isPending ? 'Cancelling series…' : 'Cancel entire series'}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={cancelSeriesMutation.isPending}
                      onClick={() => cancelSeriesMutation.mutate(activeItem)}
                      className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
                    >
                      {cancelSeriesMutation.isPending ? 'Cancelling…' : 'Confirm cancellation'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        {activeItem && isEditMode && activeItem.editable && (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Plus className="h-4 w-4" /> Add attachment (max 10 MB)
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
              className="sr-only"
              onChange={async (event) => {
                const file = event.target.files?.[0]
                if (!file) return
                const selectedItem = activeItem
                if (!selectedItem) return
                try {
                  await planningApi.uploadAttachment(Number(selectedItem.source_id), file)
                  const refreshed = await planningApi.getActivity(Number(selectedItem.source_id))
                  setActiveItem(refreshed.data.item)
                  refresh()
                  toast.success('Attachment uploaded.')
                } catch (error: any) {
                  toast.error(error.response?.data?.detail || 'Could not upload attachment.')
                } finally {
                  event.target.value = ''
                }
              }}
            />
          </label>
        )}
        {activeItem && isEditMode && activeItem.editable && (
          <div>
            <button type="button" onClick={async () => {
              setHistoryOpen(true)
              const result = await loadHistory()
              if (result.isError) toast.error('Activity history could not be loaded.')
            }} className="text-sm font-semibold text-indigo-700 hover:underline">
              {isHistoryLoading ? 'Loading history…' : 'View activity history'}
            </button>
            {historyOpen && (
              <ol className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-lg bg-slate-50 p-3">
                {(historyResponse?.data.items || []).map((entry) => (
                  <li key={entry.id} className="text-xs text-slate-600">
                    <strong>{entry.action.replace(/_/g, ' ')}</strong> · {formatDate(entry.created_at, timeZone)}
                  </li>
                ))}
                {(historyResponse?.data.items || []).length === 0 && !isHistoryLoading && <li className="text-xs text-slate-500">No history available.</li>}
              </ol>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        title={`Reschedule Occurrence — ${activeItem?.title || ''}`}
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            rescheduleMutation.mutate()
          }}
          className="space-y-4"
        >
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <p className="font-semibold">Rescheduling Single Occurrence</p>
            <p className="mt-0.5">
              Original recurrence date: <span className="font-mono font-bold">{activeItem?.original_occurrence_date || activeItem?.occurrence_date}</span>.
              Only this single occurrence will be moved. The underlying recurring series remains unchanged.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
              New Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              aria-label="New date"
              value={rescheduleForm.date}
              onChange={(e) => setRescheduleForm((prev) => ({ ...prev, date: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Start Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                required
                aria-label="Start time"
                value={rescheduleForm.startTime}
                onChange={(e) => setRescheduleForm((prev) => ({ ...prev, startTime: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                End Time
              </label>
              <input
                type="time"
                aria-label="End time"
                value={rescheduleForm.endTime}
                onChange={(e) => setRescheduleForm((prev) => ({ ...prev, endTime: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-3">
            <button
              type="button"
              onClick={() => setRescheduleModalOpen(false)}
              className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={rescheduleMutation.isPending || !rescheduleForm.date || !rescheduleForm.startTime}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {rescheduleMutation.isPending ? 'Rescheduling…' : 'Save reschedule'}
            </button>
          </div>
        </form>
      </Modal>

      <div className="sr-only" aria-live="polite">
        {items.length} activities loaded
      </div>
    </div>
  )
}
