import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '../supabaseClient'

export default function Dashboard() {
  const [matches, setMatches] = useState([])
  const [decks, setDecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [deckFilter, setDeckFilter] = useState('all')

  useEffect(() => {
    async function load() {
      const [{ data: m }, { data: d }] = await Promise.all([
        supabase.from('matches').select('*, decks(name, leader)').order('played_at', { ascending: false }),
        supabase.from('decks').select('id, name'),
      ])
      setMatches(m || [])
      setDecks(d || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(
    () => deckFilter === 'all' ? matches : matches.filter((m) => m.deck_id === deckFilter),
    [matches, deckFilter]
  )

  const overall = useMemo(() => {
    const wins = filtered.filter((m) => m.result === 'win').length
    const total = filtered.length
    return { wins, losses: total - wins, total, rate: total ? Math.round((wins / total) * 100) : 0 }
  }, [filtered])

  const byDeck = useMemo(() => {
    const map = {}
    for (const m of matches) {
      const key = m.decks?.name || 'Unknown'
      if (!map[key]) map[key] = { name: key, wins: 0, total: 0 }
      map[key].total++
      if (m.result === 'win') map[key].wins++
    }
    return Object.values(map).map((d) => ({ ...d, winrate: Math.round((d.wins / d.total) * 100) }))
  }, [matches])

  const byOpponent = useMemo(() => {
    const map = {}
    for (const m of filtered) {
      const key = m.opponent_deck || 'Unknown'
      if (!map[key]) map[key] = { name: key, wins: 0, total: 0 }
      map[key].total++
      if (m.result === 'win') map[key].wins++
    }
    return Object.values(map)
      .map((d) => ({ ...d, winrate: Math.round((d.wins / d.total) * 100) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [filtered])

  if (loading) return <p className="empty-state">Loading…</p>
  if (matches.length === 0) {
    return <p className="empty-state">No matches logged yet — head to "Log a match" to add your first one.</p>
  }

  return (
    <div>
      <div style={{ marginBottom: '1.2rem' }}>
        <label htmlFor="deckFilter">Filter by deck</label>
        <select id="deckFilter" value={deckFilter} onChange={(e) => setDeckFilter(e.target.value)} style={{ maxWidth: 260 }}>
          <option value="all">All decks (combined)</option>
          {decks.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      <div className="stat-row">
        <div className="card">
          <div className="stat-figure">{overall.rate}%</div>
          <div className="stat-label">Winrate</div>
        </div>
        <div className="card">
          <div className="stat-figure">{overall.total}</div>
          <div className="stat-label">Games played</div>
        </div>
        <div className="card">
          <div className="stat-figure"><span className="win-tag">{overall.wins}</span>–<span className="loss-tag">{overall.losses}</span></div>
          <div className="stat-label">Win – Loss</div>
        </div>
      </div>

      {deckFilter === 'all' && byDeck.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3>Winrate by deck</h3>
          <ResponsiveContainer width="100%" height={Math.max(120, byDeck.length * 46)}>
            <BarChart data={byDeck} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid stroke="#2a3f5a" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} stroke="#b9b2a0" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" stroke="#b9b2a0" width={130} tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#16273d', border: '1px solid #2a3f5a', color: '#ede6d6' }}
                formatter={(v, n, p) => [`${v}% (${p.payload.wins}/${p.payload.total})`, 'Winrate']}
              />
              <Bar dataKey="winrate" fill="#c89b3c" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        <h3>{deckFilter === 'all' ? 'Toughest matchups (all decks)' : 'Matchup breakdown'}</h3>
        <table>
          <thead>
            <tr><th>Opponent deck</th><th>Record</th><th>Winrate</th></tr>
          </thead>
          <tbody>
            {byOpponent.map((o) => (
              <tr key={o.name}>
                <td>{o.name}</td>
                <td><span className="win-tag">{o.wins}</span>–<span className="loss-tag">{o.total - o.wins}</span></td>
                <td>{o.winrate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
