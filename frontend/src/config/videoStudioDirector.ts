/**
 * @file        videoStudioDirector.ts
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
 * @description AI Video Director storyboards, production presets, and deterministic scene generation engine for PrathamOne Video Studio.
 */

import type {
  AiDirectorPreset,
  DirectorPresetId,
  VideoSceneDefinition,
  VideoStudioProject,
} from '../types/videoStudio'
import { VERIFIED_ASSET_VAULT } from './videoStudioAssets'

export const DIRECTOR_PRESETS: AiDirectorPreset[] = [
  {
    id: 'master-120',
    title: '120s Master Product Demonstration',
    subtitle: 'Complete end-to-end software walkthrough (0-120 sec)',
    targetDuration: 120,
    aspectRatio: '16:9',
    iconName: 'Film',
    badgeText: 'Flagship 2-Min Demo',
    scenesCount: 10,
    description:
      'The comprehensive enterprise product video covering Dashboard, Students, Fees Counter, Academics, EduBoard, Attendance, Exams, WhatsApp, and Closing Call-to-Action.',
    recommendedTarget: 'Website Homepage, YouTube Channel, Major Sales Demos',
  },
  {
    id: 'executive-60',
    title: '60s Executive Leadership Overview',
    subtitle: 'High-level operational and financial pulse for institute directors',
    targetDuration: 60,
    aspectRatio: '16:9',
    iconName: 'Sparkles',
    badgeText: 'Executive Tour',
    scenesCount: 5,
    description:
      'Fast-paced, executive-focused tour highlighting real-time dashboard KPIs, fee recovery velocity, and automated WhatsApp parent communications.',
    recommendedTarget: 'Director Presentations, Investor Decks, Quick Demos',
  },
  {
    id: 'social-30',
    title: '30s High-Impact Social Reel',
    subtitle: 'Punchy mobile-first teaser for social media ads',
    targetDuration: 30,
    aspectRatio: '9:16',
    iconName: 'Smartphone',
    badgeText: 'Reels / Shorts',
    scenesCount: 4,
    description:
      'High-energy vertical video optimized for Instagram Reels, YouTube Shorts, and WhatsApp Status with bold headline callouts and fast transitions.',
    recommendedTarget: 'Instagram, YouTube Shorts, WhatsApp Status, LinkedIn Ads',
  },
  {
    id: 'fees-45',
    title: '45s Automated Fee Counter Showcase',
    subtitle: 'Deep-dive into multi-mode collections & zero ledger discrepancy',
    targetDuration: 45,
    aspectRatio: '16:9',
    iconName: 'CreditCard',
    badgeText: 'Feature Deep Dive',
    scenesCount: 4,
    description:
      'Focuses purely on fee structures, dynamic UPI QR collections, split payment modes, instant thermal receipts, and audit trail locking.',
    recommendedTarget: 'Accountants, Institute Treasurers, Finance Webinars',
  },
  {
    id: 'eduboard-45',
    title: '45s EduBoard Smart Classroom Showcase',
    subtitle: 'Interactive greenboard, math tools, and PDF presentation',
    targetDuration: 45,
    aspectRatio: '16:9',
    iconName: 'Presentation',
    badgeText: 'Teacher & Classroom',
    scenesCount: 4,
    description:
      'Showcases the EduBoard interactive teaching engine, tactile chalkboard feel, math shape tools, PDF slide projector, and popout presentation window.',
    recommendedTarget: 'Faculty Demonstrations, Smart Classroom Pitches',
  },
  {
    id: 'students-45',
    title: '45s Student Lifecycle & KYC Dossier',
    subtitle: '15-tab profile, DPDP statutory notices, and document vault',
    targetDuration: 45,
    aspectRatio: '16:9',
    iconName: 'Users',
    badgeText: 'Compliance & Student',
    scenesCount: 4,
    description:
      'Highlights the 15-tab student profile, multi-guardian links, Aadhaar privacy masking, pre-admission KYC checklist, and lifecycle state management.',
    recommendedTarget: 'Admissions Officers, Compliance Auditors, Parents',
  },
  {
    id: 'whatsapp-45',
    title: '45s WhatsApp Automation Showcase',
    subtitle: 'Automated fee dues, absenteeism alerts, and broadcast composer',
    targetDuration: 45,
    aspectRatio: '16:9',
    iconName: 'MessageSquare',
    badgeText: 'Parent Engagement',
    scenesCount: 4,
    description:
      'Demonstrates direct WhatsApp Web streams, automated fee reminders with dynamic payment tokens, and absenteeism alerts dispatched directly to parents.',
    recommendedTarget: 'Operations Managers, Institute Owners, Customer Success',
  },
]

/**
 * Helper to fetch verified asset by ID or fallback
 */
function getAsset(id: string) {
  const found = VERIFIED_ASSET_VAULT.find((a) => a.id === id)
  if (found) return found
  return VERIFIED_ASSET_VAULT[0]
}

/**
 * Builds the 120-second Master Product Demonstration Storyboard
 */
