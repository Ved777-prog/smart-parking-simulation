import { SLOTS } from '../store'

// StatsPanel — the 4 stat cards + occupancy bar + mini slot map
export default function StatsPanel({ slots, violations }) {

  const occ   = SLOTS.filter(id => slots[id].status !== 'free').length
  const avail = 8 - occ
  const pct   = Math.round(occ / 8 * 100)

  return (
    <div className="stats-panel">

      {/* Available slots */}
      <div className="card g">
        <div className="card-label">AVAILABLE</div>
        <div className="card-val">{avail}</div>
        <div className="card-sub">free slots</div>
      </div>

      {/* Occupied slots */}
      <div className="card r">
        <div className="card-label">OCCUPIED</div>
        <div className="card-val">{occ}</div>
        <div className="card-sub">vehicles parked</div>
      </div>

      {/* Occupancy % with progress bar */}
      <div className="card c">
        <div className="card-label">OCCUPANCY</div>
        <div className="occ-pct">{pct}%</div>
        <div className="bar-bg">
          <div className={`bar-fill ${pct > 70 ? 'warn' : ''}`} style={{ width: pct + '%' }} />
        </div>
      </div>

      {/* Violations count */}
      <div className="card y">
        <div className="card-label">VIOLATIONS</div>
        <div className="card-val">{violations.length}</div>
        <div className="card-sub">today</div>
      </div>

      {/* Mini slot map — shows all 8 slots as small boxes */}
      <div className="card c" style={{ paddingBottom: '9px' }}>
        <div className="card-label" style={{ marginBottom: '5px' }}>SLOT MAP</div>
        <div className="mini-grid">
          {SLOTS.map(id => (
            <div key={id} className={`mini-slot ${slots[id].status}`} title={slots[id].vehicle?.plate || ''}>
              {id}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
