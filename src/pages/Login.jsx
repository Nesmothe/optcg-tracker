import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    const fn = mode === 'signin'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password })
    const { error } = await fn
    setBusy(false)
    if (error) {
      setError(error.message)
    } else if (mode === 'signup') {
      setInfo('Check your inbox to confirm your email, then sign in.')
    }
  }

  return (
    <div className="app-shell" style={{ maxWidth: 380, paddingTop: '4rem' }}>
      <h1>Logbook <span className="accent" style={{ color: 'var(--brass)' }}>— OPTCG winrates</span></h1>
      <p style={{ color: 'var(--parchment-dim)', marginBottom: '1.5rem' }}>
        {mode === 'signin' ? 'Sign in to your crew\u2019s logbook.' : 'Create an account to join the logbook.'}
      </p>
      <form onSubmit={handleSubmit} className="card">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" required value={email}
          onChange={(e) => setEmail(e.target.value)} style={{ marginBottom: '0.9rem' }} />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" required minLength={6} value={password}
          onChange={(e) => setPassword(e.target.value)} style={{ marginBottom: '1.1rem' }} />
        {error && <p className="error-text">{error}</p>}
        {info && <p style={{ color: 'var(--win)', fontSize: '0.85rem', marginBottom: '0.6rem' }}>{info}</p>}
        <button type="submit" className="primary" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
        </button>
      </form>
      <button
        onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setInfo('') }}
        style={{ background: 'transparent', border: 'none', marginTop: '0.9rem', color: 'var(--parchment-dim)' }}
      >
        {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
      </button>
    </div>
  )
}
