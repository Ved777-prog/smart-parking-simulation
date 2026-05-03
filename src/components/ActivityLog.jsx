// ActivityLog — shows real-time DB events at the bottom
export default function ActivityLog({ logs }) {
  return (
    <div className="log-box">
      <div className="log-title">▶ ACTIVITY LOG — DATABASE EVENTS</div>
      <div className="log-scroll">
        {logs.length === 0
          ? <div style={{fontFamily:'Share Tech Mono',fontSize:'11px',color:'var(--dim)',textAlign:'center',padding:'8px'}}>System ready...</div>
          : logs.map((l, i) => (
            <div key={i} className="log-row">
              <div className={`log-dot ${l.col}`} />
              <div style={{flex:1}} dangerouslySetInnerHTML={{__html: l.txt}} />
              <div className="log-time">{l.time}</div>
            </div>
          ))
        }
      </div>
    </div>
  )
}
