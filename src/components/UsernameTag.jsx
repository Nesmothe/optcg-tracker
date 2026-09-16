import { colorForUsername } from '../lib/userColor'

export default function UsernameTag({ username }) {
  if (!username) return <span style={{ color: 'var(--parchment-dim)' }}>Unknown</span>
  return (
    <span style={{ color: colorForUsername(username), fontWeight: 600 }}>
      {username}
    </span>
  )
}