function buildMaster120Scenes(): VideoSceneDefinition[] {
  return [
    // Scene 01: 0 - 8s (Brand Identity)
    {
      id: 'sc-01-intro',
      order: 1,
      title: 'PrathamOne EduOS — Brand Identity',
      subtitle: 'Coaching Management. Simplified.',
      duration: 8.0,
      transition: 'fade',
      transitionDuration: 0.6,
      media: {
        type: 'image',
        url: getAsset('asset-brand-logo').url,
        fit: 'contain',
        backgroundColor: '#071C44',
      },
      motion: {
        type: 'zoom-in',
        startScale: 0.95,
        endScale: 1.05,
        startXPercent: 50,
        startYPercent: 50,
        endXPercent: 50,
        endYPercent: 50,
        easing: 'ease-out',
      },
      callouts: [
        {
          id: 'c-1',
          text: 'Enterprise Coaching OS',
          subtext: 'Built for High-Growth Academies',
          xPercent: 50,
          yPercent: 28,
          delaySeconds: 1.0,
          badgeColor: 'amber',
        },
        {
          id: 'c-2',
          text: 'Coaching Management. Simplified.',
          xPercent: 50,
          yPercent: 78,
          delaySeconds: 2.5,
          badgeColor: 'orange',
        },
      ],
      cursor: {
        show: false,
        startXPercent: 50,
        startYPercent: 50,
        clickXPercent: 50,
        clickYPercent: 50,
        clickTimeSeconds: 0,
      },
      narration: {
        script:
          'Managing a coaching institute should not feel like running three different companies. Welcome to PrathamOne EduOS. Coaching Management. Simplified.',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
      },
      captions: {
        show: true,
        style: 'bottom-pill',
      },
      presenter: {
        enabled: true,
        profileId: 'priya-sharma',
        mode: 'full-screen',
        position: 'bottom-right',
        avatarUrl: '/media/studio/presenters/priya_sharma.jpg',
        speechScript:
          'Managing a coaching institute should not feel like running three different companies. Welcome to PrathamOne EduOS. Coaching Management. Simplified.',
      },
    },

    // Scene 02: 8 - 20s (Executive Dashboard)
    {
      id: 'sc-02-dashboard',
      order: 2,
      title: 'Real-Time Executive Dashboard',
      subtitle: 'Instant pulse on collections, active strength & recovery donuts',
      duration: 12.0,
      transition: 'slide-left',
      transitionDuration: 0.5,
      media: {
        type: 'image',
        url: getAsset('asset-dashboard-overview').url,
        fit: 'mockup',
        mockupType: 'display',
        backgroundColor: '#090D16',
      },
      motion: {
        type: 'ken-burns',
        startScale: 1.0,
        endScale: 1.15,
        startXPercent: 50,
        startYPercent: 40,
        endXPercent: 35,
        endYPercent: 30,
      },
      callouts: [
        {
          id: 'c-3',
          text: 'Real-Time Fee Recovery',
          xPercent: 30,
          yPercent: 32,
          delaySeconds: 1.5,
          badgeColor: 'emerald',
        },
        {
          id: 'c-4',
          text: 'Active vs Former Breakdown',
          xPercent: 68,
          yPercent: 32,
          delaySeconds: 3.5,
          badgeColor: 'blue',
        },
      ],
      cursor: {
        show: true,
        startXPercent: 60,
        startYPercent: 70,
        clickXPercent: 30,
        clickYPercent: 32,
        clickTimeSeconds: 4.0,
        clickLabel: 'Inspect Collections',
      },
      narration: {
        script:
          'Get total institute control at a single glance. Monitor fee collections, student enrollment, and daily attendance in real-time, eliminating manual registers forever.',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
      },
      captions: {
        show: true,
        style: 'bottom-pill',
      },
      presenter: {
        enabled: true,
        profileId: 'priya-sharma',
        mode: 'pip',
        position: 'bottom-right',
        avatarUrl: '/media/studio/presenters/priya_sharma.jpg',
      },
    },

    // Scene 03: 20 - 35s (Student Management & 15-Tab Dossier - LIVE RECORDING)
    {
      id: 'sc-03-students',
      order: 3,
      title: 'Unified Student Dossier & Live Search',
      subtitle: 'Real-time directory search, active status badges, and Aadhaar-masked KYC compliance',
      duration: 15.0,
      transition: 'fade',
      transitionDuration: 0.5,
      media: {
        type: 'video',
        url: '/media/studio/recordings/demo_student_workflow.mp4',
        fit: 'mockup',
        mockupType: 'macbook',
        backgroundColor: '#071C44',
      },
      motion: {
        type: 'static',
        startScale: 1.0,
        endScale: 1.0,
        startXPercent: 50,
        startYPercent: 50,
        endXPercent: 50,
        endYPercent: 50,
      },
      callouts: [
        {
          id: 'c-5',
          text: 'Sub-second Student Search',
          xPercent: 28,
          yPercent: 22,
          delaySeconds: 1.5,
          badgeColor: 'emerald',
        },
        {
          id: 'c-6',
          text: 'Masked Aadhaar KYC Compliance',
          xPercent: 72,
          yPercent: 35,
          delaySeconds: 4.0,
          badgeColor: 'blue',
        },
      ],
      cursor: {
        show: true,
        startXPercent: 40,
        startYPercent: 60,
        clickXPercent: 28,
        clickYPercent: 38,
        clickTimeSeconds: 3.0,
        clickLabel: 'Mask Aadhaar',
      },
      narration: {
        script:
          'Watch how quickly your staff can locate any student profile. Type a name or roll number, and open complete academic histories, contact trees, and encrypted compliance documents in seconds.',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
      },
      captions: {
        show: true,
        style: 'bottom-pill',
      },
      presenter: {
        enabled: true,
        profileId: 'priya-sharma',
        mode: 'pip',
        position: 'bottom-right',
        avatarUrl: '/media/studio/presenters/priya_sharma.jpg',
      },
    },

    // Scene 04: 35 - 48s (Fees & Collection Desk - LIVE RECORDING)
    {
      id: 'sc-04-fees',
      order: 4,
      title: 'Live Fee Collection Desk & Split-Ledger',
      subtitle: 'Multi-split modes, dynamic UPI QR, and instant print vouchers',
      duration: 13.0,
      transition: 'zoom-in',
      transitionDuration: 0.5,
      media: {
        type: 'video',
        url: '/media/studio/recordings/demo_fees_workflow.mp4',
        fit: 'mockup',
        mockupType: 'display',
        backgroundColor: '#051535',
      },
      motion: {
        type: 'static',
        startScale: 1.0,
        endScale: 1.0,
        startXPercent: 50,
        startYPercent: 50,
        endXPercent: 50,
        endYPercent: 50,
      },
      callouts: [
        {
          id: 'c-7',
          text: 'Split Head Allocation',
          xPercent: 25,
          yPercent: 36,
          delaySeconds: 1.5,
          badgeColor: 'emerald',
        },
        {
          id: 'c-8',
          text: 'Instant GST Receipt',
          xPercent: 74,
          yPercent: 36,
          delaySeconds: 3.5,
          badgeColor: 'orange',
        },
      ],
      cursor: {
        show: true,
        startXPercent: 55,
        startYPercent: 55,
        clickXPercent: 25,
        clickYPercent: 36,
        clickTimeSeconds: 3.2,
        clickLabel: 'Generate QR',
      },
      narration: {
        script:
          'Fee collection is the heartbeat of your institute. Here is how PrathamOne simplifies it: select the student, split allocations across tuition and exam fees, and issue an authentic receipt with automated ledger entries.',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
      },
      captions: {
        show: true,
        style: 'bottom-pill',
      },
      presenter: {
        enabled: true,
        profileId: 'priya-sharma',
        mode: 'pip',
        position: 'bottom-right',
        avatarUrl: '/media/studio/presenters/priya_sharma.jpg',
      },
    },

    // Scene 05: 48 - 60s (Academic Architecture & Deduplication)
    {
      id: 'sc-05-academics',
      order: 5,
      title: 'Multi-Board Academic Structure',
      subtitle: 'Canonical subject deduplication across ICSE, CBSE & State Boards',
      duration: 12.0,
      transition: 'slide-right',
      transitionDuration: 0.5,
      media: {
        type: 'image',
        url: getAsset('asset-academics-workspace').url,
        fit: 'mockup',
        mockupType: 'display',
        backgroundColor: '#090D16',
      },
      motion: {
        type: 'ken-burns',
        startScale: 1.0,
        endScale: 1.12,
        startXPercent: 45,
        startYPercent: 40,
        endXPercent: 55,
        endYPercent: 35,
      },
      callouts: [
        {
          id: 'c-9',
          text: 'Multi-Board Curricula Support',
          xPercent: 28,
          yPercent: 30,
          delaySeconds: 1.5,
          badgeColor: 'navy',
        },
        {
          id: 'c-10',
          text: 'Zero Subject Duplication (Rule 011)',
          xPercent: 72,
          yPercent: 30,
          delaySeconds: 3.5,
          badgeColor: 'emerald',
        },
      ],
      cursor: {
        show: false,
        startXPercent: 50,
        startYPercent: 50,
        clickXPercent: 50,
        clickYPercent: 50,
        clickTimeSeconds: 0,
      },
      narration: {
        script:
          'Engineered specifically for coaching institutions. Handle multiple curriculum boards, grades, and division batches with complete structural clarity.',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
      },
      captions: {
        show: true,
        style: 'bottom-pill',
      },
      presenter: {
        enabled: true,
        profileId: 'arjun-mallah',
        mode: 'pip',
        position: 'bottom-right',
        avatarUrl: '/media/studio/presenters/arjun_mallah.jpg',
      },
    },

    // Scene 06: 60 - 72s (EduBoard Smart Classroom - LIVE RECORDING)
    {
      id: 'sc-06-eduboard',
      order: 6,
      title: 'EduBoard Interactive Classroom Live Demonstration',
      subtitle: 'Classic greenboard texture, math tools, and PDF presentation',
      duration: 12.0,
      transition: 'fade',
      transitionDuration: 0.5,
      media: {
        type: 'video',
        url: '/media/studio/recordings/demo_eduboard_workflow.mp4',
        fit: 'mockup',
        mockupType: 'ipad',
        backgroundColor: '#082354',
      },
      motion: {
        type: 'static',
        startScale: 1.0,
        endScale: 1.0,
        startXPercent: 50,
        startYPercent: 50,
        endXPercent: 50,
        endYPercent: 50,
      },
      callouts: [
        {
          id: 'c-11',
          text: 'Tactile Greenboard Texture',
          xPercent: 32,
          yPercent: 24,
          delaySeconds: 1.5,
          badgeColor: 'emerald',
        },
        {
          id: 'c-12',
          text: 'Detached Dual-Window Projector',
          xPercent: 70,
          yPercent: 24,
          delaySeconds: 3.5,
          badgeColor: 'amber',
        },
      ],
      cursor: {
        show: true,
        startXPercent: 30,
        startYPercent: 60,
        clickXPercent: 45,
        clickYPercent: 45,
        clickTimeSeconds: 3.0,
        clickLabel: 'Draw Shape',
      },
      narration: {
        script:
          'Elevate live teaching. EduBoard transforms any display or projector into an authentic classroom chalkboard with realistic chalk strokes and math tools.',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
      },
      captions: {
        show: true,
        style: 'bottom-pill',
      },
      presenter: {
        enabled: true,
        profileId: 'neha-verma',
        mode: 'pip',
        position: 'bottom-right',
        avatarUrl: '/media/studio/presenters/neha_verma.jpg',
      },
    },

    // Scene 07: 72 - 84s (Attendance & QR Terminal - LIVE RECORDING)
    {
      id: 'sc-07-attendance',
      order: 7,
      title: 'Live Roll-Call & QR Terminal Attendance',
      subtitle: 'Batch roll-call, camera QR terminal, and automated parent alerts',
      duration: 12.0,
      transition: 'slide-left',
      transitionDuration: 0.5,
      media: {
        type: 'video',
        url: '/media/studio/recordings/demo_attendance_workflow.mp4',
        fit: 'mockup',
        mockupType: 'display',
        backgroundColor: '#071C44',
      },
      motion: {
        type: 'static',
        startScale: 1.0,
        endScale: 1.0,
        startXPercent: 50,
        startYPercent: 50,
        endXPercent: 50,
        endYPercent: 50,
      },
      callouts: [
        {
          id: 'c-13',
          text: 'Instant QR Card Scan',
          xPercent: 30,
          yPercent: 36,
          delaySeconds: 1.5,
          badgeColor: 'blue',
        },
        {
          id: 'c-14',
          text: 'Instant Parent WhatsApp Notice',
          xPercent: 72,
          yPercent: 36,
          delaySeconds: 3.5,
          badgeColor: 'orange',
        },
      ],
      cursor: {
        show: true,
        startXPercent: 20,
        startYPercent: 50,
        clickXPercent: 30,
        clickYPercent: 36,
        clickTimeSeconds: 2.8,
        clickLabel: 'Check-In Student',
      },
      narration: {
        script:
          'Mark student attendance in seconds. Use the high-speed QR check-in terminal to automatically record entry and trigger absenteeism alerts to parents.',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
      },
      captions: {
        show: true,
        style: 'bottom-pill',
      },
      presenter: {
        enabled: true,
        profileId: 'priya-sharma',
        mode: 'pip',
        position: 'bottom-right',
        avatarUrl: '/media/studio/presenters/priya_sharma.jpg',
      },
    },

    // Scene 08: 84 - 96s (Examinations & Report Cards)
    {
      id: 'sc-08-exams',
      order: 8,
      title: 'Examinations, Rankings & Report Cards',
      subtitle: 'Marks entry grid, automated ranks, percentiles, and graphical cards',
      duration: 12.0,
      transition: 'fade',
      transitionDuration: 0.5,
      media: {
        type: 'image',
        url: getAsset('asset-examinations-results').url,
        fit: 'mockup',
        mockupType: 'macbook',
        backgroundColor: '#090D16',
      },
      motion: {
        type: 'zoom-in',
        startScale: 1.02,
        endScale: 1.16,
        startXPercent: 50,
        startYPercent: 45,
        endXPercent: 45,
        endYPercent: 35,
      },
      callouts: [
        {
          id: 'c-15',
          text: 'Automated Rank & Percentiles',
          xPercent: 32,
          yPercent: 34,
          delaySeconds: 1.5,
          badgeColor: 'amber',
        },
        {
          id: 'c-16',
          text: 'Graphical Student Report Cards',
          xPercent: 74,
          yPercent: 34,
          delaySeconds: 3.5,
          badgeColor: 'emerald',
        },
      ],
      cursor: {
        show: true,
        startXPercent: 65,
        startYPercent: 65,
        clickXPercent: 74,
        clickYPercent: 34,
        clickTimeSeconds: 3.5,
        clickLabel: 'Print Report Card',
      },
      narration: {
        script:
          'Streamline assessment cycles with fast marks entry, automatic rank computation, and instant high-resolution student report cards.',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
      },
      captions: {
        show: true,
        style: 'bottom-pill',
      },
      presenter: {
        enabled: true,
        profileId: 'neha-verma',
        mode: 'pip',
        position: 'bottom-right',
        avatarUrl: '/media/studio/presenters/neha_verma.jpg',
      },
    },

    // Scene 09: 96 - 108s (Communication & WhatsApp)
    {
      id: 'sc-09-whatsapp',
      order: 9,
      title: 'Multichannel WhatsApp Communication',
      subtitle: 'Dynamic placeholder tokens, fee reminders & broadcast composer',
      duration: 12.0,
      transition: 'slide-right',
      transitionDuration: 0.5,
      media: {
        type: 'image',
        url: getAsset('asset-communication-center').url,
        fit: 'mockup',
        mockupType: 'floating-card',
        backgroundColor: '#051535',
      },
      motion: {
        type: 'ken-burns',
        startScale: 1.02,
        endScale: 1.15,
        startXPercent: 55,
        startYPercent: 40,
        endXPercent: 40,
        endYPercent: 35,
      },
      callouts: [
        {
          id: 'c-17',
          text: 'Direct WhatsApp Web Stream',
          xPercent: 28,
          yPercent: 36,
          delaySeconds: 1.5,
          badgeColor: 'emerald',
        },
        {
          id: 'c-18',
          text: 'Automated Due Reminder Queues',
          xPercent: 70,
          yPercent: 36,
          delaySeconds: 3.5,
          badgeColor: 'blue',
        },
      ],
      cursor: {
        show: true,
        startXPercent: 35,
        startYPercent: 65,
        clickXPercent: 28,
        clickYPercent: 36,
        clickTimeSeconds: 3.0,
        clickLabel: 'Send WhatsApp Alert',
      },
      narration: {
        script:
          'Harness the simplicity of WhatsApp. Broadcast announcements, dispatch automated fee reminders, and track delivery status in real-time.',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
      },
      captions: {
        show: true,
        style: 'bottom-pill',
      },
      presenter: {
        enabled: true,
        profileId: 'priya-sharma',
        mode: 'pip',
        position: 'bottom-right',
        avatarUrl: '/media/studio/presenters/priya_sharma.jpg',
      },
    },

    // Scene 10: 108 - 120s (Closing Call to Action)
    {
      id: 'sc-10-closing',
      order: 10,
      title: 'PrathamOne EduOS — Call to Action',
      subtitle: 'Coaching Management. Simplified.',
      duration: 12.0,
      transition: 'dip-navy',
      transitionDuration: 0.6,
      media: {
        type: 'image',
        url: getAsset('asset-brand-crest').url,
        fit: 'contain',
        backgroundColor: '#071C44',
      },
      motion: {
        type: 'zoom-in',
        startScale: 0.96,
        endScale: 1.04,
        startXPercent: 50,
        startYPercent: 50,
        endXPercent: 50,
        endYPercent: 50,
      },
      callouts: [
        {
          id: 'c-19',
          text: 'Zero Data Loss Guarantee',
          xPercent: 50,
          yPercent: 26,
          delaySeconds: 1.5,
          badgeColor: 'emerald',
        },
        {
          id: 'c-20',
          text: 'prathamone.com',
          subtext: 'Get Started Today',
          xPercent: 50,
          yPercent: 82,
          delaySeconds: 3.0,
          badgeColor: 'orange',
        },
      ],
      cursor: {
        show: false,
        startXPercent: 50,
        startYPercent: 50,
        clickXPercent: 50,
        clickYPercent: 50,
        clickTimeSeconds: 0,
      },
      narration: {
        script:
          'PrathamOne EduOS. Coaching management simplified. Upgrade your coaching academy today.',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
      },
      captions: {
        show: true,
        style: 'bottom-pill',
      },
      presenter: {
        enabled: true,
        profileId: 'priya-sharma',
        mode: 'full-screen',
        position: 'bottom-right',
        avatarUrl: '/media/studio/presenters/priya_sharma.jpg',
      },
    },
  ]
}

