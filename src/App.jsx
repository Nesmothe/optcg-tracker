import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './pages/Login.jsx'
import SetUsername from './pages/SetUsername.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Decks from './pages/Decks.jsx'
import LogMatch from './pages/LogMatch.jsx'
import MatchupNotes from './pages/MatchupNotes.jsx'
import UsernameTag from './components/UsernameTag.jsx'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'log', label: 'Log a match' },
  { id: 'decks', label: 'Decks' },
  { id: 'notes', label: 'Matchup notes' },
]

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('dashboard')
  const [username, setUsername] = useState(null)
  const [profileChecked, setProfileChecked] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
      setProfileChecked(false) // re-check profile whenever the session changes (e.g. new sign-in)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    supabase.from('profiles').select('username').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => {
        setUsername(data?.username ?? null)
        setProfileChecked(true)
      })
  }, [session])

  if (loading) return null

  if (!session) return <Login />

  if (!profileChecked) return null

  if (!username) {
    return <SetUsername userId={session.user.id} onDone={setUsername} />
  }

  return (
    <div className="app-shell">
      <div className="masthead">
        <div>
          <h1>Logbook <span className="accent">— OPTCG winrates</span></h1>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>
            Logged in as <UsernameTag username={username} />
          </p>
        </div>
        <button onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>

      <nav className="nav-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'dashboard' && <Dashboard />}
      {tab === 'log' && <LogMatch />}
      {tab === 'decks' && <Decks />}
      {tab === 'notes' && <MatchupNotes />}
    </div>
  )
}
