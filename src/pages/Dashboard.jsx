import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '../supabaseClient'
import UsernameTag from '../components/UsernameTag.jsx'

const ALL_PLAYERS = 'all'
const ALL_DECKS = 'all'
const ALL_OPPONENTS = 'all'

export default function Dashboard() {
  const [matches, setMatches] = useState([])
  const [decks, setDecks] = useState([])
  const [profiles, setProfiles] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)
  const [loading, setLoading] = useState(true)

  const [playerFilter, setPlayerFilter] = useState(null) // set to "me" once we know who "me" is
  const [deckFilter, setDeckFilter] = useState(ALL_DECKS)
  const [opponentFilter, setOpponentFilter] = useState(ALL_OPPONENTS)

  useEffect(() => {
    async function load() {
      const [{ data: m }, { data: d }, { data: p }, { data: userData }] = await Promise.all([
        supabase.from('matches').select('*, decks(name, leader), profiles(username)').order('played_at', { ascending: false }),
        supabase.from('decks').select('id, name, owner_id, profiles(username)'),
        supabase.from('profiles').select('id, username'),
        supabase.auth.getUser(),
      ])
      setMatches(m || [])
      setDecks(d || [])
      setProfiles(p || [])
      const uid = userData.user?.id ?? null
      setCurrentUserId(uid)
      setPlayerFilter(uid) // default to "my own stats"
      setLoading(false)
    }
    load()
  }, [])

  // Reset the narrower filters whenever the player scope changes, since deck
  // ownership and opponent history are specific to whoever is selected.
  useEffect(() => { setDeckFilter(ALL_DECKS) }, [playerFilter])
  useEffect(() => { setOpponentFilter(ALL_OPPONENTS) }, [deckFilter, playerFilter])

  const matchesByPlayer = useMemo(
    () => playerFilter === ALL_PLAYERS ? matches : matches.filter((m) => m.player_id === playerFilter),
    [matches, playerFilter]
  )

  const matchesByPlayerAndDeck = useMemo(
    () => deckFilter === ALL_DECKS ? matchesByPlayer : matchesByPlayer.filter((m) => m.deck_id === deckFilter),
    [matchesByPlayer, deckFilter]
  )

  const finalFiltered = useMemo(
    () => opponentFilter === ALL_OPPONENTS
      ? matchesByPlayerAndDeck
      : matchesByPlayerAndDeck.filter((m) => m.opponent_deck === opponentFilter),
    [matchesByPlayerAndDeck, opponentFilter]
  )

  const overall = useMemo(() => {
    const wins = finalFiltered.filter((m) => m.result === 'win').length
    const total = finalFiltered.length
    return { wins, losses: total - wins, total, rate: total ? Math.round((wins / total) * 100) : 0 }
  }, [finalFiltered])

  // Winrate-by-deck chart respects the player scope only, so switching to
  // "All players" gives the combined pool for every deck, per your own or a
  // friend's individual view when a specific player is selected.
  const byDeck = useMemo(() => {
    const map = {}
    for (const m of matchesByPlayer) {
      const key = m.decks?.name || 'Unknown'
      if (!map[key]) map[key] = { name: key, wins: 0, total: 0 }
      map[key].total++
      if (m.result === 'win') map[key].wins++
    }
    return Object.values(map).map((d) => ({ ...d, winrate: Math.round((d.wins / d.total) * 100) }))
  }, [matchesByPlayer])

  const byOpponent = useMemo(() => {
    const map = {}
    for (const m of matchesByPlayerAndDeck) {
      const key = m.opponent_deck || 'Unknown'
      if (!map[key]) map[key] = { name: key, wins: 0, total: 0 }
      map[key].total++
      if (m.result === 'win') map[key].wins++
    }
    return Object.values(map)
      .map((d) => ({ ...d, winrate: Math.round((d.wins / d.total) * 100) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [matchesByPlayerAndDeck])

  // Deck dropdown: that player's own decks, or every deck (labeled by owner)
  // when viewing everyone combined.
  const deckOptions = useMemo(() => {
    const relevant = playerFilter === ALL_PLAYERS ? decks : decks.filter((d) => d.owner_id === playerFilter)
    return relevant.map((d) => ({
      id: d.id,
      label: playerFilter === ALL_PLAYERS ? `${d.name} (${d.profiles?.username ?? 'unknown'})` : d.name,
    }))
  }, [decks, playerFilter])

  // Opponent dropdown: distinct opponent decks actually faced within the
  // current player+deck scope, so the list only ever shows real matchups.
  const opponentOptions = useMemo(() => {
    const set = new Set(matchesByPlayerAndDeck.map((m) => m.opponent_deck).filter(Boolean))
    return Array.from(set).sort()
  }, [matchesByPlayerAndDeck])

  if (loading) return <p className="empty-state">Loading…</p>
  if (matches.length === 0) {
    return <p className="empty-state">No matches logged yet — head to "Log a match" to add your first one.</p>
  }

  const playerLabel = playerFilter === ALL_PLAYERS
    ? 'everyone combined'
    : playerFilter === currentUserId
      ? 'you'
      : (profiles.find((p) => p.id === playerFilter)?.username ?? 'this player')

  return (
    <div>
      <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
        <div>
          <label htmlFor="playerFilter">Whose stats</label>
          <select id="playerFilter" value={playerFilter ?? ''} onChange={(e) => setPlayerFilter(e.target.value)}>
            {currentUserId && <option value={currentUserId}>You</option>}
            {profiles.filter((p) => p.id !== currentUserId).map((p) => (
              <option key={p.id} value={p.id}>{p.username}</option>
            ))}
            <option value={ALL_PLAYERS}>All players (combined)</option>
          </select>
        </div>
        <div>
          <label htmlFor="deckFilter">Deck</label>
          <select id="deckFilter" value={deckFilter} onChange={(e) => setDeckFilter(e.target.value)}>
            <option value={ALL_DECKS}>All decks</option>
            {deckOptions.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </div>
      </div>

      {opponentOptions.length > 0 && (
        <div style={{ marginBottom: '1.5rem', maxWidth: 260 }}>
          <label htmlFor="opponentFilter">Against (matchup)</label>
          <select id="opponentFilter" value={opponentFilter} onChange={(e) => setOpponentFilter(e.target.value)}>
            <option value={ALL_OPPONENTS}>Any opponent</option>
            {opponentOptions.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      )}

      <div className="stat-row">
        <div className="card">
          <div className="stat-figure">{overall.rate}%</div>
          <div className="stat-label">
            Winrate — {playerLabel}
            {deckFilter !== ALL_DECKS && ' · this deck'}
            {opponentFilter !== ALL_OPPONENTS && ` vs ${opponentFilter}`}
          </div>
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

      {deckFilter === ALL_DECKS && byDeck.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3>Winrate by deck — {playerLabel}</h3>
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

      {opponentFilter === ALL_OPPONENTS && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3>{deckFilter === ALL_DECKS ? 'Toughest matchups' : 'Matchup breakdown for this deck'}</h3>
          <div className="table-scroll">
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
      )}

      <div className="card">
        <h3>Recent matches</h3>
        <div className="table-scroll">
        <table>
          <thead>
            <tr><th>Player</th><th>Deck</th><th>Opponent</th><th>Vs. player</th><th>Result</th><th>Notes</th></tr>
          </thead>
          <tbody>
            {finalFiltered.slice(0, 15).map((m) => (
              <tr key={m.id}>
                <td><UsernameTag username={m.profiles?.username} /></td>
                <td>{m.decks?.name}</td>
                <td>{m.opponent_deck}</td>
                <td>{m.opponent_player || '—'}</td>
                <td>
                  {m.result === 'win'
                    ? <span className="win-tag">Win</span>
                    : <span className="loss-tag">Loss</span>}
                </td>
                <td style={{ whiteSpace: 'normal', maxWidth: 220 }}>{m.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
