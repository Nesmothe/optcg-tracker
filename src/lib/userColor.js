// A curated palette that fits the logbook theme (kept away from the win/loss
// colors so a username never gets confused with a win/loss tag).
const PALETTE = [
  '#c89b3c', // brass
  '#5fa8d3', // sky
  '#a37fc9', // violet
  '#d98a5f', // clay
  '#6cbf9f', // sage
  '#e0729a', // rose
  '#8fae5f', // olive
  '#4fb3c4', // teal
  '#e0a13c', // amber
  '#8c8fd6', // periwinkle
]

// Simple deterministic hash so the same username always maps to the same
// color, for every user, without storing a color in the database.
export function colorForUsername(username) {
  if (!username) return '#b9b2a0'
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]
}
