/**
 * @file        VideoStudio.test.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.test
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
 * @description Comprehensive Vitest unit and integration test suite verifying PrathamOne Video Studio state store, AI Director presets, timeline operations, and JSON serialization.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useVideoStudioStore } from '../store/videoStudioStore'
import {
  DIRECTOR_PRESETS,
  generateStoryboardForPreset,
} from '../config/videoStudioDirector'
import { VERIFIED_ASSET_VAULT } from '../config/videoStudioAssets'
import { PRESENTER_PROFILES } from '../config/presenterProfiles'

describe('PrathamOne Video Studio — Core Engine & AI Director', () => {
  beforeEach(() => {
    // Reset store before each test
    useVideoStudioStore.getState().newProjectFromPreset('master-120')
  })

  it('initializes default project with 120s master product video storyboard', () => {
    const project = useVideoStudioStore.getState().currentProject
    expect(project).toBeDefined()
    expect(project.scenes.length).toBe(10)
    expect(project.targetDuration).toBe(120)
    expect(project.aspectRatio).toBe('16:9')
    expect(project.resolution).toEqual({ width: 1920, height: 1080 })
    expect(project.theme.tagline).toBe('Coaching Management. Simplified.')
  })

  it('contains verified authentic asset catalog spanning key modules', () => {
    expect(VERIFIED_ASSET_VAULT.length).toBeGreaterThanOrEqual(10)

    const categories = new Set(VERIFIED_ASSET_VAULT.map((a) => a.category))
    expect(categories.has('dashboard')).toBe(true)
    expect(categories.has('students')).toBe(true)
    expect(categories.has('fees')).toBe(true)
    expect(categories.has('academics')).toBe(true)
    expect(categories.has('eduboard')).toBe(true)
    expect(categories.has('communication')).toBe(true)

    // Verify all assets have non-empty url and script
    VERIFIED_ASSET_VAULT.forEach((asset) => {
      expect(asset.url.length).toBeGreaterThan(0)
      expect(asset.defaultScript.length).toBeGreaterThan(0)
      expect(asset.defaultHeadline.length).toBeGreaterThan(0)
    })
  })

  it('generates all 7 production presets with accurate durations and aspect ratios', () => {
    expect(DIRECTOR_PRESETS.length).toBe(7)

    const p120 = generateStoryboardForPreset('master-120')
    expect(p120.scenes.length).toBe(10)
    expect(p120.targetDuration).toBe(120)
    expect(p120.aspectRatio).toBe('16:9')

    const p60 = generateStoryboardForPreset('executive-60')
    expect(p60.scenes.length).toBe(5)
    expect(p60.targetDuration).toBe(60)
    expect(p60.aspectRatio).toBe('16:9')

    const p30 = generateStoryboardForPreset('social-30')
    expect(p30.scenes.length).toBe(4)
    expect(p30.targetDuration).toBe(30)
    expect(p30.aspectRatio).toBe('9:16')
    expect(p30.resolution).toEqual({ width: 1080, height: 1920 })

    const pFees = generateStoryboardForPreset('fees-45')
    expect(pFees.targetDuration).toBe(45)

    const pEdu = generateStoryboardForPreset('eduboard-45')
    expect(pEdu.targetDuration).toBe(45)
  })

  it('supports scene updates, duration trimming, and target duration recalculation', () => {
    const store = useVideoStudioStore.getState()
    const firstScene = store.currentProject.scenes[0]

    expect(firstScene.duration).toBe(8.0)
    store.updateScene(firstScene.id, { duration: 10.0, title: 'Updated Title' })

    const updatedProject = useVideoStudioStore.getState().currentProject
    const updatedScene = updatedProject.scenes.find((s) => s.id === firstScene.id)
    expect(updatedScene?.duration).toBe(10.0)
    expect(updatedScene?.title).toBe('Updated Title')
    expect(updatedProject.targetDuration).toBe(122.0)
  })

  it('reorders scenes correctly and updates order indexing', () => {
    const store = useVideoStudioStore.getState()
    const firstId = store.currentProject.scenes[0].id
    const secondId = store.currentProject.scenes[1].id

    store.reorderScenes(0, 1)

    const reorderedProject = useVideoStudioStore.getState().currentProject
    expect(reorderedProject.scenes[0].id).toBe(secondId)
    expect(reorderedProject.scenes[1].id).toBe(firstId)
    expect(reorderedProject.scenes[0].order).toBe(1)
    expect(reorderedProject.scenes[1].order).toBe(2)
  })

  it('supports adding and duplicating scenes', () => {
    const store = useVideoStudioStore.getState()
    const initialCount = store.currentProject.scenes.length

    store.addScene()
    expect(useVideoStudioStore.getState().currentProject.scenes.length).toBe(initialCount + 1)

    const firstId = useVideoStudioStore.getState().currentProject.scenes[0].id
    store.duplicateScene(firstId)
    expect(useVideoStudioStore.getState().currentProject.scenes.length).toBe(initialCount + 2)
  })

  it('prevents deleting the last scene to ensure non-empty projects', () => {
    const store = useVideoStudioStore.getState()
    // New project with 4 scenes
    store.newProjectFromPreset('social-30')
    expect(useVideoStudioStore.getState().currentProject.scenes.length).toBe(4)

    // Delete 3 scenes
    const s1 = useVideoStudioStore.getState().currentProject.scenes[0].id
    store.deleteScene(s1)
    const s2 = useVideoStudioStore.getState().currentProject.scenes[0].id
    store.deleteScene(s2)
    const s3 = useVideoStudioStore.getState().currentProject.scenes[0].id
    store.deleteScene(s3)

    expect(useVideoStudioStore.getState().currentProject.scenes.length).toBe(1)

    // Attempting to delete the last scene should be a no-op
    const lastId = useVideoStudioStore.getState().currentProject.scenes[0].id
    store.deleteScene(lastId)
    expect(useVideoStudioStore.getState().currentProject.scenes.length).toBe(1)
  })

  it('supports undo and redo state history', () => {
    const store = useVideoStudioStore.getState()
    const initialName = store.currentProject.name

    store.updateProjectDetails({ name: 'Modified Project Name' })
    expect(useVideoStudioStore.getState().currentProject.name).toBe('Modified Project Name')

    store.undo()
    expect(useVideoStudioStore.getState().currentProject.name).toBe(initialName)

    store.redo()
    expect(useVideoStudioStore.getState().currentProject.name).toBe('Modified Project Name')
  })

  it('serializes and deserializes project JSON without data loss', () => {
    const store = useVideoStudioStore.getState()
    const jsonStr = store.exportProjectJson()
    expect(typeof jsonStr).toBe('string')
    expect(jsonStr.length).toBeGreaterThan(100)

    const success = store.importProjectJson(jsonStr)
    expect(success).toBe(true)

    const invalid = store.importProjectJson('{ invalid json')
    expect(invalid).toBe(false)
  })

  it('configures virtual human AI presenter profiles with Indian corporate voices and postures', () => {
    expect(PRESENTER_PROFILES.length).toBe(4)

    const priya = PRESENTER_PROFILES.find((p) => p.id === 'priya-sharma')
    expect(priya).toBeDefined()
    expect(priya?.name).toBe('Priya Sharma')
    expect(priya?.role).toBe('Senior Solutions Specialist')
    expect(priya?.gender).toBe('female')
    expect(priya?.style).toBe('executive')
    expect(priya?.avatarUrl).toContain('priya_sharma.jpg')

    const arjun = PRESENTER_PROFILES.find((p) => p.id === 'arjun-mallah')
    expect(arjun).toBeDefined()
    expect(arjun?.name).toBe('Arjun Mallah')
    expect(arjun?.style).toBe('technical')

    const neha = PRESENTER_PROFILES.find((p) => p.id === 'neha-verma')
    expect(neha).toBeDefined()
    expect(neha?.name).toBe('Neha Verma')
    expect(neha?.style).toBe('consultant')

    // Verify master 120s project scenes have presenter configurations
    const project = useVideoStudioStore.getState().currentProject
    const scene1 = project.scenes[0]
    expect(scene1.presenter?.enabled).toBe(true)
    expect(scene1.presenter?.profileId).toBe('priya-sharma')
    expect(scene1.presenter?.mode).toBe('full-screen')
  })

  it('integrates real software demonstration video recordings in the asset vault and scene media', () => {
    const recordings = VERIFIED_ASSET_VAULT.filter((a) => a.category === 'recording')
    expect(recordings.length).toBe(4)

    const studentRec = recordings.find((r) => r.url.includes('demo_student_workflow.mp4'))
    expect(studentRec).toBeDefined()
    expect(studentRec?.mediaType).toBe('video')
    expect(studentRec?.moduleName).toBe('Student Management')

    const feesRec = recordings.find((r) => r.url.includes('demo_fees_workflow.mp4'))
    expect(feesRec).toBeDefined()
    expect(feesRec?.moduleName).toBe('Fees & Payments')

    const attRec = recordings.find((r) => r.url.includes('demo_attendance_workflow.mp4'))
    expect(attRec).toBeDefined()
    expect(attRec?.moduleName).toBe('Attendance')

    const eduRec = recordings.find((r) => r.url.includes('demo_eduboard_workflow.mp4'))
    expect(eduRec).toBeDefined()
    expect(eduRec?.moduleName).toBe('EduBoard')

    // Check that scenes in master 120s project use video media
    const project = useVideoStudioStore.getState().currentProject
    const studentScene = project.scenes.find((s) => s.id === 'sc-03-students')
    expect(studentScene?.media.type).toBe('video')
    expect(studentScene?.media.url).toContain('demo_student_workflow.mp4')

    const feesScene = project.scenes.find((s) => s.id === 'sc-04-fees')
    expect(feesScene?.media.type).toBe('video')
    expect(feesScene?.media.url).toContain('demo_fees_workflow.mp4')
  })
})
