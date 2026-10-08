// Suggestions for the "final standing" box — it's free text, these are just
// shortcuts so common results stay consistently worded.
export const STANDING_OPTIONS = [
  'Winner',
  'Finalist (2nd)',
  'Top 4',
  'Top 8',
  'Top 16',
  'Top 32',
  'Made the cut',
  'Missed the cut',
  'Dropped',
]

export function recordOf(matches) {
  const wins = matches.filter((m) => m.result === 'win').length
  const total = matches.length
  return {
    wins,
    losses: total - wins,
    total,
    rate: total ? Math.round((wins / total) * 100) : 0,
  }
}

export function formatRunDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}
