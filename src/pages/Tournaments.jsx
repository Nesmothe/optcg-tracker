import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import UsernameTag from '../components/UsernameTag.jsx'
import { STANDING_OPTIONS, formatRunDate, recordOf } from '../lib/tournaments'

export default function Tournaments() {
  const [runs, setRuns] = useState([])
  const [matches, setMatches] = useState([])
  const [userId, setUserId] = useState(null)
  const [scope, setScope] = useState('mine') // 'mine' | 'all'
  const [openId, setOpenId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [standingDraft, setStandingDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    const [{ data: r, error: runError }, { data: m }, { data: userData }] = await Promise.all([
      supabase.from('tournaments').select('*, profiles(username)').order('started_at', { ascending: false }),
      supabase
        .from('matches')
        .select('id, tournament_id, result, opponent_deck, opponent_leader_image_url, played_at, decks(name, leader_image_url)')
        .not('tournament_id', 'is', null)
        .order('played_at', { ascending: true }),
      supabase.auth.getUser(),
    ])
    if (runError) setError(runError.message)
    setRuns(r || [])
    setMatches(m || [])
    setUserId(userData.user?.id ?? null)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const matchesByRun = useMemo(() => {
    const map = {}
    for (const m of matches) (map[m.tournament_id] ||= []).push(m)
    return map
  }, [matches])

  const visibleRuns = scope === 'mine' ? runs.filter((r) => r.player_id === userId) : runs

  async function saveStanding(runId) {
    const { error } = await supabase
      .from('tournaments')
      .update({ final_standing: standingDraft.trim() || null })
      .eq('id', runId)
    if (error) { setError(error.message); return }
    setEditingId(null)
    load()
  }

  async function deleteRun(runId, matchCount) {
    const message = matchCount > 0
      ? `Delete this tournament run and its ${matchCount} logged match${matchCount === 1 ? '' : 'es'}? This can't be undone.`
      : "Delete this tournament run? This can't be undone."
    if (!window.confirm(message)) return
    setError('')

    // Matches first, then the run, so a failure never leaves matches behind
    // that silently lose their run.
    const { error: matchError } = await supabase.from('matches').delete().eq('tournament_id', runId)
    if (matchError) { setError(matchError.message); return }
    const { error: runError } = await supabase.from('tournaments').delete().eq('id', runId)
    if (runError) { setError(runError.message); return }
    load()
  }

  if (loading) return <p className="empty-state">Loading…</p>

  return (
    <div>
      <div style={{ marginBottom: '1.2rem', maxWidth: 260 }}>
        <label htmlFor="runScope">Show</label>
        <select id="runScope" value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="mine">My runs</option>
          <option value="all">Everyone's runs</option>
        </select>
      </div>

      {error && <p className="error-text">{error}</p>}

      {visibleRuns.length === 0 ? (
        <p className="empty-state">
          {scope === 'mine'
            ? 'No tournament runs yet — start one from the "Log a match" tab.'
            : 'No tournament runs logged yet.'}
        </p>
      ) : (
        visibleRuns.map((run) => {
          const runMatches = matchesByRun[run.id] || []
          const rec = recordOf(runMatches)
          const isOwner = run.player_id === userId
          const open = openId === run.id
          const inProgress = !run.ended_at

          return (
            <div key={run.id} className="card" style={{ marginBottom: '0.9rem', ...(inProgress ? { borderColor: 'var(--brass)' } : {}) }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', flexWrap: 'wrap', alignItems: 'baseline' }}>
                <div>
                  <strong style={{ fontFamily: 'var(--font-display)' }}>{run.name || 'Tournament run'}</strong>
                  {scope === 'all' && <> — <UsernameTag username={run.profiles?.username} /></>}
                  <div style={{ fontSize: '0.8rem', color: 'var(--parchment-dim)' }}>{formatRunDate(run.started_at)}</div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--brass-bright)' }}>
                  {inProgress ? 'In progress' : (run.final_standing || 'No standing recorded')}
                </div>
              </div>

              <p style={{ margin: '0.6rem 0', fontSize: '0.88rem' }}>
                <span className="win-tag">{rec.wins}</span>–<span className="loss-tag">{rec.losses}</span>
                <span style={{ color: 'var(--parchment-dim)' }}>
                  {' '}· {rec.total} match{rec.total === 1 ? '' : 'es'}{rec.total > 0 && ` · ${rec.rate}% winrate`}
                </span>
              </p>

              {editingId === run.id && (
                <div style={{ maxWidth: 320, marginBottom: '0.7rem' }}>
                  <label htmlFor={`standing-${run.id}`}>Final standing</label>
                  <input
                    id={`standing-${run.id}`}
                    list="standing-options-edit"
                    value={standingDraft}
                    onChange={(e) => setStandingDraft(e.target.value)}
                  />
                  <datalist id="standing-options-edit">
                    {STANDING_OPTIONS.map((o) => <option key={o} value={o} />)}
                  </datalist>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                    <button className="primary" style={{ fontSize: '0.8rem' }} onClick={() => saveStanding(run.id)}>Save</button>
                    <button style={{ fontSize: '0.8rem' }} onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {runMatches.length > 0 && (
                  <button style={{ fontSize: '0.78rem' }} onClick={() => setOpenId(open ? null : run.id)}>
                    {open ? 'Hide matches' : 'Show matches'}
                  </button>
                )}
                {isOwner && !inProgress && editingId !== run.id && (
                  <button
                    style={{ fontSize: '0.78rem' }}
                    onClick={() => { setEditingId(run.id); setStandingDraft(run.final_standing || '') }}
                  >
                    Edit standing
                  </button>
                )}
                {isOwner && (
                  <button style={{ fontSize: '0.78rem' }} onClick={() => deleteRun(run.id, runMatches.length)}>Delete</button>
                )}
              </div>

              {open && (
                <div className="table-scroll" style={{ marginTop: '0.8rem' }}>
                  <table>
                    <thead>
                      <tr><th>Round</th><th>Your deck</th><th>Opponent</th><th>Result</th></tr>
                    </thead>
                    <tbody>
                      {runMatches.map((m, i) => (
                        <tr key={m.id}>
                          <td>{i + 1}</td>
                          <td>{m.decks?.name}</td>
                          <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {m.opponent_leader_image_url && (
                              <img src={m.opponent_leader_image_url} alt="" style={{ width: 22, height: 31, objectFit: 'cover', borderRadius: 2 }} />
                            )}
                            {m.opponent_deck}
                          </td>
                          <td>
                            {m.result === 'win'
                              ? <span className="win-tag">Win</span>
                              : <span className="loss-tag">Loss</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
