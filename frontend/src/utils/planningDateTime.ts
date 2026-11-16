/**
 * @file        planningDateTime.ts
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.utils
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
 * @description Timezone-aware planning date and local wall-time conversions.
 */

type WallTime = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

const partsInZone = (value: Date, timeZone: string): WallTime => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value)
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value)
  return {
    year: part('year'),
    month: part('month'),
    day: part('day'),
    hour: part('hour'),
    minute: part('minute'),
  }
}

const dateKeyFromParts = ({ year, month, day }: WallTime) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

export function planningDateKey(value: Date, timeZone: string): string {
  return dateKeyFromParts(partsInZone(value, timeZone))
}

export function parsePlanningDateKey(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) throw new RangeError('Expected a YYYY-MM-DD date.')
  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const result = new Date(Date.UTC(year, month - 1, day))
  if (result.getUTCFullYear() !== year || result.getUTCMonth() !== month - 1 || result.getUTCDate() !== day) {
    throw new RangeError('Invalid calendar date.')
  }
  return result
}

export function planningWallDateTime(value: string | null | undefined, timeZone: string): string {
  if (!value) return ''
  const instant = new Date(value)
  if (Number.isNaN(instant.getTime())) return ''
  const parts = partsInZone(instant, timeZone)
  return `${dateKeyFromParts(parts)}T${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`
}

export function planningInstantFromWallTime(value: string, timeZone: string): string | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) throw new RangeError('Enter a valid local date and time.')
  const [, yearText, monthText, dayText, hourText, minuteText] = match
  const wall: WallTime = {
    year: Number(yearText),
    month: Number(monthText),
    day: Number(dayText),
    hour: Number(hourText),
    minute: Number(minuteText),
  }
  const target = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute)
  if (
    wall.month < 1 || wall.month > 12 || wall.day < 1 || wall.hour > 23 || wall.minute > 59 ||
    dateKeyFromParts(wall) !== dateKeyFromParts({
      ...partsInZone(new Date(target), 'UTC'),
    })
  ) {
    throw new RangeError('Enter a valid local date and time.')
  }

  const offsets = new Set<number>()
  for (let hours = -36; hours <= 36; hours += 3) {
    const sample = new Date(target + hours * 60 * 60 * 1000)
    const localParts = partsInZone(sample, timeZone)
    offsets.add(Date.UTC(
      localParts.year,
      localParts.month - 1,
      localParts.day,
      localParts.hour,
      localParts.minute,
    ) - sample.getTime())
  }

  const candidates = [...offsets]
    .map((offset) => target - offset)
    .filter((instant) => {
      const actual = partsInZone(new Date(instant), timeZone)
      return actual.year === wall.year && actual.month === wall.month && actual.day === wall.day &&
        actual.hour === wall.hour && actual.minute === wall.minute
    })
    .sort((left, right) => left - right)

  if (candidates.length === 0) {
    throw new RangeError('This local time does not exist because of a daylight-saving time change.')
  }
  return new Date(candidates[0]).toISOString()
}
