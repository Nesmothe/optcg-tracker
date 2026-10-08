import { useMemo } from 'react'
import { parseDecklist } from '../lib/decklist'

// Paste box for an OPTCG Sim decklist, with live feedback on what was read.
export default function DecklistInput({ id, value, onChange }) {
  const { cards, invalid, total } = useMemo(() => parseDecklist(value), [value])

  return (
    <div>
      <textarea
        id={id}
        rows={6}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={'Paste from OPTCG Sim, one card per line:\n1xOP05-060\n4xOP01-088\n…'}
        spellCheck={false}
        style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
      />
      {value.trim() && cards.length > 0 && (
        <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: 'var(--parchment-dim)' }}>
          Read {cards.length} unique cards · {total} total
          {total !== 51 && ' — a full deck is 51 (leader + 50), double-check the paste'}
        </p>
      )}
      {invalid.length > 0 && (
        <p className="error-text">
          Couldn't read {invalid.length} line{invalid.length === 1 ? '' : 's'}:{' '}
          {invalid.slice(0, 3).join(' | ')}{invalid.length > 3 ? ' …' : ''}
        </p>
      )}
    </div>
  )
}
