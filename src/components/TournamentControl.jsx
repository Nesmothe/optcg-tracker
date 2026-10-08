import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { STANDING_OPTIONS, formatRunDate } from '../lib/tournaments'

// Start / end a tournament run. While a run is active, every match logged on
// the Log tab is attached to it automatically (see LogMatch).
export default function TournamentControl({ userId, activeTournament, onChange, runMatches }) {
  const [name, setName] = useState('')
  const [standing, setStanding] = useState('')
  const [ending, setEnding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const wins = runMatches.filter((m) => m.result === 'win').length
  const losses = runMatches.length - wins

  async function start() {
    setError('')
    setBusy(true)
    const { data, error } = await supabase
      .from('tournaments')
      .insert({ player_id: userId, name: name.trim() || null })
      .select()
      .single()
    setBusy(false)
    if (error) { setError(error.message); return }
    setName('')
    onChange(data)
  }

  async function end() {
    setError('')
    setBusy(true)
    const { error } = await supabase
      .from('tournaments')
      .update({ ended_at: new Date().toISOString(), final_standing: standing.trim() || null })
      .eq('id', activeTournament.id)
    setBusy(false)
    if (error) { setError(error.message); return }
    setStanding(''); setEnding(false)
    onChange(null)
  }

  async function discard() {
    if (!window.confirm('Discard this tournament run? The matches you logged stay in your stats, they just stop belonging to a run.')) return
    await supabase.from('tournaments').delete().eq('id', activeTournament.id)
    setEnding(false)
    onChange(null)
  }

  const dim = { color: 'var(--parchment-dim)', fontSize: '0.85rem' }

  if (!activeTournament) {
    return (
      <div className="card" style={{ maxWidth: 520, marginBottom: '1.5rem' }}>
        <h3>Tournament run</h3>
        <p style={{ ...dim, marginTop: 0 }}>
          Start a run and every match you log gets grouped into it. End it when you're done and add your final standing.
        </p>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional), e.g. Locals"
            aria-label="Tournament name (optional)"
            style={{ flex: '1 1 180px', width: 'auto' }}
          />
          <button className="primary" onClick={start} disabled={busy}>
            {busy ? 'Starting…' : 'Start tournament run'}
          </button>
        </div>
        {error && <p className="error-text">{error}</p>}
      </div>
    )
  }

  return (
    <div className="card" style={{ maxWidth: 520, marginBottom: '1.5rem', borderColor: 'var(--brass)' }}>
      <h3>
        <span style={{ color: 'var(--brass-bright)' }}>●</span> {activeTournament.name || 'Tournament run'}{' '}
        <span style={{ ...dim, fontFamily: 'var(--font-body)', fontWeight: 400 }}>in progress</span>
      </h3>
      <p style={{ ...dim, marginTop: 0 }}>
        Started {formatRunDate(activeTournament.started_at)} · {runMatches.length} match{runMatches.length === 1 ? '' : 'es'} ·{' '}
        <span className="win-tag">{wins}</span>–<span className="loss-tag">{losses}</span>
      </p>

      {!ending ? (
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button className="primary" onClick={() => setEnding(true)}>End tournament</button>
          <button onClick={discard}>Discard run</button>
        </div>
      ) : (
        <div>
          <label htmlFor="finalStanding">Final standing</label>
          <input
            id="finalStanding"
            list="standing-options"
            value={standing}
            onChange={(e) => setStanding(e.target.value)}
            placeholder="e.g. Top 8, or type your own"
            autoFocus
          />
          <datalist id="standing-options">
            {STANDING_OPTIONS.map((o) => <option key={o} value={o} />)}
          </datalist>
          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.8rem' }}>
            <button className="primary" onClick={end} disabled={busy}>{busy ? 'Saving…' : 'Save and end'}</button>
            <button onClick={() => setEnding(false)}>Back</button>
          </div>
        </div>
      )}
      {error && <p className="error-text">{error}</p>}
    </div>
  )
}
