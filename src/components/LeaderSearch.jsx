import { useEffect, useRef, useState } from 'react'
import { searchLeaders } from '../lib/crocoApi'

// A text input that suggests real leader cards as you type, sourced from
// CROCO's Limitless-backed card database. Selecting a suggestion reports the
// full card ({id, name, image}) via onSelect. Typing without selecting still
// updates the plain text via onTextChange, so the field degrades gracefully
// to free text if the API is down or a leader isn't found yet.
export default function LeaderSearch({ value, onTextChange, onSelect, placeholder, id }) {
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const boxRef = useRef(null)

  useEffect(() => {
    const query = value?.trim()
    if (!query || query.length < 2) { setResults([]); return }
    let cancelled = false
    setLoading(true)
    const t = setTimeout(async () => {
      const hits = await searchLeaders(query)
      if (!cancelled) { setResults(hits); setLoading(false); setOpen(true) }
    }, 350)
    return () => { cancelled = true; clearTimeout(t) }
  }, [value])

  useEffect(() => {
    function handleClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function pick(card) {
    onSelect?.(card)
    onTextChange(card.name)
    setOpen(false)
  }

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <input
        id={id}
        value={value}
        onChange={(e) => { onTextChange(e.target.value); onSelect?.(null) }}
        onFocus={() => { if (results.length) setOpen(true) }}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && (loading || results.length > 0) && (
        <div style={{
          position: 'absolute', zIndex: 20, top: '100%', left: 0, right: 0,
          marginTop: '0.25rem', background: 'var(--ink-surface-raised)',
          border: '1px solid var(--border)', borderRadius: 3, maxHeight: 260,
          overflowY: 'auto',
        }}>
          {loading && <div style={{ padding: '0.5rem 0.7rem', color: 'var(--parchment-dim)', fontSize: '0.85rem' }}>Searching…</div>}
          {!loading && results.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => pick(card)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%',
                background: 'transparent', border: 'none', borderRadius: 0,
                padding: '0.4rem 0.7rem', textAlign: 'left',
              }}
            >
              {card.image && (
                <img src={card.image} alt="" style={{ width: 28, height: 39, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />
              )}
              <span style={{ fontSize: '0.88rem' }}>{card.name} <span style={{ color: 'var(--parchment-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>({card.id})</span></span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
