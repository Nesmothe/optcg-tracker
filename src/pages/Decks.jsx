import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Decks() {
  const [decks, setDecks] = useState([])
  const [name, setName] = useState('')
  const [leader, setLeader] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('decks')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setDecks(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addDeck(e) {
    e.preventDefault()
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('decks')
      .insert({ name, leader, owner_id: user.id })
    if (error) setError(error.message)
    else {
      setName(''); setLeader('')
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
            <input id="deckLeader" required value={leader} onChange={(e) => setLeader(e.target.value)}
              placeholder="e.g. Monkey D. Luffy (OP01-060)" />
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
        <table>
          <thead>
            <tr><th>Deck</th><th>Leader</th><th></th></tr>
          </thead>
          <tbody>
            {decks.map((d) => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td>{d.leader}</td>
                <td>
                  <button onClick={() => removeDeck(d.id)} style={{ fontSize: '0.8rem' }}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