/**
 * Builds the 60-second Executive Leadership Storyboard
 */
function buildExecutive60Scenes(): VideoSceneDefinition[] {
  return [
    {
      id: 'sc-exec-01',
      order: 1,
      title: 'PrathamOne EduOS',
      subtitle: 'Coaching Management. Simplified.',
      duration: 8.0,
      transition: 'fade',
      transitionDuration: 0.5,
      media: {
        type: 'image',
        url: getAsset('asset-brand-logo').url,
        fit: 'contain',
        backgroundColor: '#071C44',
      },
      motion: {
        type: 'zoom-in',
        startScale: 0.95,
        endScale: 1.05,
        startXPercent: 50,
        startYPercent: 50,
        endXPercent: 50,
        endYPercent: 50,
      },
      callouts: [
        {
          id: 'ce-1',
          text: 'Executive Coaching Operating System',
          xPercent: 50,
          yPercent: 30,
          delaySeconds: 1.0,
          badgeColor: 'orange',
        },
      ],
      cursor: { show: false, startXPercent: 50, startYPercent: 50, clickXPercent: 50, clickYPercent: 50, clickTimeSeconds: 0 },
      narration: {
        script: 'Welcome to PrathamOne EduOS. The high-integrity operating system designed for modern coaching institute leadership.',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
      },
      captions: { show: true, style: 'bottom-pill' },
    },
    {
      id: 'sc-exec-02',
      order: 2,
      title: 'Executive Real-Time Dashboard',
      subtitle: 'Daily collection pulse, student lifecycle, and cash velocity',
      duration: 14.0,
      transition: 'slide-left',
      transitionDuration: 0.5,
      media: {
        type: 'image',
        url: getAsset('asset-dashboard-overview').url,
        fit: 'mockup',
        mockupType: 'display',
        backgroundColor: '#090D16',
      },
      motion: {
        type: 'ken-burns',
        startScale: 1.0,
        endScale: 1.15,
        startXPercent: 50,
        startYPercent: 40,
        endXPercent: 35,
        endYPercent: 30,
      },
      callouts: [
        {
          id: 'ce-2',
          text: 'Real-Time Fee Recovery KPIs',
          xPercent: 30,
          yPercent: 32,
          delaySeconds: 1.5,
          badgeColor: 'emerald',
        },
      ],
      cursor: {
        show: true,
        startXPercent: 60,
        startYPercent: 70,
        clickXPercent: 30,
        clickYPercent: 32,
        clickTimeSeconds: 4.0,
        clickLabel: 'Collections',
      },
      narration: {
        script: 'Track enrollment growth, daily cash collections, and outstanding dues in real-time from a single high-clarity executive dashboard.',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
      },
      captions: { show: true, style: 'bottom-pill' },
    },
    {
      id: 'sc-exec-03',
      order: 3,
      title: 'Atomic Fee Collection Counter',
      subtitle: 'Dynamic UPI QR, split payment modes, and zero fee leakage',
      duration: 14.0,
      transition: 'fade',
      transitionDuration: 0.5,
      media: {
        type: 'image',
        url: getAsset('asset-payments-ledger').url,
        fit: 'mockup',
        mockupType: 'floating-card',
        backgroundColor: '#051535',
      },
      motion: {
        type: 'zoom-in',
        startScale: 1.0,
        endScale: 1.14,
        startXPercent: 50,
        startYPercent: 45,
        endXPercent: 40,
        endYPercent: 35,
      },
      callouts: [
        {
          id: 'ce-3',
          text: 'Zero Financial Leakage',
          xPercent: 35,
          yPercent: 36,
          delaySeconds: 1.5,
          badgeColor: 'emerald',
        },
      ],
      cursor: {
        show: true,
        startXPercent: 55,
        startYPercent: 55,
        clickXPercent: 35,
        clickYPercent: 36,
        clickTimeSeconds: 3.5,
        clickLabel: 'Verify Ledger',
      },
      narration: {
        script: 'Eliminate financial discrepancies with automated split allocations, dynamic UPI QR payments, and immutable audit ledgers.',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
      },
      captions: { show: true, style: 'bottom-pill' },
    },
    {
      id: 'sc-exec-04',
      order: 4,
      title: 'Automated Parent Engagement',
      subtitle: 'WhatsApp reminders, QR attendance alerts, and broadcast logs',
      duration: 14.0,
      transition: 'slide-right',
      transitionDuration: 0.5,
      media: {
        type: 'image',
        url: getAsset('asset-communication-center').url,
        fit: 'mockup',
        mockupType: 'macbook',
        backgroundColor: '#071C44',
      },
      motion: {
        type: 'ken-burns',
        startScale: 1.02,
        endScale: 1.15,
        startXPercent: 55,
        startYPercent: 40,
        endXPercent: 40,
        endYPercent: 35,
      },
      callouts: [
        {
          id: 'ce-4',
          text: 'Automated WhatsApp Triggers',
          xPercent: 35,
          yPercent: 36,
          delaySeconds: 1.5,
          badgeColor: 'emerald',
        },
      ],
      cursor: {
        show: true,
        startXPercent: 35,
        startYPercent: 65,
        clickXPercent: 35,
        clickYPercent: 36,
        clickTimeSeconds: 3.0,
        clickLabel: 'Dispatch Queue',
      },
      narration: {
        script: 'Build parent trust effortlessly. Keep families updated with automated WhatsApp attendance alerts, fee receipts, and exam results.',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
      },
      captions: { show: true, style: 'bottom-pill' },
    },
    {
      id: 'sc-exec-05',
      order: 5,
      title: 'PrathamOne EduOS',
      subtitle: 'Coaching Management. Simplified.',
      duration: 10.0,
      transition: 'dip-navy',
      transitionDuration: 0.6,
      media: {
        type: 'image',
        url: getAsset('asset-brand-crest').url,
        fit: 'contain',
        backgroundColor: '#071C44',
      },
      motion: {
        type: 'zoom-in',
        startScale: 0.96,
        endScale: 1.04,
        startXPercent: 50,
        startYPercent: 50,
        endXPercent: 50,
        endYPercent: 50,
      },
      callouts: [
        {
          id: 'ce-5',
          text: 'prathamone.com',
          subtext: 'Schedule a Leadership Consultation',
          xPercent: 50,
          yPercent: 80,
          delaySeconds: 1.5,
          badgeColor: 'orange',
        },
      ],
      cursor: { show: false, startXPercent: 50, startYPercent: 50, clickXPercent: 50, clickYPercent: 50, clickTimeSeconds: 0 },
      narration: {
        script: 'PrathamOne EduOS. Elevate your coaching academy to enterprise standards today.',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
      },
      captions: { show: true, style: 'bottom-pill' },
    },
  ]
}

