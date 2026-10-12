export const YOUTUBE_PATTERN = /^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i

// "2026-10-12" -> "10/12"
export function formatDate(iso) {
  const [, month, day] = iso.split('-')
  return `${month}/${day}`
}

// "2026-10-12" -> { month: 'Oct', day: '12', weekday: 'Monday' }
// Built from the parts (not new Date(iso)) so the day never shifts with timezones.
export function dateParts(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }),
    day: String(d),
    weekday: date.toLocaleDateString('en-US', { weekday: 'long' }),
  }
}

// "14:30" -> "2:30 PM"
export function formatTime(hhmm) {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`
}

// Kept for any older code that still imports it.
export function formatEntry(e) {
  const weight = e.weight != null ? ` @ ${e.weight} lbs` : ''
  return `${e.exerciseName} ${e.reps}X${e.sets}${weight}`
}

// Pieces of a logged lift, for the scoreboard display: 4×8 and 135 lbs
export function entryParts(e) {
  return {
    name: e.exerciseName,
    scheme: `${e.sets}\u00d7${e.reps}`,
    weight: e.weight != null ? `${e.weight} lbs` : null,
  }
}

// "Jose Viera" -> "JV", or the first letter of the email
export function getInitials(user) {
  const name = user?.displayName?.trim()
  if (name) {
    const words = name.split(/\s+/)
    return (words[0][0] + (words[1]?.[0] || '')).toUpperCase()
  }
  return (user?.email?.[0] || '?').toUpperCase()
}