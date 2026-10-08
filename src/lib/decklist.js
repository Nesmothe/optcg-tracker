// OPTCG Sim decklists are plain text, one card per line, e.g.
//   1xOP05-060
//   4xOP01-088
// with the leader first. Alternate arts carry a suffix like OP05-060_p1.
// The parser is deliberately forgiving about spacing/casing ("4 x OP01-001",
// "OP01-001 x4", lowercase ids) and ignores blank lines and # / // comments.

const CDN_BASE = 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com'

const LINE_RE =
  /^(?:(\d{1,2})\s*[xX×]?\s*)?([A-Za-z]{1,3}\d{0,2}-\d{3}(?:_[pP]\d+)?)(?:\s*[xX×]\s*(\d{1,2}))?$/

export function parseDecklist(text) {
  const cards = []
  const invalid = []
  const indexById = new Map()

  for (const rawLine of (text || '').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || line.startsWith('//')) continue

    const m = line.match(LINE_RE)
    const count = m ? parseInt(m[1] ?? m[3] ?? '1', 10) : 0
    if (!m || !count) { invalid.push(line); continue }

    const id = m[2].toUpperCase().replace(/_P(\d+)$/, '_p$1')
    if (indexById.has(id)) {
      cards[indexById.get(id)].count += count
    } else {
      indexById.set(id, cards.length)
      cards.push({ id, count })
    }
  }

  return { cards, invalid, total: deckTotal(cards) }
}

export function deckTotal(cards) {
  return (cards || []).reduce((sum, c) => sum + c.count, 0)
}

// "OP05-060_p1" -> "OP05-060"
export function baseCardId(id) {
  return id.replace(/_p\d+$/i, '')
}

// Card art lives at a predictable CDN path (same pattern CROCO's scraper uses),
// so a decklist can show card images without any API calls.
export function cardImageUrl(id) {
  const set = baseCardId(id).match(/^([A-Z0-9]+)-/)?.[1] ?? ''
  return `${CDN_BASE}/one-piece/${set}/${id}_EN.webp`
}

// Back to the OPTCG Sim / CROCO import format.
export function toSimFormat(cards) {
  return (cards || []).map((c) => `${c.count}x${c.id}`).join('\n')
}