/**
 * Builds the 30-second Social Reel Storyboard (Vertical 9:16 or Square 1:1)
 */
function buildSocial30Scenes(): VideoSceneDefinition[] {
  return [
    {
      id: 'sc-soc-01',
      order: 1,
      title: 'Still managing your coaching on spreadsheets?',
      subtitle: 'There is a better way.',
      duration: 6.0,
      transition: 'fade',
      transitionDuration: 0.4,
      media: {
        type: 'image',
        url: getAsset('asset-brand-logo').url,
        fit: 'contain',
        backgroundColor: '#071C44',
      },
      motion: {
        type: 'zoom-in',
        startScale: 0.95,
        endScale: 1.08,
        startXPercent: 50,
        startYPercent: 50,
        endXPercent: 50,
        endYPercent: 50,
      },
      callouts: [
        {
          id: 'cs-1',
          text: 'Stop Manual Spreadsheets',
          xPercent: 50,
          yPercent: 30,
          delaySeconds: 0.8,
          badgeColor: 'orange',
        },
      ],
      cursor: { show: false, startXPercent: 50, startYPercent: 50, clickXPercent: 50, clickYPercent: 50, clickTimeSeconds: 0 },
      narration: {
        script: 'Still running your coaching academy on messy spreadsheets and manual fee registers? Meet PrathamOne EduOS.',
        rate: 1.05,
        pitch: 1.0,
        volume: 1.0,
      },
      captions: { show: true, style: 'centered-banner' },
    },
    {
      id: 'sc-soc-02',
      order: 2,
      title: 'Instant UPI QR Fee Collections',
      subtitle: 'Zero fee leakage. Instant print receipts.',
      duration: 8.0,
      transition: 'zoom-in',
      transitionDuration: 0.4,
      media: {
        type: 'image',
        url: getAsset('asset-payments-ledger').url,
        fit: 'mockup',
        mockupType: 'floating-card',
        backgroundColor: '#051535',
      },
      motion: {
        type: 'zoom-in',
        startScale: 1.0,
        endScale: 1.2,
        startXPercent: 50,
        startYPercent: 45,
        endXPercent: 35,
        endYPercent: 35,
      },
      callouts: [
        {
          id: 'cs-2',
          text: 'Dynamic UPI QR Code',
          xPercent: 30,
          yPercent: 35,
          delaySeconds: 1.0,
          badgeColor: 'emerald',
        },
      ],
      cursor: {
        show: true,
        startXPercent: 50,
        startYPercent: 60,
        clickXPercent: 30,
        clickYPercent: 35,
        clickTimeSeconds: 2.2,
        clickLabel: 'Instant Scan',
      },
      narration: {
        script: 'Collect fees instantly with dynamic UPI QR codes and split payments. Zero fee leakage, guaranteed.',
        rate: 1.05,
        pitch: 1.0,
        volume: 1.0,
      },
      captions: { show: true, style: 'centered-banner' },
    },
    {
      id: 'sc-soc-03',
      order: 3,
      title: 'Automated WhatsApp Parent Updates',
      subtitle: 'Attendance, fee receipts & exam ranks',
      duration: 8.0,
      transition: 'slide-left',
      transitionDuration: 0.4,
      media: {
        type: 'image',
        url: getAsset('asset-communication-center').url,
        fit: 'mockup',
        mockupType: 'floating-card',
        backgroundColor: '#071C44',
      },
      motion: {
        type: 'ken-burns',
        startScale: 1.0,
        endScale: 1.18,
        startXPercent: 50,
        startYPercent: 40,
        endXPercent: 35,
        endYPercent: 35,
      },
      callouts: [
        {
          id: 'cs-3',
          text: 'Direct WhatsApp Alerts',
          xPercent: 35,
          yPercent: 35,
          delaySeconds: 1.0,
          badgeColor: 'emerald',
        },
      ],
      cursor: {
        show: true,
        startXPercent: 35,
        startYPercent: 60,
        clickXPercent: 35,
        clickYPercent: 35,
        clickTimeSeconds: 2.5,
        clickLabel: 'Send WhatsApp',
      },
      narration: {
        script: 'Notify parents instantly on WhatsApp for roll call, fee receipts, and marks. No extra apps needed.',
        rate: 1.05,
        pitch: 1.0,
        volume: 1.0,
      },
      captions: { show: true, style: 'centered-banner' },
    },
    {
      id: 'sc-soc-04',
      order: 4,
      title: 'PrathamOne EduOS',
      subtitle: 'Coaching Management. Simplified.',
      duration: 8.0,
      transition: 'dip-navy',
      transitionDuration: 0.5,
      media: {
        type: 'image',
        url: getAsset('asset-brand-crest').url,
        fit: 'contain',
        backgroundColor: '#071C44',
      },
      motion: {
        type: 'zoom-in',
        startScale: 0.95,
        endScale: 1.05,
        startXPercent: 50,
        startYPercent: 50,
        endXPercent: 50,
        endYPercent: 50,
      },
      callouts: [
        {
          id: 'cs-4',
          text: 'Try Free at prathamone.com',
          xPercent: 50,
          yPercent: 80,
          delaySeconds: 1.0,
          badgeColor: 'orange',
        },
      ],
      cursor: { show: false, startXPercent: 50, startYPercent: 50, clickXPercent: 50, clickYPercent: 50, clickTimeSeconds: 0 },
      narration: {
        script: 'Coaching Management. Simplified. Book your free demo at prathamone.com today!',
        rate: 1.05,
        pitch: 1.0,
        volume: 1.0,
      },
      captions: { show: true, style: 'centered-banner' },
    },
  ]
}

