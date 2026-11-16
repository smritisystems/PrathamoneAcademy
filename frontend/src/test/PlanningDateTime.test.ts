/**
 * @file        PlanningDateTime.test.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.test
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-16
 * @updated     2026-11-17
 *
 * @description Regression tests for institution-timezone planning date conversions.
 */

import { describe, expect, it } from 'vitest'
import {
  parsePlanningDateKey,
  planningDateKey,
  planningInstantFromWallTime,
  planningWallDateTime,
} from '../utils/planningDateTime'

describe('planning timezone helpers', () => {
  it('converts event wall times using the selected IANA timezone', () => {
    const instant = planningInstantFromWallTime('2026-03-08T09:30', 'America/New_York')
    expect(instant).toBe('2026-03-08T13:30:00.000Z')
    expect(planningWallDateTime(instant, 'America/New_York')).toBe('2026-03-08T09:30')
    expect(planningDateKey(new Date(instant!), 'America/New_York')).toBe('2026-03-08')
  })

  it('rejects local times skipped by a daylight-saving transition', () => {
    expect(() => planningInstantFromWallTime('2026-03-08T02:30', 'America/New_York'))
      .toThrow(/does not exist/)
  })

  it('uses the earlier instant for repeated fall-back wall times', () => {
    expect(planningInstantFromWallTime('2026-11-01T01:30', 'America/New_York'))
      .toBe('2026-11-01T05:30:00.000Z')
  })

  it('parses date-only values independently from the host timezone', () => {
    const date = parsePlanningDateKey('2026-11-16')
    expect(date.toISOString()).toBe('2026-11-16T00:00:00.000Z')
    expect(() => parsePlanningDateKey('2026-02-30')).toThrow(/Invalid calendar date/)
  })
})
