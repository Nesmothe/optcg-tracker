// Calls go through this app's own /api/croco proxy (a Vercel serverless
// function), never directly to the CROCO backend. That means the browser
// only ever talks to its own origin — no CORS setup is needed on CROCO's
// side, and CROCO's code is never touched.
const API_BASE = '/api/croco'

// Searches CROCO's Limitless-backed card database, scoped to Leader-type
// cards, then enriches the (name-less) search results with a name by
// fetching card details for a capped number of hits. Returns
// [{ id, name, image }] or [] on any failure — this feature should degrade
// gracefully rather than block deck/match logging if the API is unreachable.
export async function searchLeaders(query) {
  if (!query || query.trim().length < 2) return []

  let searchRes
  try {
    searchRes = await fetch(
      `${API_BASE}/search?category=leader&name=${encodeURIComponent(query.trim())}`
    )
  } catch {
    return []
  }
  if (!searchRes.ok) return []

  const { cards } = await searchRes.json().catch(() => ({ cards: [] }))
  if (!cards || cards.length === 0) return []

  // /search doesn't return card names, only ids + images — enrich a capped
  // number of results with a /card/:id lookup to get the display name.
  const capped = cards.slice(0, 8)
  const enriched = await Promise.allSettled(
    capped.map(async (c) => {
      const res = await fetch(`${API_BASE}/card/${c.card_set_id}`)
      if (!res.ok) throw new Error('lookup failed')
      const detail = await res.json()
      return { id: c.card_set_id, name: detail.card_name, image: detail.card_image }
    })
  )

  return enriched
    .filter((r) => r.status === 'fulfilled' && r.value.name)
    .map((r) => r.value)
}
