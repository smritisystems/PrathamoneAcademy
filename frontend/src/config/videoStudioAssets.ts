/**
 * @file        videoStudioAssets.ts
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
 * @description Authoritative registry of verified authentic application screenshots, vector brand marks, and video cuts for PrathamOne Video Studio.
 */

import type { VerifiedAssetItem } from '../types/videoStudio'

export const VERIFIED_ASSET_VAULT: VerifiedAssetItem[] = [
  // 0. ACTUAL SOFTWARE DEMONSTRATION RECORDINGS (LIVE APPLICATION DEMOS)
  {
    id: 'asset-rec-student-workflow',
    title: 'Live Student Directory & Search Demonstration',
    category: 'recording',
    moduleName: 'Student Management',
    mediaType: 'video',
    url: '/media/studio/recordings/demo_student_workflow.mp4',
    aspectRatio: '16:9',
    recommendedDuration: 15.0,
    defaultHeadline: 'Complete Student Dossier & Instant Search',
    defaultSubtitle: 'Real-time directory search, active status badges, and Aadhaar-masked KYC compliance.',
    defaultScript:
      'Watch how quickly your team can look up any student. Type a name or roll number, and access complete demographic records, guardian contacts, and encrypted documents in seconds.',
    suggestedCallouts: [
      { text: 'Sub-second Search', x: 25, y: 15 },
      { text: 'Masked Aadhaar KYC', x: 75, y: 35 },
    ],
  },
  {
    id: 'asset-rec-fees-workflow',
    title: 'Live Fee Collection & Split-Ledger Allocation',
    category: 'recording',
    moduleName: 'Fees & Payments',
    mediaType: 'video',
    url: '/media/studio/recordings/demo_fees_workflow.mp4',
    aspectRatio: '16:9',
    recommendedDuration: 18.0,
    defaultHeadline: 'Zero-Error Fee Collection & Instant Allocation',
    defaultSubtitle: 'Select student, enter payment method, allocate across tuition and exam heads, and issue receipts.',
    defaultScript:
      'Fee collection is the heartbeat of your institute. Here is how PrathamOne simplifies it: select the student, split allocations across tuition and exam fees, and issue an authentic receipt with automated ledger entries.',
    suggestedCallouts: [
      { text: 'Split-Head Allocation', x: 50, y: 55 },
      { text: 'Instant GST Receipt', x: 80, y: 25 },
    ],
  },
  {
    id: 'asset-rec-attendance-workflow',
    title: 'Live Roll Call & QR Terminal Attendance',
    category: 'recording',
    moduleName: 'Attendance',
    mediaType: 'video',
    url: '/media/studio/recordings/demo_attendance_workflow.mp4',
    aspectRatio: '16:9',
    recommendedDuration: 15.0,
    defaultHeadline: 'Dual-Mode Attendance: Digital Roll Call & QR Terminal',
    defaultSubtitle: 'Batch-wise present/absent marking with instant parent notification triggers.',
    defaultScript:
      'Daily attendance takes less than two minutes per batch. Teachers mark status with one tap, or students scan their personal QR badge at the front desk terminal.',
    suggestedCallouts: [
      { text: 'Single-Tap Roll Call', x: 30, y: 25 },
      { text: 'Automated Parent Alert', x: 70, y: 65 },
    ],
  },
  {
    id: 'asset-rec-eduboard-workflow',
    title: 'Live EduBoard Digital Greenboard & Math Studio',
    category: 'recording',
    moduleName: 'EduBoard',
    mediaType: 'video',
    url: '/media/studio/recordings/demo_eduboard_workflow.mp4',
    aspectRatio: '16:9',
    recommendedDuration: 16.0,
    defaultHeadline: 'Interactive EduBoard: Smart Classroom Greenboard',
    defaultSubtitle: 'High-precision chalk pen, geometric shapes, math formula tool, and instant slide presentation.',
    defaultScript:
      'Transform your classroom with EduBoard. Teachers can write with ultra-smooth digital chalk, sketch geometric diagrams, insert LaTeX math equations, and present teaching slides seamlessly.',
    suggestedCallouts: [
      { text: 'Zero-Latency Chalk', x: 30, y: 30 },
      { text: 'Interactive Geometry', x: 70, y: 70 },
    ],
  },

  // 1. BRANDING & IDENTITY
  {
    id: 'asset-brand-logo',
    title: 'PrathamOne Master Brand Vector',
    category: 'branding',
    moduleName: 'Brand Identity',
    url: '/artwork/18112026/03/batch_g2.svg',
    aspectRatio: '16:9',
    recommendedDuration: 8.0,
    defaultHeadline: 'PrathamOne EduOS',
    defaultSubtitle: 'Coaching Management. Simplified.',
    defaultScript:
      'Managing a coaching institute should not feel like running three different companies. Welcome to PrathamOne EduOS. Coaching Management. Simplified.',
    suggestedCallouts: [
      { text: 'Enterprise Coaching OS', x: 50, y: 35 },
      { text: 'Coaching Management. Simplified.', x: 50, y: 70 },
    ],
  },
  {
    id: 'asset-brand-crest',
    title: 'Official Circular Seal & Identity',
    category: 'branding',
    moduleName: 'Brand Identity',
    url: '/media/logo/prathamone-eduos-seal-transparent.png',
    aspectRatio: '1:1',
    recommendedDuration: 8.0,
    defaultHeadline: 'Built for High-Growth Academies',
    defaultSubtitle: 'Coaching Management. Simplified.',
    defaultScript:
      'Engineered for excellence. Experience enterprise education simplified. Upgrade your coaching academy today.',
    suggestedCallouts: [
      { text: '100% Data Integrity', x: 50, y: 75 },
    ],
  },

  // 2. EXECUTIVE DASHBOARD & PULSE
  {
    id: 'asset-dashboard-overview',
    title: 'Modern Executive Overview & KPIs',
    category: 'dashboard',
    moduleName: 'Dashboard',
    url: '/media/studio/screenshots/modern_dashboard_step1_overview.png',
    aspectRatio: '16:9',
    recommendedDuration: 12.0,
    defaultHeadline: 'Live Operational Pulse & KPIs',
    defaultSubtitle: 'Real-time financial collection, strength, and fee recovery donuts',
    defaultScript:
      'Get total institute control at a single glance. Monitor fee collections, student enrollment, and daily attendance in real-time, eliminating manual registers forever.',
    suggestedCallouts: [
      { text: 'Real-Time Fee Recovery', x: 28, y: 26 },
      { text: 'Live Attendance Pulse', x: 68, y: 26 },
      { text: 'Active Student Breakdown', x: 50, y: 55 },
    ],
  },
  {
    id: 'asset-dashboard-classic',
    title: 'Full Application Operations Center',
    category: 'dashboard',
    moduleName: 'Dashboard',
    url: '/media/studio/screenshots/02_dashboard_overview.png',
    aspectRatio: '16:9',
    recommendedDuration: 10.0,
    defaultHeadline: 'Consolidated Institute Command',
    defaultSubtitle: 'Unified metrics spanning admissions, faculty, and academic health',
    defaultScript:
      'Command your institute with deep operational visibility across all batches, fee plans, and student activities.',
    suggestedCallouts: [
      { text: 'Cash Flow Velocity', x: 30, y: 32 },
      { text: 'Batch Timetable Pulse', x: 70, y: 32 },
    ],
  },

  // 3. STUDENT MANAGEMENT & DOSSIER
  {
    id: 'asset-students-directory',
    title: 'Master Student Directory & Register',
    category: 'students',
    moduleName: 'Student Management',
    url: '/media/studio/screenshots/06_students_directory.png',
    aspectRatio: '16:9',
    recommendedDuration: 12.0,
    defaultHeadline: 'Unified Student Master Directory',
    defaultSubtitle: 'Instant multi-criteria search, lifecycle tags, and batch filters',
    defaultScript:
      'Effortlessly search and filter your entire student body with instant search, division allocations, and real-time status indicators.',
    suggestedCallouts: [
      { text: 'Active Status Filters', x: 22, y: 25 },
      { text: 'Standard & Division Sorting', x: 52, y: 25 },
      { text: 'Single Source of Truth', x: 78, y: 25 },
    ],
  },
  {
    id: 'asset-student-dossier-profile',
    title: '15-Tab Student Dossier & KYC Vault',
    category: 'students',
    moduleName: 'Student Dossier',
    url: '/media/studio/screenshots/08_student_detail_profile.png',
    aspectRatio: '16:9',
    recommendedDuration: 15.0,
    defaultHeadline: 'Complete 15-Tab Student Dossier',
    defaultSubtitle: 'DPDP statutory KYC notices, Aadhaar masking, and guardian history',
    defaultScript:
      'Manage the complete student lifecycle in one unified dossier. From multi-address tracking and academic history to DPDP statutory privacy compliance and fee ledger snapshots.',
    suggestedCallouts: [
      { text: 'DPDP Privacy Consent', x: 25, y: 36 },
      { text: 'Multiple Guardians & Contacts', x: 55, y: 36 },
      { text: 'Immutable Fee Ledger Snapshot', x: 80, y: 36 },
    ],
  },
  {
    id: 'asset-student-admission-form',
    title: 'Digital Admissions Intake Studio',
    category: 'students',
    moduleName: 'Admissions Intake',
    url: '/media/studio/screenshots/07_student_admission_form.png',
    aspectRatio: '16:9',
    recommendedDuration: 10.0,
    defaultHeadline: 'Rapid Admissions & Document Intake',
    defaultSubtitle: 'Direct lead conversion, batch assignment, and fee plan binding',
    defaultScript:
      'Enroll students in minutes with guided intake forms, automatic roll number assignment, and instant fee plan binding.',
    suggestedCallouts: [
      { text: 'Pre-Admission KYC Checklist', x: 30, y: 40 },
      { text: 'Instant Fee Plan Assignment', x: 70, y: 40 },
    ],
  },

  // 4. FEES & FINANCIAL DESK
  {
    id: 'asset-fees-plans',
    title: 'Custom Fee Structures & Frequency Rules',
    category: 'fees',
    moduleName: 'Fees & Financials',
    url: '/media/studio/screenshots/13_fee_plans_structures.png',
    aspectRatio: '16:9',
    recommendedDuration: 12.0,
    defaultHeadline: 'Flexible Fee Structures & Slabs',
    defaultSubtitle: 'Monthly, quarterly, and lump-sum installment frequency engines',
    defaultScript:
      'Design transparent fee structures with component-level breakdowns, customizable installment dates, and automated concession rules.',
    suggestedCallouts: [
      { text: 'Component Breakdown', x: 32, y: 28 },
      { text: 'Automated Installment Slabs', x: 68, y: 28 },
    ],
  },
  {
    id: 'asset-payments-ledger',
    title: 'Fee Collection Desk & Payment Ledger',
    category: 'fees',
    moduleName: 'Collection Desk',
    url: '/media/studio/screenshots/15_payments_ledger.png',
    aspectRatio: '16:9',
    recommendedDuration: 14.0,
    defaultHeadline: 'Atomic Multi-Split Collection Desk',
    defaultSubtitle: 'Cash, UPI QR, card, cheque, and net banking with 0 ledger discrepancy',
    defaultScript:
      'Say goodbye to fee leakage. Process multi-mode split payments, collect with dynamic UPI QR codes, and generate instant bilingual print vouchers with zero ledger discrepancy.',
    suggestedCallouts: [
      { text: 'Instant Dynamic UPI QR', x: 26, y: 35 },
      { text: 'Split Payment Modes', x: 50, y: 35 },
      { text: 'Immutable Audit Trail', x: 78, y: 35 },
    ],
  },
  {
    id: 'asset-payments-lock-gate',
    title: 'Audit-Locked Financial Gate',
    category: 'fees',
    moduleName: 'Financial Security',
    url: '/media/studio/screenshots/16_payments_lock_unlock_gate.png',
    aspectRatio: '16:9',
    recommendedDuration: 10.0,
    defaultHeadline: 'View-First Financial Security',
    defaultSubtitle: 'Strict role authorization and immutable ledger protection',
    defaultScript:
      'Rest easy with enterprise security. View-first governance and financial ledger immutability protect historical transaction records against accidental alterations.',
    suggestedCallouts: [
      { text: 'Explicit Edit Mode Protection', x: 50, y: 40 },
    ],
  },

  // 5. ACADEMIC ARCHITECTURE & DEDUPLICATION
  {
    id: 'asset-academics-workspace',
    title: 'Multi-Board Curriculum Architecture',
    category: 'academics',
    moduleName: 'Academic Structure',
    url: '/media/studio/screenshots/03_academic_workspace.png',
    aspectRatio: '16:9',
    recommendedDuration: 12.0,
    defaultHeadline: 'Multi-Board Curriculum Structure',
    defaultSubtitle: 'ICSE, CBSE, and State Board standards unified in one system',
    defaultScript:
      'Engineered specifically for coaching institutions. Handle multiple curriculum boards, grades, and division batches with complete structural clarity.',
    suggestedCallouts: [
      { text: 'Multi-Board Support', x: 25, y: 28 },
      { text: 'Standards & Grades', x: 50, y: 28 },
      { text: 'Shift & Batch Management', x: 75, y: 28 },
    ],
  },
  {
    id: 'asset-subjects-canonical',
    title: 'Canonical Subjects & Applicability Mapping',
    category: 'academics',
    moduleName: 'Academic Structure',
    url: '/media/studio/screenshots/05_subjects_management.png',
    aspectRatio: '16:9',
    recommendedDuration: 10.0,
    defaultHeadline: 'Zero Data Duplication (Rule 011)',
    defaultSubtitle: 'Canonical master subjects mapped seamlessly across standards',
    defaultScript:
      'Register subjects once in canonical masters and map them across multiple grades and boards without maintaining duplicate subject entries.',
    suggestedCallouts: [
      { text: 'Zero Duplicate Masters', x: 40, y: 30 },
      { text: 'Dynamic Standard Mappings', x: 72, y: 30 },
    ],
  },

  // 6. EDUBOARD HYBRID CLASSROOM
  {
    id: 'asset-eduboard-greenboard',
    title: 'EduBoard Classic Chalkboard',
    category: 'eduboard',
    moduleName: 'EduBoard Classroom',
    url: '/media/studio/screenshots/eduboard_classic_greenboard.png',
    aspectRatio: '16:9',
    recommendedDuration: 12.0,
    defaultHeadline: 'Interactive Chalkboard Teaching',
    defaultSubtitle: 'Tactile greenboard texture, chalk pens, eraser, and grid modes',
    defaultScript:
      'Elevate live teaching. EduBoard transforms any display or projector into an authentic classroom chalkboard with realistic chalk strokes and math tools.',
    suggestedCallouts: [
      { text: 'Tactile Greenboard Mode', x: 30, y: 20 },
      { text: 'Pressure-Sensitive Chalk Tools', x: 70, y: 20 },
    ],
  },
  {
    id: 'asset-eduboard-pdf-presentation',
    title: 'EduBoard PDF Presentation & Annotation',
    category: 'eduboard',
    moduleName: 'EduBoard Classroom',
    url: '/media/studio/screenshots/eduboard_pdf_presentation.png',
    aspectRatio: '16:9',
    recommendedDuration: 12.0,
    defaultHeadline: 'Digital PDF Slide Projector',
    defaultSubtitle: 'Direct PDF loading, live pen annotations, and detached presentation window',
    defaultScript:
      'Load question papers, slides, and chapter notes directly into EduBoard, annotating formulas and key concepts live during class.',
    suggestedCallouts: [
      { text: 'Direct PDF Annotation', x: 35, y: 30 },
      { text: 'Detached Projector Window', x: 75, y: 30 },
    ],
  },

  // 7. PLANNING & TIMELINE ACTIVITIES
  {
    id: 'asset-planning-timeline',
    title: 'Unified Interactive Activities Timeline',
    category: 'planning',
    moduleName: 'Planning & Activities',
    url: '/media/studio/screenshots/planning_drag_step5_timeline_view.png',
    aspectRatio: '16:9',
    recommendedDuration: 12.0,
    defaultHeadline: 'Interactive Activities & Exam Timeline',
    defaultSubtitle: 'Drag-and-drop lecture rescheduling, conflict detection, and Kanban boards',
    defaultScript:
      'Plan lectures, test schedules, and institute events on a fluid interactive timeline with automatic conflict prevention and instant rescheduling.',
    suggestedCallouts: [
      { text: 'Interactive Gantt Timeline', x: 35, y: 25 },
      { text: 'Conflict Detection', x: 75, y: 25 },
    ],
  },

  // 8. ATTENDANCE & QR TERMINAL
  {
    id: 'asset-attendance-workspace',
    title: 'Daily Roll Call & Attendance Register',
    category: 'attendance',
    moduleName: 'Attendance',
    url: '/media/studio/screenshots/11_attendance_workspace.png',
    aspectRatio: '16:9',
    recommendedDuration: 12.0,
    defaultHeadline: 'Rapid Attendance & QR Terminal',
    defaultSubtitle: 'Batch-wise daily roll call, camera QR terminal, and absenteeism alerts',
    defaultScript:
      'Mark student attendance in seconds. Use the high-speed QR check-in terminal to automatically record entry and trigger absenteeism alerts to parents.',
    suggestedCallouts: [
      { text: 'High-Speed QR Check-in', x: 30, y: 35 },
      { text: 'Automated Absentee Alerts', x: 70, y: 35 },
    ],
  },

  // 9. EXAMINATIONS & REPORT CARDS
  {
    id: 'asset-examinations-results',
    title: 'Examination Schedules & Marks Entry',
    category: 'exams',
    moduleName: 'Examinations',
    url: '/media/studio/screenshots/12_examinations_results.png',
    aspectRatio: '16:9',
    recommendedDuration: 12.0,
    defaultHeadline: 'Examinations, Rankings & Report Cards',
    defaultSubtitle: 'Marks entry grid, automated ranks, percentiles, and graphical report cards',
    defaultScript:
      'Streamline assessment cycles with fast marks entry, automatic rank computation, and instant high-resolution student report cards.',
    suggestedCallouts: [
      { text: 'Automated Rank Computation', x: 32, y: 32 },
      { text: 'Graphical Report Cards', x: 72, y: 32 },
    ],
  },

  // 10. FACULTY & TEACHER PAYROLL
  {
    id: 'asset-teacher-payroll',
    title: 'Verified Teaching Sessions & Faculty Payroll',
    category: 'payroll',
    moduleName: 'Teacher Payroll',
    url: '/media/studio/screenshots/tab1_monthly_payroll.png',
    aspectRatio: '16:9',
    recommendedDuration: 12.0,
    defaultHeadline: 'Faculty Compensation & Session Ledger',
    defaultSubtitle: 'Lecture-based and fixed salary computation with verifiable session logs',
    defaultScript:
      'Ensure fair, transparent faculty compensation. Calculate monthly wages directly from verified teaching logs and generate salary vouchers with one click.',
    suggestedCallouts: [
      { text: 'Verified Session Registers', x: 30, y: 30 },
      { text: 'Automated Wage Slips', x: 70, y: 30 },
    ],
  },

  // 11. COMMUNICATION & WHATSAPP
  {
    id: 'asset-communication-center',
    title: 'Multichannel Communication & WhatsApp Hub',
    category: 'communication',
    moduleName: 'Communication',
    url: '/media/studio/screenshots/26_communication_center.png',
    aspectRatio: '16:9',
    recommendedDuration: 12.0,
    defaultHeadline: 'Multichannel WhatsApp Communication',
    defaultSubtitle: 'Dynamic token placeholders, broadcast composer, and delivery logs',
    defaultScript:
      'Harness the simplicity of WhatsApp. Broadcast announcements, dispatch automated fee reminders, and track delivery status in real-time.',
    suggestedCallouts: [
      { text: 'Direct WhatsApp Web Stream', x: 28, y: 34 },
      { text: 'Dynamic Placeholder Tokens', x: 68, y: 34 },
    ],
  },

  // 12. FORMS & DOCUMENT PRINT STUDIO
  {
    id: 'asset-forms-documents',
    title: 'Print Forms & KYC Document Studio',
    category: 'branding',
    moduleName: 'Forms & Documents',
    url: '/media/studio/screenshots/24_forms_documents_hub.png',
    aspectRatio: '16:9',
    recommendedDuration: 10.0,
    defaultHeadline: 'Statutory KYC & Document Studio',
    defaultSubtitle: 'Printable admission forms, student ID cards with barcodes, and certificates',
    defaultScript:
      'Generate professional, institution-branded ID cards with barcodes, admission forms, and academic certificates directly from verified student records.',
    suggestedCallouts: [
      { text: 'Barcoded Student ID Cards', x: 32, y: 36 },
      { text: 'DPDP Statutory Forms', x: 70, y: 36 },
    ],
  },
]