/**
 * Builds the 45-second Feature Deep-Dive Storyboards
 */
function buildFeature45Scenes(feature: 'fees' | 'eduboard' | 'students' | 'whatsapp'): VideoSceneDefinition[] {
  if (feature === 'fees') {
    return [
      {
        id: 'sc-fee-01',
        order: 1,
        title: 'Stop Fee Leakage Permanently',
        subtitle: 'The modern coaching financial counter',
        duration: 8.0,
        transition: 'fade',
        transitionDuration: 0.5,
        media: { type: 'image', url: getAsset('asset-brand-logo').url, fit: 'contain', backgroundColor: '#071C44' },
        motion: { type: 'zoom-in', startScale: 0.95, endScale: 1.05, startXPercent: 50, startYPercent: 50, endXPercent: 50, endYPercent: 50 },
        callouts: [{ id: 'cf-1', text: 'Automated Fee Management', xPercent: 50, yPercent: 30, delaySeconds: 1.0, badgeColor: 'orange' }],
        cursor: { show: false, startXPercent: 50, startYPercent: 50, clickXPercent: 50, clickYPercent: 50, clickTimeSeconds: 0 },
        narration: { script: 'Fee collection is the lifeblood of any coaching academy. Discover the zero-leakage fee engine in PrathamOne EduOS.', rate: 1.0, pitch: 1.0, volume: 1.0 },
        captions: { show: true, style: 'bottom-pill' },
      },
      {
        id: 'sc-fee-02',
        order: 2,
        title: 'Custom Fee Structures & Slabs',
        subtitle: 'Installment frequency, concessions & scholarships',
        duration: 12.0,
        transition: 'slide-left',
        transitionDuration: 0.5,
        media: { type: 'image', url: getAsset('asset-fees-plans').url, fit: 'mockup', mockupType: 'display', backgroundColor: '#090D16' },
        motion: { type: 'ken-burns', startScale: 1.0, endScale: 1.15, startXPercent: 50, startYPercent: 40, endXPercent: 35, endYPercent: 30 },
        callouts: [{ id: 'cf-2', text: 'Installment Frequency Rules', xPercent: 35, yPercent: 32, delaySeconds: 1.5, badgeColor: 'navy' }],
        cursor: { show: true, startXPercent: 50, startYPercent: 60, clickXPercent: 35, clickYPercent: 32, clickTimeSeconds: 3.0, clickLabel: 'Select Plan' },
        narration: { script: 'Set up transparent course fees with customizable installment slabs, sibling concessions, and merit scholarships.', rate: 1.0, pitch: 1.0, volume: 1.0 },
        captions: { show: true, style: 'bottom-pill' },
      },
      {
        id: 'sc-fee-03',
        order: 3,
        title: 'Atomic Split Collections & UPI QR',
        subtitle: 'Cash, UPI, card, cheque & bank transfer with instant receipts',
        duration: 15.0,
        transition: 'zoom-in',
        transitionDuration: 0.5,
        media: { type: 'image', url: getAsset('asset-payments-ledger').url, fit: 'mockup', mockupType: 'floating-card', backgroundColor: '#051535' },
        motion: { type: 'zoom-in', startScale: 1.0, endScale: 1.15, startXPercent: 50, startYPercent: 45, endXPercent: 40, endYPercent: 35 },
        callouts: [
          { id: 'cf-3', text: 'Dynamic UPI QR Code', xPercent: 30, yPercent: 36, delaySeconds: 1.5, badgeColor: 'emerald' },
          { id: 'cf-4', text: 'Instant Bilingual Print Vouchers', xPercent: 70, yPercent: 36, delaySeconds: 3.5, badgeColor: 'orange' },
        ],
        cursor: { show: true, startXPercent: 50, startYPercent: 60, clickXPercent: 30, clickYPercent: 36, clickTimeSeconds: 3.5, clickLabel: 'Generate QR' },
        narration: { script: 'Accept payments across cash, UPI QR, and cheques with instant bilingual receipts and 100% mathematically balanced ledgers.', rate: 1.0, pitch: 1.0, volume: 1.0 },
        captions: { show: true, style: 'bottom-pill' },
      },
      {
        id: 'sc-fee-04',
        order: 4,
        title: 'PrathamOne EduOS',
        subtitle: 'Coaching Management. Simplified.',
        duration: 10.0,
        transition: 'dip-navy',
        transitionDuration: 0.6,
        media: { type: 'image', url: getAsset('asset-brand-crest').url, fit: 'contain', backgroundColor: '#071C44' },
        motion: { type: 'zoom-in', startScale: 0.96, endScale: 1.04, startXPercent: 50, startYPercent: 50, endXPercent: 50, endYPercent: 50 },
        callouts: [{ id: 'cf-5', text: 'prathamone.com', subtext: 'Transform Your Fee Counter', xPercent: 50, yPercent: 80, delaySeconds: 1.5, badgeColor: 'orange' }],
        cursor: { show: false, startXPercent: 50, startYPercent: 50, clickXPercent: 50, clickYPercent: 50, clickTimeSeconds: 0 },
        narration: { script: 'Experience stress-free fee management. PrathamOne EduOS. Coaching Management. Simplified.', rate: 1.0, pitch: 1.0, volume: 1.0 },
        captions: { show: true, style: 'bottom-pill' },
      },
    ]
  }

  if (feature === 'eduboard') {
    return [
      {
        id: 'sc-edu-01',
        order: 1,
        title: 'EduBoard Smart Classroom',
        subtitle: 'Digital chalkboard & interactive presentation studio',
        duration: 8.0,
        transition: 'fade',
        transitionDuration: 0.5,
        media: { type: 'image', url: getAsset('asset-brand-logo').url, fit: 'contain', backgroundColor: '#071C44' },
        motion: { type: 'zoom-in', startScale: 0.95, endScale: 1.05, startXPercent: 50, startYPercent: 50, endXPercent: 50, endYPercent: 50 },
        callouts: [{ id: 'ce-1', text: 'Interactive Classroom Studio', xPercent: 50, yPercent: 30, delaySeconds: 1.0, badgeColor: 'emerald' }],
        cursor: { show: false, startXPercent: 50, startYPercent: 50, clickXPercent: 50, clickYPercent: 50, clickTimeSeconds: 0 },
        narration: { script: 'Transform your classroom into an interactive digital learning studio with EduBoard in PrathamOne EduOS.', rate: 1.0, pitch: 1.0, volume: 1.0 },
        captions: { show: true, style: 'bottom-pill' },
      },
      {
        id: 'sc-edu-02',
        order: 2,
        title: 'Tactile Classic Chalkboard',
        subtitle: 'Authentic greenboard texture, chalk pens, and eraser',
        duration: 14.0,
        transition: 'slide-left',
        transitionDuration: 0.5,
        media: { type: 'image', url: getAsset('asset-eduboard-greenboard').url, fit: 'mockup', mockupType: 'ipad', backgroundColor: '#082354' },
        motion: { type: 'zoom-out', startScale: 1.15, endScale: 1.02, startXPercent: 50, startYPercent: 50, endXPercent: 50, endYPercent: 50 },
        callouts: [{ id: 'ce-2', text: 'Classic Greenboard Feel', xPercent: 35, yPercent: 24, delaySeconds: 1.5, badgeColor: 'emerald' }],
        cursor: { show: true, startXPercent: 30, startYPercent: 60, clickXPercent: 45, clickYPercent: 45, clickTimeSeconds: 3.0, clickLabel: 'Chalk Tool' },
        narration: { script: 'Teachers love the tactile greenboard feel with pressure-sensitive chalk strokes, math shapes, and instant clear gestures.', rate: 1.0, pitch: 1.0, volume: 1.0 },
        captions: { show: true, style: 'bottom-pill' },
      },
      {
        id: 'sc-edu-03',
        order: 3,
        title: 'PDF Slide Projector & Annotation',
        subtitle: 'Direct question paper annotation and detached projector window',
        duration: 13.0,
        transition: 'fade',
        transitionDuration: 0.5,
        media: { type: 'image', url: getAsset('asset-eduboard-pdf-presentation').url, fit: 'mockup', mockupType: 'display', backgroundColor: '#090D16' },
        motion: { type: 'ken-burns', startScale: 1.0, endScale: 1.14, startXPercent: 50, startYPercent: 40, endXPercent: 40, endYPercent: 35 },
        callouts: [{ id: 'ce-3', text: 'Live PDF Annotations', xPercent: 35, yPercent: 30, delaySeconds: 1.5, badgeColor: 'amber' }],
        cursor: { show: true, startXPercent: 50, startYPercent: 60, clickXPercent: 35, clickYPercent: 30, clickTimeSeconds: 3.0, clickLabel: 'Annotate' },
        narration: { script: 'Load slides and exam papers directly into the board, highlighting key formulas and solving problems live on screen.', rate: 1.0, pitch: 1.0, volume: 1.0 },
        captions: { show: true, style: 'bottom-pill' },
      },
      {
        id: 'sc-edu-04',
        order: 4,
        title: 'PrathamOne EduOS',
        subtitle: 'Coaching Management. Simplified.',
        duration: 10.0,
        transition: 'dip-navy',
        transitionDuration: 0.6,
        media: { type: 'image', url: getAsset('asset-brand-crest').url, fit: 'contain', backgroundColor: '#071C44' },
        motion: { type: 'zoom-in', startScale: 0.96, endScale: 1.04, startXPercent: 50, startYPercent: 50, endXPercent: 50, endYPercent: 50 },
        callouts: [{ id: 'ce-4', text: 'prathamone.com', subtext: 'Experience EduBoard Today', xPercent: 50, yPercent: 80, delaySeconds: 1.5, badgeColor: 'orange' }],
        cursor: { show: false, startXPercent: 50, startYPercent: 50, clickXPercent: 50, clickYPercent: 50, clickTimeSeconds: 0 },
        narration: { script: 'Bring interactive teaching into your academy. PrathamOne EduOS. Coaching Management. Simplified.', rate: 1.0, pitch: 1.0, volume: 1.0 },
        captions: { show: true, style: 'bottom-pill' },
      },
    ]
  }

  // Fallback / default feature
  return buildExecutive60Scenes().slice(0, 4)
}

