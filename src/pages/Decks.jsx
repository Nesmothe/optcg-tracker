import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import UsernameTag from '../components/UsernameTag.jsx'
import LeaderSearch from '../components/LeaderSearch.jsx'
import DecklistInput from '../components/DecklistInput.jsx'
import DecklistView from '../components/DecklistView.jsx'
import { fetchCard } from '../lib/crocoApi'
import { baseCardId, parseDecklist } from '../lib/decklist'

// Expanded panel under a deck row: shows the stored decklist (with export),
// and lets the owner paste in / replace it.
function DeckDetail({ deck, isOwner, onSaved }) {
  const hasList = deck.decklist?.length > 0
  const [editing, setEditing] = useState(!hasList && isOwner)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const parsed = useMemo(() => parseDecklist(text), [text])

  async function save() {
    setError('')
    if (!parsed.cards.length) { setError('Paste a decklist first.'); return }
    if (parsed.invalid.length) { setError('Some lines could not be read (see above) — fix them first so nothing gets dropped.'); return }
    setBusy(true)

    const update = { decklist: parsed.cards }

    // Backfill: if this deck never had a leader card attached, take it from
    // the first line of the list (the leader in an OPTCG Sim export).
    if (!deck.leader_card_id) {
      const leaderId = baseCardId(parsed.cards[0].id)
      const card = await fetchCard(leaderId)
      if (card?.card_type === 'Leader' && card.card_name) {
        update.leader = card.card_name
        update.leader_card_id = leaderId
        update.leader_image_url = card.card_image
      }
    }

    const { error } = await supabase.from('decks').update(update).eq('id', deck.id)
    setBusy(false)
    if (error) { setError(error.message); return }
    setText(''); setEditing(false); onSaved()
  }

  return (
    <div style={{ padding: '0.4rem 0 0.8rem' }}>
      {hasList && <DecklistView cards={deck.decklist} deckName={deck.name} />}
      {!hasList && !isOwner && (
        <p style={{ color: 'var(--parchment-dim)', margin: 0 }}>No decklist saved for this deck.</p>
      )}

      {isOwner && !editing && hasList && (
        <button type="button" onClick={() => setEditing(true)} style={{ fontSize: '0.78rem', marginTop: '0.9rem' }}>
          Replace decklist
        </button>
      )}

      {isOwner && editing && (
        <div style={{ marginTop: hasList ? '1rem' : 0, maxWidth: 520 }}>
          <label htmlFor={`dl-${deck.id}`}>{hasList ? 'Paste a new decklist' : 'Paste a decklist (OPTCG Sim format)'}</label>
          <DecklistInput id={`dl-${deck.id}`} value={text} onChange={setText} />
          {error && <p className="error-text">{error}</p>}
          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.7rem' }}>
            <button type="button" className="primary" onClick={save} disabled={busy}>
              {busy ? 'Saving…' : 'Save decklist'}
            </button>
            {hasList && <button type="button" onClick={() => { setEditing(false); setText(''); setError('') }}>Cancel</button>}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Decks() {
  const [decks, setDecks] = useState([])
  const [name, setName] = useState('')
  const [leader, setLeader] = useState('')
  const [leaderCard, setLeaderCard] = useState(null) // {id, name, image} once picked/detected
  const [decklistText, setDecklistText] = useState('')
  const [openDeckId, setOpenDeckId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState(null)
  const leaderManualRef = useRef(false) // true once the user types/picks a leader themselves

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id))
  }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('decks')
      .select('*, profiles(username)')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setDecks(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const parsedList = useMemo(() => parseDecklist(decklistText), [decklistText])
  const firstCardId = parsedList.cards[0]?.id

  // The first line of an OPTCG Sim export is the leader — look it up and fill
  // the leader field automatically, unless the user already chose one by hand.
  useEffect(() => {
    if (!firstCardId) return
    let cancelled = false
    const timer = setTimeout(async () => {
      const baseId = baseCardId(firstCardId)
      const card = await fetchCard(baseId)
      if (cancelled || leaderManualRef.current) return
      if (!card || card.card_type !== 'Leader' || !card.card_name) return
      setLeader(card.card_name)
      setLeaderCard({ id: baseId, name: card.card_name, image: card.card_image })
    }, 500)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [firstCardId])

  function handleLeaderText(value) {
    leaderManualRef.current = true
    setLeader(value)
  }

  async function addDeck(e) {
    e.preventDefault()
    setError('')
    if (!leader.trim()) { setError('Pick or type a leader (or paste a decklist and it will be detected).'); return }
    if (decklistText.trim() && parsedList.invalid.length) {
      setError('Some decklist lines could not be read — fix them or clear the box.')
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    const row = {
      name,
      leader,
      leader_card_id: leaderCard?.id ?? null,
      leader_image_url: leaderCard?.image ?? null,
      owner_id: user.id,
    }
    if (parsedList.cards.length) row.decklist = parsedList.cards
    const { error } = await supabase.from('decks').insert(row)
    if (error) setError(error.message)
    else {
      setName(''); setLeader(''); setLeaderCard(null); setDecklistText('')
      leaderManualRef.current = false
      load()
    }
  }

  async function removeDeck(id) {
    const { error } = await supabase.from('decks').delete().eq('id', id)
    if (error) {
      setError(error.code === '23503'
        ? 'This deck has matches logged with it, so it can\'t be removed.'
        : error.message)
    }
    load()
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Add a deck</h3>
        <form onSubmit={addDeck}>
          <div className="form-grid">
            <div>
              <label htmlFor="deckName">Deck nickname</label>
              <input id="deckName" required value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Purple Luffy aggro" />
            </div>
            <div>
              <label htmlFor="deckLeader">Leader card</label>
              <LeaderSearch
                id="deckLeader"
                value={leader}
                onTextChange={handleLeaderText}
                onSelect={(card) => { leaderManualRef.current = true; setLeaderCard(card) }}
                placeholder="Start typing a leader name…"
              />
            </div>
          </div>
          <label htmlFor="deckList">Decklist (optional) — paste from OPTCG Sim</label>
          <DecklistInput id="deckList" value={decklistText} onChange={setDecklistText} />
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="primary" style={{ marginTop: '0.9rem' }}>Add deck</button>
        </form>
      </div>

      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : decks.length === 0 ? (
        <p className="empty-state">No decks logged yet — add your first one above.</p>
      ) : (
        <div className="table-scroll">
        <table>
          <thead>
            <tr><th>Deck</th><th>Leader</th><th>Owner</th><th>Decklist</th><th></th></tr>
          </thead>
          <tbody>
            {decks.map((d) => {
              const isOwner = d.owner_id === userId
              const hasList = d.decklist?.length > 0
              const open = openDeckId === d.id
              return (
                <Fragment key={d.id}>
                  <tr>
                    <td>{d.name}</td>
                    <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {d.leader_image_url && (
                        <img src={d.leader_image_url} alt="" style={{ width: 24, height: 34, objectFit: 'cover', borderRadius: 2 }} />
                      )}
                      {d.leader}
                    </td>
                    <td><UsernameTag username={d.profiles?.username} /></td>
                    <td>
                      {hasList || isOwner ? (
                        <button onClick={() => setOpenDeckId(open ? null : d.id)} style={{ fontSize: '0.78rem' }}>
                          {open ? 'Hide' : hasList ? 'View' : 'Add'}
                        </button>
                      ) : '—'}
                    </td>
                    <td>
                      {isOwner && (
                        <button onClick={() => removeDeck(d.id)} style={{ fontSize: '0.8rem' }}>Remove</button>
                      )}
                    </td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={5} style={{ whiteSpace: 'normal' }}>
                        <DeckDetail deck={d} isOwner={isOwner} onSaved={load} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
        </div>
      )}
    </div>
  )
}
