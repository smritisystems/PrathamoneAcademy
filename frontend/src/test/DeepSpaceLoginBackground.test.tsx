/**
 * @file        DeepSpaceLoginBackground.test.tsx
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
 * @description Vitest regression tests verifying DeepSpaceLoginBackground cosmic artwork and dynamic institute/class mapping.
 */

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import DeepSpaceLoginBackground, { splitInstituteTitle } from '../components/common/DeepSpaceLoginBackground'

describe('DeepSpaceLoginBackground cosmic canvas and institute mapping', () => {
  it('splits multi-word and single-word academy names into balanced cosmic lines', () => {
    expect(splitInstituteTitle('Apex Academy')).toEqual({
      topLine: 'APEX',
      bottomLine: 'ACADEMY',
      topSize: 46,
      bottomSize: 50,
    })
    expect(splitInstituteTitle('Your Academy Name')).toEqual({
      topLine: 'YOUR',
      bottomLine: 'ACADEMY NAME',
      topSize: 46,
      bottomSize: 50,
    })
    expect(splitInstituteTitle('')).toEqual({
      topLine: 'YOUR',
      bottomLine: 'ACADEMY NAME',
      topSize: 46,
      bottomSize: 50,
    })
  })

  it('renders cosmic layers, dynamic institute name, active classes, and boards inside .dsb-space', () => {
    const { container } = render(
      <DeepSpaceLoginBackground
        instituteName="Sunrise Coaching Classes"
        instituteCity="Pune"
        instituteState="Maharashtra"
        boards={[{ name: 'Maharashtra State Board', code: 'MSBSHSE' }]}
        classes={['Class IX', 'Class X', 'Standard 11', 'Standard 12']}
        subjects={['Physics', 'Chemistry', 'Mathematics']}
      />,
    )

    const root = container.querySelector('.dsb-space')
    expect(root).not.toBeNull()

    const brand = container.querySelector('#dsb-brand')
    expect(brand?.textContent).toContain('SUNRISE')
    expect(brand?.textContent).toContain('COACHING CLASSES')

    const text = container.textContent || ''
    expect(text).toContain('CLASS IX')
    expect(text).toContain('CLASS X')
    expect(text).toContain('STANDARD 12')
    expect(text).toContain('MSBSHSE')
    expect(text).toContain('PUNE')
    expect(text).toContain('MAHARASHTRA')
    expect(text).toContain('E = mc²')
  })
})
