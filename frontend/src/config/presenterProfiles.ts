/**
 * @file        presenterProfiles.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.config
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.141.0
 * @created     2026-11-19
 * @updated     2026-11-19
 *
 * @description Master registry of virtual human AI presenter profiles, vocal timbres, visual avatars, and synthesis presets.
 */

import type { PresenterProfile } from '../types/videoStudio'

export const PRESENTER_PROFILES: PresenterProfile[] = [
  {
    id: 'priya-sharma',
    name: 'Priya Sharma',
    role: 'Senior Solutions Specialist',
    accent: 'Indian Corporate English (Authoritative & Warm)',
    avatarUrl: '/media/studio/presenters/priya_sharma.jpg',
    videoPreviewUrl: '/media/studio/recordings/demo_student_workflow.mp4',
    voiceName: 'en-IN-Priya-Neural',
    gender: 'female',
    style: 'executive',
    badge: 'Flagship Corporate',
    description:
      'Authoritative yet approachable presentation style, ideal for executive demos, institute owner walkthroughs, and fee management presentations.',
    recommendedModules: ['Dashboard', 'Students', 'Fees', 'Attendance', 'Overview'],
  },
  {
    id: 'arjun-mallah',
    name: 'Arjun Mallah',
    role: 'Enterprise Product Architect',
    accent: 'Indian Corporate English (Strategic & Articulate)',
    avatarUrl: '/media/studio/presenters/arjun_mallah.jpg',
    videoPreviewUrl: '/media/studio/recordings/demo_fees_workflow.mp4',
    voiceName: 'en-IN-Arjun-Neural',
    gender: 'male',
    style: 'technical',
    badge: 'Enterprise Vision',
    description:
      'Strategic, high-precision technical delivery designed for CTOs, IT heads, and large multi-branch coaching directors.',
    recommendedModules: ['Academics', 'EduBoard', 'Security', 'Examinations', 'Infrastructure'],
  },
  {
    id: 'neha-verma',
    name: 'Neha Verma',
    role: 'Academic & Pedagogical Consultant',
    accent: 'Indian Corporate English (Pedagogical & Crisp)',
    avatarUrl: '/media/studio/presenters/neha_verma.jpg',
    videoPreviewUrl: '/media/studio/recordings/demo_eduboard_workflow.mp4',
    voiceName: 'en-IN-Neha-Neural',
    gender: 'female',
    style: 'consultant',
    badge: 'Classroom Specialist',
    description:
      'Engaging and student-focused narrative style, perfect for teacher workflows, live EduBoard demos, and parent communication showcases.',
    recommendedModules: ['EduBoard', 'Examinations', 'Attendance', 'Parent Portal', 'Timetable'],
  },
  {
    id: 'custom-presenter',
    name: 'Custom AI / Uploaded Spokesperson',
    role: 'User-Provided Virtual Presenter',
    accent: 'Custom Video or API Provider (HeyGen / D-ID)',
    avatarUrl: '/artwork/18112026/03/batch_g2.svg',
    videoPreviewUrl: '/media/studio/recordings/demo_attendance_workflow.mp4',
    voiceName: 'Custom API Voice',
    gender: 'custom',
    style: 'custom',
    badge: 'External Provider / Custom MP4',
    description:
      'Integrate your own recorded human spokesperson footage (with green-screen or transparent WebM) or cloud AI API generation from HeyGen/D-ID.',
    recommendedModules: ['All Modules'],
  },
]

export const DEFAULT_PRESENTER_PROFILE = PRESENTER_PROFILES[0]
