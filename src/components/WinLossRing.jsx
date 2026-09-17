import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const WIN_COLOR = '#3fa796'
const LOSS_COLOR = '#c0533e'

export default function WinLossRing({ name, wins, total, size = 132 }) {
  const losses = total - wins
  const winrate = total ? Math.round((wins / total) * 100) : 0
  const data = [
    { key: 'Wins', value: wins },
    { key: 'Losses', value: losses },
  ]

  return (
    <div style={{ width: size, textAlign: 'center' }}>
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
            <Tooltip
              contentStyle={{ background: '#16273d', border: '1px solid #2a3f5a', color: '#ede6d6', fontSize: '0.8rem' }}
              formatter={(value, key) => [`${value} ${key.toLowerCase()}`, '']}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center of the ring — a leader card image will render here later;
            the winrate stands in as a placeholder for now. */}
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
      </div>
      <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>{name}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--parchment-dim)' }}>
        <span className="win-tag">{wins}</span>–<span className="loss-tag">{losses}</span>
      </div>
    </div>
  )
}
