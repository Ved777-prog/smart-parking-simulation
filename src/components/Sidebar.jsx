// Sidebar — left navigation panel
export default function Sidebar({ view, setView, recCount, violCount }) {

  const items = [
    { id: 'sim',  icon: '🚗', label: 'Simulation' },
    { id: 'dash', icon: '📊', label: 'Dashboard' },
    { id: 'rec',  icon: '📋', label: 'Records',    badge: recCount },
    { id: 'viol', icon: '⚠️', label: 'Violations', badge: violCount },
  ]

  return (
    <aside className="sidebar">

      {/* Logo */}
      <div className="logo">
        <div className="logo-icon">🅿</div>
        <div className="logo-text">SMART<br />PARKING<br />SYSTEM</div>
      </div>

      {/* Navigation */}
      {items.map(item => (
        <div
          key={item.id}
          className={`nav-item ${view === item.id ? 'active' : ''}`}
          onClick={() => setView(item.id)}
        >
          <span>{item.icon}</span>
          {item.label}
          {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
        </div>
      ))}

      {/* User */}
      <div className="sidebar-user">
        <div className="avatar">👤</div>
        <div>
          <div className="user-name">Admin</div>
          <div className="user-role">● ONLINE</div>
        </div>
      </div>

    </aside>
  )
}
