import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const emptyForm = {
  deckId: '',
  opponentDeck: '',
  opponentPlayer: '',
  result: 'win',
  wentFirst: '',
  notes: '',
}

export default function LogMatch() {
  const [decks, setDecks] = useState([])
  const [myMatches, setMyMatches] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [userId, setUserId] = useState(null)

  async function loadDecks() {
    const { data } = await supabase.from('decks').select('id, name, leader').order('created_at')
    setDecks(data || [])
    return data || []
  }

  async function loadMyMatches(uid) {
    const { data } = await supabase
      .from('matches')
      .select('*, decks(name, leader)')
      .eq('player_id', uid)
      .order('played_at', { ascending: false })
    setMyMatches(data || [])
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user.id)
      const deckList = await loadDecks()
      if (deckList.length) setForm((f) => ({ ...f, deckId: deckList[0].id }))
      await loadMyMatches(user.id)
    }
    init()
  }, [])

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function startEdit(m) {
    setEditingId(m.id)
    setForm({
      deckId: m.deck_id,
      opponentDeck: m.opponent_deck,
      opponentPlayer: m.opponent_player || '',
      result: m.result,
      wentFirst: m.went_first === null ? '' : (m.went_first ? 'yes' : 'no'),
      notes: m.notes || '',
    })
    setSaved(false)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm({ ...emptyForm, deckId: decks[0]?.id || '' })
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaved(false)
    if (!form.deckId) { setError('Add a deck first, on the Decks tab.'); return }

    const payload = {
      deck_id: form.deckId,
      opponent_deck: form.opponentDeck,
      opponent_player: form.opponentPlayer || null,
      result: form.result,
      went_first: form.wentFirst === '' ? null : form.wentFirst === 'yes',
      notes: form.notes || null,
    }

    let error
    if (editingId) {
      ;({ error } = await supabase.from('matches').update(payload).eq('id', editingId))
    } else {
      ;({ error } = await supabase.from('matches').insert({ ...payload, player_id: userId }))
    }

    if (error) {
      setError(error.message)
    } else {
      setSaved(true)
      setEditingId(null)
      setForm({ ...emptyForm, deckId: form.deckId })
      loadMyMatches(userId)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remove this match? This can\'t be undone.')) return
    await supabase.from('matches').delete().eq('id', id)
    if (editingId === id) cancelEdit()
    loadMyMatches(userId)
  }

  return (
    <div>
      <div className="card" style={{ maxWidth: 520, marginBottom: '1.5rem' }}>
        <h3>{editingId ? 'Edit match' : 'Log a match'}</h3>
        {decks.length === 0 && (
          <p style={{ color: 'var(--parchment-dim)' }}>You don\u2019t have any decks yet — add one on the Decks tab first.</p>
        )}
        <form onSubmit={handleSubmit}>
          <label htmlFor="deck">Your deck</label>
          <select id="deck" value={form.deckId} onChange={(e) => updateField('deckId', e.target.value)} style={{ marginBottom: '0.9rem' }}>
            {decks.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.leader})</option>)}
          </select>

          <label htmlFor="oppDeck">Opponent's deck / leader</label>
          <input id="oppDeck" required value={form.opponentDeck} onChange={(e) => updateField('opponentDeck', e.target.value)}
            placeholder="e.g. Red Kid leader rush" style={{ marginBottom: '0.9rem' }} />

          <label htmlFor="oppPlayer">Opponent (optional, if a friend)</label>
          <input id="oppPlayer" value={form.opponentPlayer} onChange={(e) => updateField('opponentPlayer', e.target.value)}
            placeholder="e.g. Marc" style={{ marginBottom: '0.9rem' }} />

          <div className="form-grid">
            <div>
              <label htmlFor="result">Result</label>
              <select id="result" value={form.result} onChange={(e) => updateField('result', e.target.value)}>
                <option value="win">Win</option>
                <option value="loss">Loss</option>
              </select>
            </div>
            <div>
              <label htmlFor="first">Went first?</label>
              <select id="first" value={form.wentFirst} onChange={(e) => updateField('wentFirst', e.target.value)}>
                <option value="">Not sure / N/A</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>

          <label htmlFor="notes">Notes on this game (optional)</label>
          <textarea id="notes" rows={3} value={form.notes} onChange={(e) => updateField('notes', e.target.value)}
            placeholder="What happened, what you'd do differently…" style={{ marginBottom: '1rem' }} />

          {error && <p className="error-text">{error}</p>}
          {saved && <p style={{ color: 'var(--win)', fontSize: '0.85rem', marginBottom: '0.6rem' }}>
            {editingId ? 'Match updated.' : 'Match logged.'}
          </p>}
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button type="submit" className="primary">{editingId ? 'Update match' : 'Save match'}</button>
            {editingId && <button type="button" onClick={cancelEdit}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Your logged matches</h3>
        {myMatches.length === 0 ? (
          <p className="empty-state">You haven't logged any matches yet.</p>
        ) : (
          <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Deck</th><th>Opponent</th><th>Result</th><th></th></tr>
            </thead>
            <tbody>
              {myMatches.map((m) => (
                <tr key={m.id}>
                  <td>{m.decks?.name}</td>
                  <td>{m.opponent_deck}</td>
                  <td>
                    {m.result === 'win'
                      ? <span className="win-tag">Win</span>
                      : <span className="loss-tag">Loss</span>}
                  </td>
                  <td style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => startEdit(m)} style={{ fontSize: '0.78rem' }}>Edit</button>
                    <button onClick={() => handleDelete(m.id)} style={{ fontSize: '0.78rem' }}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
