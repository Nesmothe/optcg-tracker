import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

const WIN_COLOR = '#3fa796'
const LOSS_COLOR = '#c0533e'

export default function WinLossRing({ name, wins, total, image, size = 132 }) {
  const losses = total - wins
  const winrate = total ? Math.round((wins / total) * 100) : 0
  const data = [
    { key: 'Wins', value: wins },
    { key: 'Losses', value: losses },
  ]
  const holeSize = size * 0.6 // matches the pie's innerRadius*2, so the image fills the hole exactly

  return (
    <div
      style={{ width: size, textAlign: 'center' }}
      title={`${wins} win${wins === 1 ? '' : 's'}, ${losses} loss${losses === 1 ? '' : 'es'} (${winrate}%)`}
    >
      <div style={{ position: 'relative', width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={size * 0.32}
              outerRadius={size * 0.44}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
            >
              <Cell fill={WIN_COLOR} />
              <Cell fill={LOSS_COLOR} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {image ? (
          <>
            {/* Leader art fills the ring's hole */}
            <div
              style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: holeSize, height: holeSize,
                borderRadius: '50%', overflow: 'hidden',
                pointerEvents: 'none',
              }}
            >
              <img
                src={image}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            {/* Winrate badge overlaid on the bottom of the ring */}
            <div
              style={{
                position: 'absolute', bottom: -2, left: '50%', transform: 'translateX(-50%)',
                background: 'var(--ink-surface-raised)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '0.05rem 0.5rem', pointerEvents: 'none',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: size * 0.1, color: 'var(--brass-bright)' }}>
                {winrate}%
              </span>
            </div>
          </>
        ) : (
          <div
            style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: size * 0.15, color: 'var(--brass-bright)' }}>
              {winrate}%
            </span>
          </div>
        )}
      </div>
      <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>{name}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--parchment-dim)' }}>
        <span className="win-tag">{wins}</span>–<span className="loss-tag">{losses}</span>
      </div>
    </div>
  )
}
