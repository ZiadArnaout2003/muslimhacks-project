import { formatInTimeZone, toZonedTime } from 'date-fns-tz'

export function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/** "Monday, 5:00 PM" in the given IANA timezone, plus a short city/zone label. */
export function formatInZone(isoString: string, timeZone: string): string {
  return formatInTimeZone(new Date(isoString), timeZone, "EEEE, h:mm a '('zzz')'")
}

export function formatDateInZone(isoString: string, timeZone: string): string {
  return formatInTimeZone(new Date(isoString), timeZone, 'EEE, MMM d, yyyy')
}

export function formatTimeInZone(isoString: string, timeZone: string): string {
  return formatInTimeZone(new Date(isoString), timeZone, 'h:mm a')
}

/** Converts a UTC instant to a Date whose local fields reflect the target zone. */
export function zonedDate(isoString: string, timeZone: string) {
  return toZonedTime(new Date(isoString), timeZone)
}

export const COMMON_TIMEZONES = [
  'America/Montreal',
  'America/New_York',
  'America/Los_Angeles',
  'America/Toronto',
  'Europe/London',
  'Europe/Paris',
  'Africa/Cairo',
  'Africa/Casablanca',
  'Asia/Amman',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kuala_Lumpur',
  'Asia/Jakarta',
  'Australia/Sydney',
]
