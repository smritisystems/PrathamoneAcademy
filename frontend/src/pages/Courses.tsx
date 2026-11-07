/**
 * @file        Courses.tsx
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
 * @description Courses and study materials catalog page managing syllabi and learning resources.
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Layers, BookOpen, Users, Clock, Award, CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { standardsApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'
import { EditModeBar } from '../components/common'

interface CourseItem {
  id: string
  name: string
  category: 'School Board' | 'Competitive Exam' | 'Foundation'
  target: string
  duration: string
  subjects: string[]
  standardsCovered: string
}

const COURSES: CourseItem[] = [
  {
    id: 'cbse-11-12',
    name: 'CBSE Senior Secondary (Class 11 & 12)',
    category: 'School Board',
    target: 'CBSE Board Exams + Entrance Foundations',
    duration: '2 Years',
    subjects: ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
    standardsCovered: 'Standard 11, Standard 12',
  },
  {
    id: 'state-11-12',
    name: 'Maharashtra State Board HSC (11th & 12th)',
    category: 'School Board',
    target: 'State Board Exams + MHT-CET',
    duration: '2 Years',
    subjects: ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
    standardsCovered: 'Standard 11, Standard 12',
  },
  {
    id: 'jee-main-adv',
    name: 'IIT-JEE Target (Main & Advanced)',
    category: 'Competitive Exam',
    target: 'IITs, NITs, IIITs Engineering Entrance',
    duration: '2 Years Intensive',
    subjects: ['Advanced Physics', 'Physical & Organic Chemistry', 'Higher Mathematics'],
    standardsCovered: 'Standard 11 & 12 Coaching',
  },
  {
    id: 'neet-ug',
    name: 'NEET-UG Medical Entrance Intensive',
    category: 'Competitive Exam',
    target: 'AIIMS, Govt Medical Colleges Entrance',
    duration: '2 Years Intensive',
    subjects: ['Botany', 'Zoology', 'Physics', 'Chemistry'],
    standardsCovered: 'Standard 11 & 12 Coaching',
  },
  {
    id: 'secondary-8-10',
    name: 'Secondary Board Excellence (Class 8–10)',
    category: 'School Board',
    target: 'CBSE / ICSE / SSC 10th Board Exams',
    duration: '1 Year per Standard',
    subjects: ['Mathematics', 'Science', 'English', 'Social Science'],
    standardsCovered: 'Standard 8, 9, 10',
  },
  {
    id: 'olympiad-foundation',
    name: 'Junior Science & Math Olympiad Foundation',
    category: 'Foundation',
    target: 'NTSE, Homi Bhabha, Mathematics Olympiad',
    duration: '1 Year Program',
    subjects: ['Logical Reasoning', 'Advanced Math', 'Experimental Science'],
    standardsCovered: 'Standard 6 to 9',
  },
]

export default function CoursesPage() {
  const { selectedInstitutionId } = useAuthStore()
  const editScope = 'academic:courses'
  const isEditMode = useEditModeStore((s) => !!s.scopes[editScope])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const { data: standards = [] } = useQuery({
    queryKey: ['standards', selectedInstitutionId],
    queryFn: () => standardsApi.list(selectedInstitutionId ?? undefined).then((r) => r.data),
  })

  const filteredCourses =
    selectedCategory === 'all'
      ? COURSES
      : COURSES.filter((c) => c.category === selectedCategory)

  return (
    <div className="space-y-6">
      {/* Global View-First & Explicit Edit Mode Governance Bar */}
      <EditModeBar scope={editScope} title="Coaching Courses & Programs Catalog" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coaching Courses & Programs</h1>
          <p className="text-sm text-gray-500">
            School-board coaching (Standards 1–12) and competitive exam preparation (JEE, NEET, Olympiads)
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/standards" className="btn-secondary text-sm">
            Manage Standards
          </Link>
          <Link to="/batches" className="btn-primary text-sm">
            Manage Batches
          </Link>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {['all', 'School Board', 'Competitive Exam', 'Foundation'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedCategory === cat
                ? 'bg-primary-700 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {cat === 'all' ? 'All Programs' : cat}
          </button>
        ))}
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((c) => (
          <div key={c.id} className="card flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    c.category === 'Competitive Exam'
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : c.category === 'School Board'
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {c.category}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                  <Clock className="w-3 h-3" /> {c.duration}
                </span>
              </div>

              <h2 className="text-base font-bold text-gray-900 mb-1">{c.name}</h2>
              <p className="text-xs text-gray-600 mb-3">{c.target}</p>

              <div className="border-t border-gray-100 pt-3 space-y-2">
                <div>
                  <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    Associated Standards
                  </p>
                  <p className="text-xs text-gray-800 font-medium">{c.standardsCovered}</p>
                </div>

                <div>
                  <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    Core Curriculum
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {c.subjects.map((s) => (
                      <span
                        key={s}
                        className="text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <CheckCircle className="w-3.5 h-3.5" /> Active Offering
              </span>
              <Link
                to="/students/add"
                className="text-xs text-primary-600 hover:text-primary-800 font-semibold"
              >
                Enroll Student →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

