// Serves a decklist as a downloadable .txt file, so a QR code can simply
// point here. Scanning the QR opens this link and the phone saves the file.
//
// Stateless on purpose: the decklist travels inside the URL, e.g.
//   /api/decklist?n=Purple%20Luffy&l=OP05-060x1,OP01-088x4
// so this needs no database access, no login, and no environment variables.
//
// Only well-formed "card-id x count" entries are echoed back and everything
// else is dropped, so this can't be used to host arbitrary text. The file is
// in OPTCG Sim format (1xOP05-060 per line), importable into the Sim and CROCO.
const ENTRY = /^([A-Za-z]{1,3}\d{0,2}-\d{3}(?:_[pP]\d+)?)x(\d{1,2})$/

export default function handler(req, res) {
  const first = (v) => (Array.isArray(v) ? v[0] : v)
  const rawList = String(first(req.query.l) || '')
  const rawName = String(first(req.query.n) || '')

  const lines = []
  for (const part of rawList.split(',').slice(0, 150)) {
    const m = part.trim().match(ENTRY)
    const count = m ? parseInt(m[2], 10) : 0
    if (!m || !count) continue
    const id = m[1].toUpperCase().replace(/_P(\d+)$/, '_p$1')
    lines.push(`${count}x${id}`)
  }

  if (lines.length === 0) {
    return res.status(400).send('No valid decklist found in this link.')
  }

  const fileBase =
    rawName.replace(/[^A-Za-z0-9 _-]/g, '').trim().replace(/\s+/g, '-').slice(0, 40) || 'decklist'

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${fileBase}.txt"`)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  return res.status(200).send(lines.join('\n') + '\n')
}
