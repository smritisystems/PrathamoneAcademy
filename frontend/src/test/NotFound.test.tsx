/**
 * @file        NotFound.test.tsx
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
 * @updated     2026-11-16
 *
 * @description Comprehensive test suite for playful school-themed 404 experience, message curation, non-consecutive rotation algorithm, and navigation recovery.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NotFoundPage, {
  SCHOOL_404_MESSAGES,
  getRandomNonConsecutiveMessageIndex,
  STORAGE_404_KEY,
} from '../pages/NotFound'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('Funny School-Themed 404 Workspace Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it('1. contains at least 20 curated family-friendly school-themed messages including all examples', () => {
    expect(SCHOOL_404_MESSAGES.length).toBeGreaterThanOrEqual(20)

    const requiredExamples = [
      "Even our topper couldn't find this page!",
      "This page bunked today's class.",
      "Attendance marked: ABSENT!",
      "The page went on vacation without permission!",
      "Even the Principal doesn't know where this page went!",
      "Wrong classroom! Please check your timetable.",
      "Our search team is still looking for this page.",
      "This page forgot to submit its homework!",
    ]

    for (const example of requiredExamples) {
      expect(SCHOOL_404_MESSAGES).toContain(example)
    }
  })

  it('2. guarantees non-consecutive message index selection across 1000 simulated iterations', () => {
    const total = SCHOOL_404_MESSAGES.length
    let lastIndex: number | null = 0

    for (let i = 0; i < 1000; i++) {
      const nextIndex = getRandomNonConsecutiveMessageIndex(lastIndex, total)
      expect(nextIndex).not.toBe(lastIndex)
      expect(nextIndex).toBeGreaterThanOrEqual(0)
      expect(nextIndex).toBeLessThan(total)
      lastIndex = nextIndex
    }
  })

  it('3. renders exact required heading "Oops! Class is missing! 😄"', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    )

    const heading = screen.getByTestId('not-found-heading')
    expect(heading.textContent).toBe('Oops! Class is missing! 😄')
  })

  it('4. displays a curated funny excuse from the collection', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    )

    const messageEl = screen.getByTestId('not-found-funny-message')
    const rawText = messageEl.textContent?.replace(/[“”"]/g, '').trim()
    expect(rawText).toBeDefined()
    expect(SCHOOL_404_MESSAGES).toContain(rawText)
  })

  it('5. provides "Return to Dashboard" action linking directly to "/"', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    )

    const returnBtn = screen.getByTestId('return-dashboard-btn')
    expect(returnBtn).toBeDefined()
    expect(returnBtn.getAttribute('href')).toBe('/')
    expect(returnBtn.textContent).toContain('Return to Dashboard')
  })

  it('6. provides "Go Back" action triggering navigation back', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    )

    const goBackBtn = screen.getByTestId('go-back-btn')
    expect(goBackBtn).toBeDefined()
    expect(goBackBtn.textContent).toContain('Go Back')

    fireEvent.click(goBackBtn)
    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })

  it('7. allows user to shuffle excuses interactively without consecutive repetition', () => {
    sessionStorage.setItem(STORAGE_404_KEY, '2')
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    )

    const shuffleBtn = screen.getByTestId('shuffle-404-btn')
    const initialText = screen.getByTestId('not-found-funny-message').textContent

    fireEvent.click(shuffleBtn)

    const nextText = screen.getByTestId('not-found-funny-message').textContent
    expect(nextText).not.toBe(initialText)
    const stored = sessionStorage.getItem(STORAGE_404_KEY)
    expect(stored).not.toBe('2')
  })

  it('8. protects privacy and never displays stack traces, database details or raw internal URLs', () => {
    const { container } = render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    )

    const html = container.innerHTML
    expect(html).not.toContain('traceback')
    expect(html).not.toContain('SELECT ')
    expect(html).not.toContain('postgres')
    expect(html).not.toContain('psycopg2')
    expect(html).not.toContain('sqlalchemy')
    expect(html).not.toContain('/api/v1/')
  })
})
