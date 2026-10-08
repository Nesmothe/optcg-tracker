import { useEffect } from 'react'
import DecklistView from './DecklistView.jsx'

// Popup showing the decklist that was saved with a match (card grid, copy
// button, QR code). Works for any match row that has a `decklist` snapshot.
export default function DecklistDialog({ match, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const deckName = match.decks?.name || 'Deck'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Decklist used: ${deckName}`}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50, padding: '1rem',
        background: 'rgba(5, 10, 18, 0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 680, maxHeight: '88vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.9rem' }}>
          <div>
            <h3 style={{ marginBottom: '0.2rem' }}>{deckName}</h3>
            <div style={{ fontSize: '0.82rem', color: 'var(--parchment-dim)' }}>
              Decklist used · vs {match.opponent_deck} ·{' '}
              {match.result === 'win'
                ? <span className="win-tag">Win</span>
                : <span className="loss-tag">Loss</span>}
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ fontSize: '0.8rem' }}>Close</button>
        </div>
        <DecklistView cards={match.decklist} deckName={deckName} />
      </div>
    </div>
  )
}