/**
 * Deterministic Storyboard Generator
 */
export function generateStoryboardForPreset(
  presetId: DirectorPresetId,
  options?: {
    customTitle?: string
    aspectRatio?: '16:9' | '9:16' | '1:1'
  }
): VideoStudioProject {
  const preset = DIRECTOR_PRESETS.find((p) => p.id === presetId) || DIRECTOR_PRESETS[0]
  const targetAspect = options?.aspectRatio || preset.aspectRatio

  let scenes: VideoSceneDefinition[] = []
  if (presetId === 'master-120') {
    scenes = buildMaster120Scenes()
  } else if (presetId === 'executive-60') {
    scenes = buildExecutive60Scenes()
  } else if (presetId === 'social-30') {
    scenes = buildSocial30Scenes()
  } else if (presetId === 'fees-45') {
    scenes = buildFeature45Scenes('fees')
  } else if (presetId === 'eduboard-45') {
    scenes = buildFeature45Scenes('eduboard')
  } else {
    scenes = buildMaster120Scenes()
  }

  const resolutionMap = {
    '16:9': { width: 1920, height: 1080 },
    '9:16': { width: 1080, height: 1920 },
    '1:1': { width: 1080, height: 1080 },
  }

  const resolution = resolutionMap[targetAspect]

  const totalDuration = scenes.reduce((sum, sc) => sum + sc.duration, 0)

  return {
    id: `proj-${Date.now()}`,
    name: options?.customTitle || preset.title,
    description: preset.description,
    aspectRatio: targetAspect,
    fps: 30,
    targetDuration: totalDuration,
    resolution,
    theme: {
      primaryColor: '#0B2D6B',
      accentColor: '#F16906',
      watermark: true,
      watermarkPosition: 'bottom-right',
      tagline: 'Coaching Management. Simplified.',
    },
    audio: {
      bgmUrl: '/media/studio/audio/prathamone-ambient-bgm.mp3',
      bgmVolume: 0.35,
      bgmDucking: true,
      duckingVolume: 0.12,
      masterVolume: 1.0,
      narrationVolume: 1.0,
    },
    scenes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}
