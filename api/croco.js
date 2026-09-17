// Same-origin relay to CROCO's backend. The browser calls this at a single,
// fixed path — /api/croco — passing which CROCO endpoint to hit via a
// "path" query param (e.g. /api/croco?path=search&category=leader&name=Luffy
// or /api/croco?path=card/OP17-079). This runs on Vercel's servers, not in
// the browser, so server-to-server requests are never subject to CORS —
// CROCO's code and CORS settings never need to change for this to work.
//
// Deliberately a single static file (no /api/croco/[...path].js dynamic
// folder) since Vercel's bracket-based catch-all routing didn't reliably
// match multi-segment paths in this project; a plain query param sidesteps
// that entirely.
//
// CROCO_API_URL is set in Vercel's Environment Variables (Project Settings
// → Environment Variables) — NOT prefixed with VITE_, so it's only readable
// here on the server, never bundled into the browser code.
export default async function handler(req, res) {
  const upstream = process.env.CROCO_API_URL
  if (!upstream) {
    return res.status(500).json({ error: 'CROCO_API_URL is not configured on the server.' })
  }

  const { path, ...query } = req.query
  if (!path) {
    return res.status(400).json({ error: 'Missing "path" query parameter.' })
  }

  const qs = new URLSearchParams(query).toString()
  const url = `${upstream}/${path}${qs ? `?${qs}` : ''}`

  try {
    const upstreamRes = await fetch(url)
    const body = await upstreamRes.text()
    res.status(upstreamRes.status)
    res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'application/json')
    return res.send(body)
  } catch (e) {
    return res.status(502).json({ error: 'Could not reach the CROCO backend.', detail: String(e) })
  }
}
