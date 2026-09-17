import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import UsernameTag from '../components/UsernameTag.jsx'
import LeaderSearch from '../components/LeaderSearch.jsx'

export default function Decks() {
  const [decks, setDecks] = useState([])
  const [name, setName] = useState('')
  const [leader, setLeader] = useState('')
  const [leaderCard, setLeaderCard] = useState(null) // {id, name, image} once picked from search
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState(null)

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

  async function addDeck(e) {
    e.preventDefault()
    setError('')
    if (!leader.trim()) { setError('Pick or type a leader.'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('decks')
      .insert({
        name,
        leader,
        leader_card_id: leaderCard?.id ?? null,
        leader_image_url: leaderCard?.image ?? null,
        owner_id: user.id,
      })
    if (error) setError(error.message)
    else {
      setName(''); setLeader(''); setLeaderCard(null)
      load()
    }
  }

  async function removeDeck(id) {
    await supabase.from('decks').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Add a deck</h3>
        <form onSubmit={addDeck} className="form-grid">
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
              onTextChange={setLeader}
              onSelect={setLeaderCard}
              placeholder="Start typing a leader name…"
            />
          </div>
        </form>
        {error && <p className="error-text">{error}</p>}
        <button className="primary" onClick={addDeck}>Add deck</button>
      </div>

      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : decks.length === 0 ? (
        <p className="empty-state">No decks logged yet — add your first one above.</p>
      ) : (
        <div className="table-scroll">
        <table>
          <thead>
            <tr><th>Deck</th><th>Leader</th><th>Owner</th><th></th></tr>
          </thead>
          <tbody>
            {decks.map((d) => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {d.leader_image_url && (
                    <img src={d.leader_image_url} alt="" style={{ width: 24, height: 34, objectFit: 'cover', borderRadius: 2 }} />
                  )}
                  {d.leader}
                </td>
                <td><UsernameTag username={d.profiles?.username} /></td>
                <td>
                  {d.owner_id === userId && (
                    <button onClick={() => removeDeck(d.id)} style={{ fontSize: '0.8rem' }}>Remove</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  )
}
