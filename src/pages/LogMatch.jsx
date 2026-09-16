import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function LogMatch() {
  const [decks, setDecks] = useState([])
  const [deckId, setDeckId] = useState('')
  const [opponentDeck, setOpponentDeck] = useState('')
  const [opponentPlayer, setOpponentPlayer] = useState('')
  const [result, setResult] = useState('win')
  const [wentFirst, setWentFirst] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('decks').select('id, name, leader').order('created_at')
      .then(({ data }) => { setDecks(data || []); if (data?.length) setDeckId(data[0].id) })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaved(false)
    if (!deckId) { setError('Add a deck first, on the Decks tab.'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('matches').insert({
      player_id: user.id,
      deck_id: deckId,
      opponent_deck: opponentDeck,
      opponent_player: opponentPlayer || null,
      result,
      went_first: wentFirst === '' ? null : wentFirst === 'yes',
      notes: notes || null,
    })
    if (error) setError(error.message)
    else {
      setSaved(true)
      setOpponentDeck(''); setOpponentPlayer(''); setNotes(''); setWentFirst(''); setResult('win')
    }
  }

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <h3>Log a match</h3>
      {decks.length === 0 && (
        <p style={{ color: 'var(--parchment-dim)' }}>You don\u2019t have any decks yet — add one on the Decks tab first.</p>
      )}
      <form onSubmit={handleSubmit}>
        <label htmlFor="deck">Your deck</label>
        <select id="deck" value={deckId} onChange={(e) => setDeckId(e.target.value)} style={{ marginBottom: '0.9rem' }}>
          {decks.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.leader})</option>)}
        </select>

        <label htmlFor="oppDeck">Opponent's deck / leader</label>
        <input id="oppDeck" required value={opponentDeck} onChange={(e) => setOpponentDeck(e.target.value)}
          placeholder="e.g. Red Kid leader rush" style={{ marginBottom: '0.9rem' }} />

        <label htmlFor="oppPlayer">Opponent (optional, if a friend)</label>
        <input id="oppPlayer" value={opponentPlayer} onChange={(e) => setOpponentPlayer(e.target.value)}
          placeholder="e.g. Marc" style={{ marginBottom: '0.9rem' }} />

        <div className="form-grid">
          <div>
            <label htmlFor="result">Result</label>
            <select id="result" value={result} onChange={(e) => setResult(e.target.value)}>
              <option value="win">Win</option>
              <option value="loss">Loss</option>
            </select>
          </div>
          <div>
            <label htmlFor="first">Went first?</label>
            <select id="first" value={wentFirst} onChange={(e) => setWentFirst(e.target.value)}>
              <option value="">Not sure / N/A</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>

        <label htmlFor="notes">Notes on this game (optional)</label>
        <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="What happened, what you'd do differently…" style={{ marginBottom: '1rem' }} />

        {error && <p className="error-text">{error}</p>}
        {saved && <p style={{ color: 'var(--win)', fontSize: '0.85rem', marginBottom: '0.6rem' }}>Match logged.</p>}
        <button type="submit" className="primary">Save match</button>
      </form>
    </div>
  )
}
