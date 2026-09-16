import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import UsernameTag from '../components/UsernameTag.jsx'

export default function MatchupNotes() {
  const [notes, setNotes] = useState([])
  const [yourDeck, setYourDeck] = useState('')
  const [opponentDeck, setOpponentDeck] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id))
  }, [])

  async function load() {
    const { data, error } = await supabase
      .from('matchup_notes')
      .select('*, profiles(username)')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setNotes(data)
  }

  useEffect(() => { load() }, [])

  async function addNote(e) {
    e.preventDefault()
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('matchup_notes').insert({
      author_id: user.id, your_deck: yourDeck, opponent_deck: opponentDeck, note,
    })
    if (error) setError(error.message)
    else { setYourDeck(''); setOpponentDeck(''); setNote(''); load() }
  }

  async function removeNote(id) {
    await supabase.from('matchup_notes').delete().eq('id', id)
    load()
  }

  const filtered = filter
    ? notes.filter((n) =>
        n.your_deck.toLowerCase().includes(filter.toLowerCase()) ||
        n.opponent_deck.toLowerCase().includes(filter.toLowerCase()))
    : notes

  return (
    <div>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Add a matchup note</h3>
        <form onSubmit={addNote}>
          <div className="form-grid">
            <div>
              <label htmlFor="yd">Your deck (leader)</label>
              <input id="yd" required value={yourDeck} onChange={(e) => setYourDeck(e.target.value)}
                placeholder="e.g. Purple Luffy" />
            </div>
            <div>
              <label htmlFor="od">Opponent deck (leader)</label>
              <input id="od" required value={opponentDeck} onChange={(e) => setOpponentDeck(e.target.value)}
                placeholder="e.g. Red Kid" />
            </div>
          </div>
          <label htmlFor="noteText">Note</label>
          <textarea id="noteText" required rows={3} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Hold removal for their turn-3 rush, don't trade life cards early…"
            style={{ marginBottom: '0.9rem' }} />
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="primary">Save note</button>
        </form>
      </div>

      <input
        placeholder="Filter by deck name…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{ marginBottom: '1rem' }}
      />

      {filtered.length === 0 ? (
        <p className="empty-state">No matchup notes yet.</p>
      ) : (
        filtered.map((n) => (
          <div key={n.id} className="card" style={{ marginBottom: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--brass-bright)' }}>
                {n.your_deck} vs {n.opponent_deck}
              </strong>
              {n.author_id === userId && (
                <button onClick={() => removeNote(n.id)} style={{ fontSize: '0.75rem' }}>Remove</button>
              )}
            </div>
            <p style={{ margin: '0 0 0.4rem 0', color: 'var(--parchment)' }}>{n.note}</p>
            <p style={{ margin: 0, fontSize: '0.78rem' }}>
              — <UsernameTag username={n.profiles?.username} />
            </p>
          </div>
        ))
      )}
    </div>
  )
}
