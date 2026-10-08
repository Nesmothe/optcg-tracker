import { useState } from 'react'
import { baseCardId, cardImageUrl, deckTotal, toSimFormat } from '../lib/decklist'

// Card-image grid for a stored decklist, with a one-click export in the
// OPTCG Sim format (which CROCO imports too).
export default function DecklistView({ cards }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    const text = toSimFormat(cards)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt('Copy your decklist:', text)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--parchment-dim)' }}>
          {deckTotal(cards)} cards · {cards.length} unique
        </span>
        <button type="button" onClick={copy} style={{ fontSize: '0.78rem' }}>
          {copied ? 'Copied!' : 'Copy decklist'}
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {cards.map((c) => (
          <div key={c.id} title={`${c.count}x ${c.id}`} style={{ position: 'relative', width: 72 }}>
            <img
              src={cardImageUrl(c.id)}
              alt={c.id}
              loading="lazy"
              onError={(e) => {
                // Alt-art id without matching art on the CDN: fall back to the standard print.
                e.currentTarget.onerror = null
                e.currentTarget.src = cardImageUrl(baseCardId(c.id))
              }}
              style={{
                display: 'block', width: '100%', aspectRatio: '5 / 7', objectFit: 'cover',
                borderRadius: 3, border: '1px solid var(--border)', background: 'var(--ink-surface-raised)',
              }}
            />
            <span style={{
              position: 'absolute', right: 3, bottom: 3, padding: '0 0.3rem', borderRadius: 3,
              background: 'rgba(15, 27, 45, 0.88)', color: 'var(--brass-bright)',
              fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
            }}>
              ×{c.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
