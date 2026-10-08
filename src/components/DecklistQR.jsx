import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { decklistFileUrl } from '../lib/decklist'

// A QR code that, when scanned, downloads this decklist as a .txt file
// (OPTCG Sim / CROCO format). Shown on a white card so it scans reliably
// even though the app itself is dark.
export default function DecklistQR({ cards, deckName }) {
  const [dataUrl, setDataUrl] = useState('')
  const [error, setError] = useState('')
  const link = decklistFileUrl(window.location.origin, deckName, cards)

  useEffect(() => {
    let cancelled = false
    setError('')
    QRCode.toDataURL(link, {
      errorCorrectionLevel: 'L', // screen display is crisp, so favor a less dense code
      margin: 2,
      width: 360,
      color: { dark: '#0f1b2d', light: '#ffffff' },
    })
      .then((url) => { if (!cancelled) setDataUrl(url) })
      .catch(() => { if (!cancelled) setError('Could not generate a QR code for this decklist.') })
    return () => { cancelled = true }
  }, [link])

  function saveImage() {
    const slug = (deckName || 'decklist').replace(/[^A-Za-z0-9 _-]/g, '').trim().replace(/\s+/g, '-') || 'decklist'
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `${slug}-decklist-qr.png`
    a.click()
  }

  return (
    <div style={{ marginTop: '1rem', maxWidth: 360 }}>
      {error && <p className="error-text">{error}</p>}
      {dataUrl && (
        <>
          <img
            src={dataUrl}
            alt={`QR code to download the ${deckName} decklist`}
            style={{ display: 'block', width: '100%', borderRadius: 4, background: '#fff' }}
          />
          <p style={{ margin: '0.6rem 0', fontSize: '0.82rem', color: 'var(--parchment-dim)' }}>
            Scan to download “{deckName}” as a .txt file — OPTCG Sim and CROCO format.
          </p>
          <button type="button" onClick={saveImage} style={{ fontSize: '0.78rem' }}>Save QR image</button>
        </>
      )}
    </div>
  )
}
