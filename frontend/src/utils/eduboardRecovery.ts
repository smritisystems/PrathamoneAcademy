/**
 * @file        eduboardRecovery.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.src.utils
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
 * @description Scoped IndexedDB crash-recovery store for PrathamOne EduBoard, keyed by institution, data environment, user, board, and teaching session with automatic logout purge.
 */

import type { EduBoardPageItem } from '../types'

const DB_NAME = 'prathamone_eduboard_recovery_v1'
const STORE_NAME = 'board_snapshots'
const DB_VERSION = 1

export interface EduBoardRecoveryScope {
  institutionId: number | string
  dataEnvironment: string
  userId: number | string
  boardId: number | string
  teachingSessionId?: number | string | null
}

export interface EduBoardRecoveryRecord extends EduBoardRecoveryScope {
  key: string
  revisionNo: number
  title: string
  pages: EduBoardPageItem[]
  dirty: boolean
  savedAt: string
}

// Deterministic in-memory fallback when IndexedDB is unavailable (e.g. constrained test DOMs)
const memoryFallback = new Map<string, EduBoardRecoveryRecord>()

export function buildRecoveryScopeKey(scope: EduBoardRecoveryScope): string {
  const inst = String(scope.institutionId || 1)
  const env = String(scope.dataEnvironment || 'PRODUCTION').toUpperCase()
  const usr = String(scope.userId || 0)
  const brd = String(scope.boardId || 0)
  const sess = scope.teachingSessionId ? String(scope.teachingSessionId) : 'none'
  return `inst:${inst}|env:${env}|usr:${usr}|board:${brd}|sess:${sess}`
}

function hasIndexedDb(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'
}

function openRecoveryDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
        store.createIndex('userId', 'userId', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('Failed to open EduBoard recovery IndexedDB'))
  })
}

export async function saveRecoverySnapshot(
  scope: EduBoardRecoveryScope,
  payload: { revisionNo: number; title: string; pages: EduBoardPageItem[]; dirty: boolean },
): Promise<EduBoardRecoveryRecord> {
  const key = buildRecoveryScopeKey(scope)
  const record: EduBoardRecoveryRecord = {
    ...scope,
    key,
    revisionNo: payload.revisionNo,
    title: payload.title,
    pages: payload.pages,
    dirty: payload.dirty,
    savedAt: new Date().toISOString(),
  }

  memoryFallback.set(key, record)
  if (!hasIndexedDb()) return record

  try {
    const db = await openRecoveryDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(record)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // Non-fatal: memory fallback remains populated
  }
  return record
}

export async function loadRecoverySnapshot(
  scope: EduBoardRecoveryScope,
): Promise<EduBoardRecoveryRecord | null> {
  const key = buildRecoveryScopeKey(scope)

  const validateScopeMatch = (rec: EduBoardRecoveryRecord | undefined | null): EduBoardRecoveryRecord | null => {
    if (!rec) return null
    if (
      String(rec.institutionId) !== String(scope.institutionId) ||
      String(rec.dataEnvironment).toUpperCase() !== String(scope.dataEnvironment).toUpperCase() ||
      String(rec.userId) !== String(scope.userId) ||
      String(rec.boardId) !== String(scope.boardId) ||
      String(rec.teachingSessionId ?? 'none') !== String(scope.teachingSessionId ?? 'none')
    ) {
      return null
    }
    return rec
  }

  if (!hasIndexedDb()) {
    return validateScopeMatch(memoryFallback.get(key))
  }

  try {
    const db = await openRecoveryDb()
    const record = await new Promise<EduBoardRecoveryRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(key)
      req.onsuccess = () => resolve((req.result as EduBoardRecoveryRecord) || null)
      req.onerror = () => reject(req.error)
    })
    db.close()
    return validateScopeMatch(record || memoryFallback.get(key))
  } catch {
    return validateScopeMatch(memoryFallback.get(key))
  }
}

export async function clearRecoverySnapshot(scope: EduBoardRecoveryScope): Promise<void> {
  const key = buildRecoveryScopeKey(scope)
  memoryFallback.delete(key)
  if (!hasIndexedDb()) return

  try {
    const db = await openRecoveryDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // Ignore storage cleanup error
  }
}

export async function clearAllRecoveryForUser(userId: number | string): Promise<void> {
  const targetUsr = String(userId)
  for (const [k, v] of memoryFallback.entries()) {
    if (String(v.userId) === targetUsr) {
      memoryFallback.delete(k)
    }
  }
  if (!hasIndexedDb()) return

  try {
    const db = await openRecoveryDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.openCursor()
      req.onsuccess = () => {
        const cursor = req.result
        if (!cursor) return
        const rec = cursor.value as EduBoardRecoveryRecord
        if (String(rec.userId) === targetUsr) {
          cursor.delete()
        }
        cursor.continue()
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // Ignore cleanup errors
  }
}

export async function clearAllRecoverySnapshots(): Promise<void> {
  memoryFallback.clear()
  if (!hasIndexedDb()) return

  try {
    const db = await openRecoveryDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // Ignore cleanup errors
  }
}

let logoutHookRegistered = false

export function registerEduBoardLogoutCleanup(): void {
  if (logoutHookRegistered || typeof window === 'undefined') return
  logoutHookRegistered = true
  window.addEventListener('prashant-logout', () => {
    void clearAllRecoverySnapshots()
  })
}

registerEduBoardLogoutCleanup()

