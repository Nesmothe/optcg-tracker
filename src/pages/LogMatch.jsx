import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import LeaderSearch from '../components/LeaderSearch.jsx'
import TournamentControl from '../components/TournamentControl.jsx'
import DecklistDialog from '../components/DecklistDialog.jsx'

const emptyForm = {
  deckId: '',
  opponentDeck: '',
  opponentPlayer: '',
  result: 'win',
  wentFirst: '',
  notes: '',
}

export default function LogMatch({ activeTournament, onTournamentChange }) {
  const [decks, setDecks] = useState([])
  const [myMatches, setMyMatches] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [opponentLeaderCard, setOpponentLeaderCard] = useState(null) // {id, name, image} once picked
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [userId, setUserId] = useState(null)
  const [attachList, setAttachList] = useState(false) // edit mode: add the deck's current list to an older match
  const [listFor, setListFor] = useState(null) // match whose saved decklist is open in the popup

  async function loadDecks(uid) {
    const { data } = await supabase.from('decks').select('id, name, leader, decklist').eq('owner_id', uid).order('created_at')
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
      const deckList = await loadDecks(user.id)
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
    setOpponentLeaderCard(
      m.opponent_leader_card_id
        ? { id: m.opponent_leader_card_id, name: m.opponent_deck, image: m.opponent_leader_image_url }
        : null
    )
    setAttachList(false)
    setSaved(false)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm({ ...emptyForm, deckId: decks[0]?.id || '' })
    setOpponentLeaderCard(null)
    setAttachList(false)
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaved(false)
    if (!form.deckId) { setError('Add a deck first, on the Decks tab.'); return }
    if (!form.opponentDeck.trim()) { setError('Enter the opponent\'s leader.'); return }

    const payload = {
      deck_id: form.deckId,
      opponent_deck: form.opponentDeck,
      opponent_leader_card_id: opponentLeaderCard?.id ?? null,
      opponent_leader_image_url: opponentLeaderCard?.image ?? null,
      opponent_player: form.opponentPlayer || null,
      result: form.result,
      went_first: form.wentFirst === '' ? null : form.wentFirst === 'yes',
      notes: form.notes || null,
    }

    // The match keeps its own COPY of the deck's decklist, so it still shows
    // what you played even after you later replace the deck's list.
    const chosenDeck = decks.find((d) => d.id === form.deckId)
    const deckList = chosenDeck?.decklist?.length ? chosenDeck.decklist : null

    let error
    if (editingId) {
      // Editing keeps the list saved when the match was logged. It is only
      // replaced if you switched decks, or ticked the "save current list" box.
      const original = myMatches.find((m) => m.id === editingId)
      if ((original && original.deck_id !== form.deckId) || attachList) payload.decklist = deckList
      ;({ error } = await supabase.from('matches').update(payload).eq('id', editingId))
    } else {
      const row = { ...payload, player_id: userId }
      if (deckList) row.decklist = deckList
      if (activeTournament) row.tournament_id = activeTournament.id
      ;({ error } = await supabase.from('matches').insert(row))
    }

    if (error) {
      setError(error.message)
    } else {
      setSaved(true)
      setEditingId(null)
      setAttachList(false)
      setForm({ ...emptyForm, deckId: form.deckId })
      setOpponentLeaderCard(null)
      loadMyMatches(userId)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remove this match? This can\'t be undone.')) return
    await supabase.from('matches').delete().eq('id', id)
    if (editingId === id) cancelEdit()
    loadMyMatches(userId)
  }

  const runMatches = activeTournament
    ? myMatches.filter((m) => m.tournament_id === activeTournament.id)
    : []

  // What will happen to the decklist when this form is saved.
  const selectedDeck = decks.find((d) => d.id === form.deckId)
  const selectedHasList = !!selectedDeck?.decklist?.length
  const originalMatch = editingId ? myMatches.find((m) => m.id === editingId) : null
  const deckChanged = !!originalMatch && originalMatch.deck_id !== form.deckId
  const originalHasList = !!originalMatch?.decklist?.length
  const offerAttach = !!editingId && !deckChanged && !originalHasList && selectedHasList

  let listHint = null
  if (selectedDeck) {
    if (!editingId || deckChanged) {
      listHint = selectedHasList
        ? "This deck's current decklist will be saved with the match."
        : 'No decklist on this deck yet — add one on the Decks tab to record it with your matches.'
    } else if (originalHasList) {
      listHint = 'This match keeps the decklist that was saved when it was logged.'
    }
  }

  return (
    <div>
      <TournamentControl
        userId={userId}
        activeTournament={activeTournament}
        onChange={onTournamentChange}
        runMatches={runMatches}
        onMatchesDeleted={() => loadMyMatches(userId)}
      />

      <div className="card" style={{ maxWidth: 520, marginBottom: '1.5rem' }}>
        <h3>
          {editingId
            ? 'Edit match'
            : activeTournament
              ? `Log a match — round ${runMatches.length + 1}`
              : 'Log a match'}
        </h3>
        {activeTournament && !editingId && (
          <p style={{ margin: '0 0 0.9rem', fontSize: '0.82rem', color: 'var(--parchment-dim)' }}>
            This match will be added to your tournament run.
          </p>
        )}
        {decks.length === 0 && (
          <p style={{ color: 'var(--parchment-dim)' }}>You don’t have any decks yet — add one on the Decks tab first.</p>
        )}
        <form onSubmit={handleSubmit}>
          <label htmlFor="deck">Your deck</label>
          <div style={{ marginBottom: '0.9rem' }}>
            <select id="deck" value={form.deckId} onChange={(e) => updateField('deckId', e.target.value)}>
              {decks.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.leader})</option>)}
            </select>
            {listHint && (
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: 'var(--parchment-dim)' }}>{listHint}</p>
            )}
            {offerAttach && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0 0', fontSize: '0.82rem', color: 'var(--parchment)' }}>
                <input
                  type="checkbox"
                  checked={attachList}
                  onChange={(e) => setAttachList(e.target.checked)}
                  style={{ width: 'auto' }}
                />
                Save this deck's current decklist with this match
              </label>
            )}
          </div>

          <label htmlFor="oppDeck">Opponent's leader</label>
          <div style={{ marginBottom: '0.9rem' }}>
            <LeaderSearch
              id="oppDeck"
              value={form.opponentDeck}
              onTextChange={(v) => updateField('opponentDeck', v)}
              onSelect={setOpponentLeaderCard}
              placeholder="Start typing a leader name…"
            />
          </div>

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
              <tr><th>Deck</th><th>Opponent</th><th>Vs. player</th><th>Result</th><th>Notes</th><th></th></tr>
            </thead>
            <tbody>
              {myMatches.map((m) => (
                <tr key={m.id}>
                  <td>{m.decks?.name}</td>
                  <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {m.opponent_leader_image_url && (
                      <img src={m.opponent_leader_image_url} alt="" style={{ width: 22, height: 31, objectFit: 'cover', borderRadius: 2 }} />
                    )}
                    {m.opponent_deck}
                  </td>
                  <td>{m.opponent_player || '—'}</td>
                  <td>
                    {m.result === 'win'
                      ? <span className="win-tag">Win</span>
                      : <span className="loss-tag">Loss</span>}
                    {m.tournament_id && (
                      <span style={{ color: 'var(--brass)', fontSize: '0.72rem', marginLeft: '0.45rem' }}>tournament</span>
                    )}
                  </td>
                  <td style={{ whiteSpace: 'normal', maxWidth: 220 }}>{m.notes || '—'}</td>
                  <td style={{ display: 'flex', gap: '0.5rem' }}>
                    {m.decklist?.length > 0 && (
                      <button onClick={() => setListFor(m)} style={{ fontSize: '0.78rem' }}>Decklist</button>
                    )}
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

      {listFor && <DecklistDialog match={listFor} onClose={() => setListFor(null)} />}
    </div>
  )
}
