/**
 * @file        CoachingLoginBackground.test.tsx
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
 * @created     2026-11-28
 * @updated     2026-11-28
 *
 * @description Vitest regression tests verifying that CoachingLoginBackground renders all major Indian education boards and active priority states (Maharashtra) inside panel safe-zones.
 */

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CoachingLoginBackground from '../components/common/CoachingLoginBackground'

describe('CoachingLoginBackground pan-India boards and states rendering', () => {
  it('renders MAHARASHTRA and all major Indian boards inside layout="panel"', () => {
    const { container } = render(
      <CoachingLoginBackground
        layout="panel"
        instituteName="Prashant Academy"
        instituteState="Maharashtra"
        parallax={false}
      />,
    )

    const text = container.textContent || ''
    expect(text).toContain('MAHARASHTRA')
    expect(text).toContain('MSBSHSE · SSC & HSC')
    expect(text).toContain('CBSE')
    expect(text).toContain('ICSE · ISC')
    expect(text).toContain('IB · IGCSE')
    expect(text).toContain('NIOS')
    expect(text).toContain('UPMSP')
    expect(text).toContain('GSEB · RBSE')
    expect(text).toContain('WBBSE · BSEB')
    expect(text).toContain('KSEEB · TNSB')
    expect(text).toContain('STATE BOARDS')
    expect(text).toContain('NEP 2020')
  })

  it('retains state markers inside panel safe bounds instead of filtering out states', () => {
    const { container } = render(
      <CoachingLoginBackground layout="panel" instituteState="Maharashtra" parallax={false} />,
    )

    const stateNodes = container.querySelectorAll('.clb-state')
    expect(stateNodes.length).toBeGreaterThanOrEqual(20)
  })
})
