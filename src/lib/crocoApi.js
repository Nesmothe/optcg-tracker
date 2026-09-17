// Calls go through this app's own /api/croco relay (a single Vercel
// serverless function), never directly to the CROCO backend. That means the
// browser only ever talks to its own origin — no CORS setup is needed on
// CROCO's side, and CROCO's code is never touched. The target CROCO path is
// passed via a "path" query param, e.g. /api/croco?path=search&... or
// /api/croco?path=card/OP17-079.
const API_BASE = '/api/croco'

// Searches CROCO's Limitless-backed card database, scoped to Leader-type
// cards, then enriches the (name-less) search results with a name by
// fetching card details for a capped number of hits. Returns
// [{ id, name, image }] or [] on any failure — this feature should degrade
// gracefully rather than block deck/match logging if the API is unreachable.
// Failures are logged to the console (not thrown) so they're easy to spot
// in DevTools without breaking the form.
export async function searchLeaders(query) {
  if (!query || query.trim().length < 2) return []

  let searchRes
  try {
    searchRes = await fetch(
      `${API_BASE}?path=search&category=leader&name=${encodeURIComponent(query.trim())}`
    )
  } catch (e) {
    console.error('[leader search] network error calling /api/croco:', e)
    return []
  }
  if (!searchRes.ok) {
    const body = await searchRes.text().catch(() => '')
    console.error(`[leader search] /api/croco?path=search returned ${searchRes.status}:`, body)
    return []
  }

  const { cards } = await searchRes.json().catch((e) => {
    console.error('[leader search] failed to parse search response as JSON:', e)
    return { cards: [] }
  })
  if (!cards || cards.length === 0) return []

  // /search doesn't return card names, only ids + images — enrich a capped
  // number of results with a /card/:id lookup to get the display name.
  const capped = cards.slice(0, 8)
  const enriched = await Promise.allSettled(
    capped.map(async (c) => {
      const res = await fetch(`${API_BASE}?path=card/${c.card_set_id}`)
      if (!res.ok) throw new Error(`card lookup for ${c.card_set_id} returned ${res.status}`)
      const detail = await res.json()
      return { id: c.card_set_id, name: detail.card_name, image: detail.card_image }
    })
  )

  enriched.forEach((r) => {
    if (r.status === 'rejected') console.error('[leader search] card lookup failed:', r.reason)
  })

  return enriched
    .filter((r) => r.status === 'fulfilled' && r.value.name)
    .map((r) => r.value)
}
