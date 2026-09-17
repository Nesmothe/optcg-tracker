import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import UsernameTag from '../components/UsernameTag.jsx'
import WinLossRing from '../components/WinLossRing.jsx'

const ALL_PLAYERS = 'all'
const ALL_DECKS = 'all'
const ALL_VALUE = 'all'
const RING_SIZE = 165 // ~25% bigger than WinLossRing's own default of 132

export default function Dashboard() {
  const [matches, setMatches] = useState([])
  const [profiles, setProfiles] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)
  const [loading, setLoading] = useState(true)

  const [playerFilter, setPlayerFilter] = useState(null) // defaults to "me" once known
  const [deckFilter, setDeckFilter] = useState(ALL_DECKS)
  const [opponentFilter, setOpponentFilter] = useState(ALL_VALUE) // opponent deck (matchup)
  const [vsPlayerFilter, setVsPlayerFilter] = useState(ALL_VALUE) // opponent player

  useEffect(() => {
    async function load() {
      const [{ data: m }, { data: p }, { data: userData }] = await Promise.all([
        supabase.from('matches').select('*, decks(name, leader, leader_image_url), profiles(username)').order('played_at', { ascending: false }),
        supabase.from('profiles').select('id, username'),
        supabase.auth.getUser(),
      ])
      setMatches(m || [])
      setProfiles(p || [])
      const uid = userData.user?.id ?? null
      setCurrentUserId(uid)
      setPlayerFilter(uid)
      setLoading(false)
    }
    load()
  }, [])

  // Reset the narrower filters whenever a broader one changes.
  useEffect(() => { setDeckFilter(ALL_DECKS) }, [playerFilter])
  useEffect(() => {
    setOpponentFilter(ALL_VALUE)
    setVsPlayerFilter(ALL_VALUE)
  }, [deckFilter, playerFilter])

  const matchesByPlayer = useMemo(
    () => playerFilter === ALL_PLAYERS ? matches : matches.filter((m) => m.player_id === playerFilter),
    [matches, playerFilter]
  )

  const matchesByPlayerAndDeck = useMemo(
    () => deckFilter === ALL_DECKS ? matchesByPlayer : matchesByPlayer.filter((m) => m.deck_id === deckFilter),
    [matchesByPlayer, deckFilter]
  )

  // Two independent facets on top of player+deck: which opponent deck, and
  // which opponent player. Both draw their option lists from the same scope
  // so either can be picked (or both, together) without hiding the other.
  const opponentDeckOptions = useMemo(() => {
    const set = new Set(matchesByPlayerAndDeck.map((m) => m.opponent_deck).filter(Boolean))
    return Array.from(set).sort()
  }, [matchesByPlayerAndDeck])

  const vsPlayerOptions = useMemo(() => {
    const set = new Set(matchesByPlayerAndDeck.map((m) => m.opponent_player).filter(Boolean))
    return Array.from(set).sort()
  }, [matchesByPlayerAndDeck])

  const afterVsPlayer = useMemo(
    () => vsPlayerFilter === ALL_VALUE
      ? matchesByPlayerAndDeck
      : matchesByPlayerAndDeck.filter((m) => m.opponent_player === vsPlayerFilter),
    [matchesByPlayerAndDeck, vsPlayerFilter]
  )

  const finalFiltered = useMemo(
    () => opponentFilter === ALL_VALUE
      ? afterVsPlayer
      : afterVsPlayer.filter((m) => m.opponent_deck === opponentFilter),
    [afterVsPlayer, opponentFilter]
  )

  const overall = useMemo(() => {
    const wins = finalFiltered.filter((m) => m.result === 'win').length
    const total = finalFiltered.length
    return { wins, losses: total - wins, total, rate: total ? Math.round((wins / total) * 100) : 0 }
  }, [finalFiltered])

  // Everything that should scope the "by deck" rings except the deck choice
  // itself — so picking an opponent narrows the rings to that matchup.
  const matchesForRings = useMemo(() => {
    let list = matchesByPlayer
    if (vsPlayerFilter !== ALL_VALUE) list = list.filter((m) => m.opponent_player === vsPlayerFilter)
    if (opponentFilter !== ALL_VALUE) list = list.filter((m) => m.opponent_deck === opponentFilter)
    return list
  }, [matchesByPlayer, vsPlayerFilter, opponentFilter])

  const byDeck = useMemo(() => {
    const map = {}
    for (const m of matchesForRings) {
      const key = m.decks?.name || 'Unknown'
      if (!map[key]) map[key] = { name: key, wins: 0, total: 0, image: m.decks?.leader_image_url || null }
      map[key].total++
      if (m.result === 'win') map[key].wins++
    }
    return Object.values(map)
  }, [matchesForRings])

  // The opponent's own leader art, for the "VS" badge next to the rings.
  const opponentImage = useMemo(() => {
    if (opponentFilter === ALL_VALUE) return null
    return matches.find((m) => m.opponent_deck === opponentFilter && m.opponent_leader_image_url)
      ?.opponent_leader_image_url ?? null
  }, [matches, opponentFilter])

  const byOpponent = useMemo(() => {
    const map = {}
    for (const m of afterVsPlayer) {
      const key = m.opponent_deck || 'Unknown'
      if (!map[key]) map[key] = { name: key, wins: 0, total: 0 }
      map[key].total++
      if (m.result === 'win') map[key].wins++
    }
    return Object.values(map)
      .map((d) => ({ ...d, winrate: Math.round((d.wins / d.total) * 100) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [afterVsPlayer])

  const deckOptions = useMemo(() => {
    const map = new Map()
    for (const m of matchesByPlayer) {
      if (!m.deck_id || map.has(m.deck_id)) continue
      const deckName = m.decks?.name || 'Unknown deck'
      map.set(m.deck_id, {
        id: m.deck_id,
        label: playerFilter === ALL_PLAYERS ? `${deckName} (${m.profiles?.username ?? 'unknown'})` : deckName,
        image: m.decks?.leader_image_url || null,
      })
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [matchesByPlayer, playerFilter])

  if (loading) return <p className="empty-state">Loading…</p>
  if (matches.length === 0) {
    return <p className="empty-state">No matches logged yet — head to "Log a match" to add your first one.</p>
  }

  const playerLabel = playerFilter === ALL_PLAYERS
    ? 'everyone combined'
    : playerFilter === currentUserId
      ? 'you'
      : (profiles.find((p) => p.id === playerFilter)?.username ?? 'this player')

  const statLabelBits = [`Winrate — ${playerLabel}`]
  if (deckFilter !== ALL_DECKS) statLabelBits.push('this deck')
  if (opponentFilter !== ALL_VALUE) statLabelBits.push(`vs ${opponentFilter}`)
  if (vsPlayerFilter !== ALL_VALUE) statLabelBits.push(`against ${vsPlayerFilter}`)

  return (
    <div>
      <div className="form-grid" style={{ marginBottom: '0.9rem' }}>
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

      {(opponentDeckOptions.length > 0 || vsPlayerOptions.length > 0) && (
        <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
          {opponentDeckOptions.length > 0 && (
            <div>
              <label htmlFor="opponentFilter">Against deck (matchup)</label>
              <select id="opponentFilter" value={opponentFilter} onChange={(e) => setOpponentFilter(e.target.value)}>
                <option value={ALL_VALUE}>Any deck</option>
                {opponentDeckOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          )}
          {vsPlayerOptions.length > 0 && (
            <div>
              <label htmlFor="vsPlayerFilter">Against player</label>
              <select id="vsPlayerFilter" value={vsPlayerFilter} onChange={(e) => setVsPlayerFilter(e.target.value)}>
                <option value={ALL_VALUE}>Anyone</option>
                {vsPlayerOptions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      <div className="stat-row">
        <div className="card">
          <div className="stat-figure">{overall.rate}%</div>
          <div className="stat-label">{statLabelBits.join(' · ')}</div>
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

      {byDeck.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3>
            {deckFilter === ALL_DECKS ? `Winrate by deck — ${playerLabel}` : 'Winrate for this deck'}
            {opponentFilter !== ALL_VALUE ? ` vs ${opponentFilter}` : ''}
            {vsPlayerFilter !== ALL_VALUE ? ` — against ${vsPlayerFilter}` : ''}
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '1.6rem' }}>
            {deckFilter === ALL_DECKS
              ? byDeck.map((d) => <WinLossRing key={d.name} name={d.name} wins={d.wins} total={d.total} image={d.image} size={RING_SIZE} />)
              : overall.total > 0 && (
                <WinLossRing
                  name={deckOptions.find((d) => d.id === deckFilter)?.label ?? 'This deck'}
                  wins={overall.wins}
                  total={overall.total}
                  image={deckOptions.find((d) => d.id === deckFilter)?.image}
                  size={RING_SIZE}
                />
              )}
            {opponentFilter !== ALL_VALUE && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--brass)', fontWeight: 700 }}>VS</span>
                <div style={{ width: RING_SIZE, textAlign: 'center' }}>
                  {opponentImage ? (
                    <img
                      src={opponentImage}
                      alt=""
                      style={{
                        display: 'block', margin: '0 auto',
                        width: RING_SIZE, height: RING_SIZE, borderRadius: '50%',
                        objectFit: 'cover', border: '2px solid var(--border)',
                      }}
                    />
                  ) : (
                    <div style={{
                      width: RING_SIZE, height: RING_SIZE, borderRadius: '50%', border: '2px solid var(--border)',
                      background: 'var(--ink-surface-raised)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '0.7rem', color: 'var(--parchment-dim)', padding: '0 0.4rem',
                      textAlign: 'center', margin: '0 auto',
                    }}>
                      No art
                    </div>
                  )}
                  <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', textAlign: 'center' }}>{opponentFilter}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {opponentFilter === ALL_VALUE && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3>
            {deckFilter === ALL_DECKS ? 'Toughest matchups' : 'Matchup breakdown for this deck'}
            {vsPlayerFilter !== ALL_VALUE ? ` — against ${vsPlayerFilter}` : ''}
          </h3>
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
