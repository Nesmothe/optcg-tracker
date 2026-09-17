// Same-origin relay to CROCO's backend. The browser calls this (e.g.
// /api/croco/search?...), and this function — which runs on Vercel's
// servers, not in the browser — forwards the request to CROCO. Server-to-
// server requests are never subject to CORS, so CROCO's code and CORS
// settings never need to change for this to work.
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
  const targetPath = Array.isArray(path) ? path.join('/') : (path || '')
  const qs = new URLSearchParams(query).toString()
  const url = `${upstream}/${targetPath}${qs ? `?${qs}` : ''}`

  try {
    const upstreamRes = await fetch(url)
    const body = await upstreamRes.text()
    res.status(upstreamRes.status)
    res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'application/json')
    return res.send(body)
  } catch (e) {
    return res.status(502).json({ error: 'Could not reach the CROCO backend.' })
  }
}
