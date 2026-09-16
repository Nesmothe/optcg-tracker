import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { colorForUsername } from '../lib/userColor'

export default function SetUsername({ userId, onDone }) {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const trimmed = username.trim()
    if (trimmed.length < 2) { setError('Username needs to be at least 2 characters.'); return }
    setBusy(true)
    const { error } = await supabase.from('profiles').insert({ id: userId, username: trimmed })
    setBusy(false)
    if (error) {
      if (error.code === '23505') setError('That username is taken — try another.')
      else setError(error.message)
      return
    }
    onDone(trimmed)
  }

  return (
    <div className="app-shell" style={{ maxWidth: 380, paddingTop: '4rem' }}>
      <h1>One last thing</h1>
      <p style={{ color: 'var(--parchment-dim)', marginBottom: '1.5rem' }}>
        Pick a username — this is what your crew will see next to everything you log.
      </p>
      <form onSubmit={handleSubmit} className="card">
        <label htmlFor="username">Username</label>
        <input
          id="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g. Arnau"
          style={{ marginBottom: '0.6rem' }}
        />
        {username.trim().length > 1 && (
          <p style={{ marginBottom: '0.9rem', fontSize: '0.85rem' }}>
            Preview: <span style={{ color: colorForUsername(username.trim()), fontWeight: 600 }}>{username.trim()}</span>
          </p>
        )}
        {error && <p className="error-text">{error}</p>}
        <button type="submit" className="primary" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Saving…' : 'Save and continue'}
        </button>
      </form>
    </div>
  )
}
