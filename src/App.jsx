import { useState, useRef, useEffect } from 'react'
import { SLOTS, initSlots, now, wait, rnd } from './store'
import Sidebar from './components/Sidebar'
import ParkingLot from './components/ParkingLot'
import StatsPanel from './components/StatsPanel'
import ActivityLog from './components/ActivityLog'
import Modals from './components/Modals'
import './App.css'

const API = 'http://localhost:3001'

export default function App() {

  const [slots,      setSlots]      = useState(initSlots())
  const [records,    setRecords]    = useState([])
  const [violations, setViolations] = useState([])
  const [logs,       setLogs]       = useState([])
  const [totalIn,    setTotalIn]    = useState(0)
  const [view,       setView]       = useState('sim')
  const [modal,      setModal]      = useState(null)
  const [toasts,     setToasts]     = useState([])
  const [banner,     setBanner]     = useState(null)
  const [gateOpen,   setGateOpen]   = useState(false)
  const [clock,      setClock]      = useState(new Date().toLocaleTimeString('en-GB'))

  const sceneRef   = useRef(null)
  const vlayerRef  = useRef(null)
  const countRef   = useRef(0)
  const rogueAtRef = useRef(rnd(4, 7))

  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleTimeString('en-GB')), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => { loadAll() }, [])

  // ── LOAD ALL DATA FROM MYSQL ──
  const loadAll = () => { loadSlots(); loadRecords(); loadViolations() }

  // FIX: now also loads vehicle info so exit works
  const loadSlots = async () => {
    try {
      const res  = await fetch(`${API}/api/slots`)
      const data = await res.json()
      const updated = initSlots()
      data.forEach(row => {
        if (updated[row.slot_number]) {
          updated[row.slot_number].status = row.slot_status
          // If slot is occupied, attach vehicle info so exit button works
          if (row.vehicle_number) {
            updated[row.slot_number].vehicle = {
              plate:  row.vehicle_number,
              type:   row.vehicle_type,
              timeIn: row.entry_time
            }
          }
        }
      })
      setSlots(updated)
    } catch (err) { console.log('loadSlots error:', err) }
  }

  const loadRecords = async () => {
    try {
      const res  = await fetch(`${API}/api/records`)
      const data = await res.json()
      setRecords(data.map((r, i) => ({
        id:      r.record_id,
        plate:   r.plate,
        type:    r.type,
        slot:    r.slot,
        timeIn:  r.timeIn,
        timeOut: r.timeOut,
        status:  r.timeOut ? 'exited' : 'parked'
      })))
    } catch (err) { console.log('loadRecords error:', err) }
  }

  const loadViolations = async () => {
    try {
      const res  = await fetch(`${API}/api/violations`)
      const data = await res.json()
      setViolations(data.map((v, i) => ({
        id:   v.violation_id,
        plate: v.plate,
        type:  v.type,
        zone:  v.zone,
        fine:  500,
        time:  v.time
      })))
    } catch (err) { console.log('loadViolations error:', err) }
  }

  // ── HELPERS ──
  const freeSlots = (s = slots) => SLOTS.filter(id => s[id].status === 'free')
  const occSlots  = (s = slots) => SLOTS.filter(id => s[id].status !== 'free')

  const addLog = (txt, col = 'c') =>
    setLogs(prev => [{ txt, col, time: now() }, ...prev].slice(0, 60))

  const addToast = (msg, col = 'c') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg, col }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  const showBanner = (plate, slotTxt, cls) => {
    setBanner({ plate, slotTxt, cls })
    setTimeout(() => setBanner(null), cls === '' ? 3500 : 5000)
  }

  const openGate = (ms = 3000) => {
    setGateOpen(true)
    setTimeout(() => setGateOpen(false), ms)
  }

  // ── MOVING VEHICLE ──
  const spawnV = (type, x, y) => {
    const v = document.createElement('div')
    v.className = 'mv'
    v.textContent = type === 'car' ? '🚗' : '🏍️'
    v.style.cssText = `left:${x}px;top:${y}px;transition:none`
    vlayerRef.current?.appendChild(v)
    return v
  }

  const moveV = (v, tx, ty, ms = 1000) =>
    new Promise(res => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        v.style.transition = `left ${ms}ms cubic-bezier(.4,0,.6,1),top ${ms}ms cubic-bezier(.4,0,.6,1)`
        v.style.left = tx + 'px'
        v.style.top  = ty + 'px'
        setTimeout(res, ms + 60)
      }))
    })

  const getSlotPos = (slotId) => {
    const el = document.getElementById('slot-' + slotId)
    const sc = sceneRef.current
    if (!el || !sc) return { x: 120, y: 55 }
    const sr = sc.getBoundingClientRect(), er = el.getBoundingClientRect()
    return { x: er.left - sr.left + er.width/2 - 14, y: er.top - sr.top + er.height/2 - 14 }
  }

  // ── NORMAL ARRIVAL ──
  const runNormal = async (plate, type, slotId) => {
    const col = type === 'car' ? 'g' : 'c'
    const v = spawnV(type, -50, 52)
    addLog(`${type==='car'?'🚗':'🏍️'} <span class="ht ${col}">${plate}</span> approaching gate...`, col)
    await moveV(v, 105, 52, 950)
    openGate(3000)
    showBanner(plate, slotId, '')
    const timeIn = now()

    try {
      await fetch(`${API}/api/park`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plate, type, slotNumber: slotId })
      })
      addLog(`🗄️ MySQL: INSERT vehicle + parking_record | Transaction committed`, 'c')
    } catch (err) { addLog(`❌ MySQL error: ${err.message}`, 'r') }

    setSlots(prev => ({ ...prev, [slotId]: { status: type, vehicle: { plate, type, timeIn } } }))
    setRecords(prev => [...prev, { id: Date.now(), plate, type, slot: slotId, timeIn, timeOut: null, status: 'parked' }])
    setTotalIn(t => t + 1)
    addLog(`🔑 Gate opened — <span class="ht y">${plate}</span> plate noted`, col)
    await wait(500)

    const p = getSlotPos(slotId)
    await moveV(v, p.x, p.y, 1000)
    v.remove()
    addToast(`${type==='car'?'🚗':'🏍️'} ${plate} parked at ${slotId}`, col)
    addLog(`✅ <span class="ht ${col}">${plate}</span> parked in Slot <span class="ht g">${slotId}</span>`, 'g')
  }

  // ── WRONG SLOT ──
  const runWrongSlot = async (plate, type, assignedSlot) => {
    const col    = type === 'car' ? 'g' : 'c'
    const others = freeSlots().filter(s => s !== assignedSlot)
    const wrong  = others.length ? others[Math.floor(Math.random() * others.length)] : assignedSlot
    const timeIn = now()
    const v = spawnV(type, -50, 52)

    addLog(`${type==='car'?'🚗':'🏍️'} <span class="ht ${col}">${plate}</span> approaching — assigned <span class="ht g">${assignedSlot}</span>`, col)
    await moveV(v, 105, 52, 950)
    openGate(2500)
    showBanner(plate, assignedSlot, '')

    try {
      await fetch(`${API}/api/park`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plate, type, slotNumber: assignedSlot })
      })
    } catch (err) { console.log(err) }

    setSlots(prev => ({ ...prev, [assignedSlot]: { status: type, vehicle: { plate, type, timeIn } } }))
    setRecords(prev => [...prev, { id: Date.now(), plate, type, slot: assignedSlot, timeIn, timeOut: null, status: 'parked' }])
    setTotalIn(t => t + 1)

    const ap = getSlotPos(assignedSlot), wp = getSlotPos(wrong)
    await moveV(v, (ap.x+105)/2, (ap.y+52)/2, 550)
    addLog(`⚠️ <span class="ht y">${plate}</span> deviated → Slot <span class="ht r">${wrong}</span>`, 'y')
    await moveV(v, wp.x, wp.y, 900)
    v.remove()

    const fine = [200,300,500][Math.floor(Math.random()*3)]
    const time = now()

    try {
      await fetch(`${API}/api/violation`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plate, type, zone: `WRONG SLOT (${wrong})`, fine })
      })
      addLog(`🗄️ MySQL: INSERT violation | wrong slot ${wrong}, fine=₹${fine}`, 'y')
    } catch (err) { console.log(err) }

    setViolations(prev => [...prev, { id: Date.now(), plate, type, zone: `WRONG SLOT (${wrong})`, fine, time }])
    showBanner(plate, wrong, 'wrong')
    addToast(`⚠️ ${plate} wrong slot — ₹${fine} fine`, 'y')
    setModal({ type: 'wrongSlot', plate, vehicleType: type, assigned: assignedSlot, actual: wrong, fine, time })
  }

  // ── VIOLATION ──
  const runViolation = async (plate, type) => {
    const fine = [500,750,1000,1500][Math.floor(Math.random()*4)]
    const sc   = sceneRef.current?.getBoundingClientRect()
    const v    = spawnV(type, -50, 52)

    addLog(`${type==='car'?'🚗':'🏍️'} <span class="ht r">${plate}</span> approaching gate...`, 'r')
    await moveV(v, 105, 52, 950)
    openGate(2500)
    setTotalIn(t => t + 1)
    addLog(`⚠️ <span class="ht r">${plate}</span> bypassed slot → NO PARKING ZONE`, 'r')
    await wait(300)

    await moveV(v, (sc?.width||600)-100, (sc?.height||260)-90, 1100)
    document.getElementById('nopk-zone')?.classList.add('flash')
    setTimeout(() => document.getElementById('nopk-zone')?.classList.remove('flash'), 2600)
    v.classList.add('blink')
    showBanner(plate, 'NO-PARK', 'viol')
    await wait(900)

    const time = now()
    try {
      await fetch(`${API}/api/violation`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plate, type, zone: 'NO PARKING ZONE', fine })
      })
      addLog(`🗄️ MySQL: INSERT violation | NO PARKING ZONE, fine=₹${fine}`, 'r')
    } catch (err) { console.log(err) }

    setViolations(prev => [...prev, { id: Date.now(), plate, type, zone: 'NO PARKING ZONE', fine, time }])
    addLog(`🚨 VIOLATION: <span class="ht r">${plate}</span> | Fine: <span class="ht y">₹${fine}</span>`, 'r')
    addToast(`⚠️ Violation: ${plate} — ₹${fine}`, 'r')
    setModal({ type: 'violAlert', plate, vehicleType: type, fine, time })
    setTimeout(() => v.remove(), 6000)
  }

  const onConfirmArrival = (plate, slotId) => {
    setModal(null)
    countRef.current++
    if (countRef.current >= rogueAtRef.current) {
      rogueAtRef.current = countRef.current + rnd(4, 7)
      Math.random() < 0.5 ? runViolation(plate, modal.arrType) : runWrongSlot(plate, modal.arrType, slotId)
    } else {
      runNormal(plate, modal.arrType, slotId)
    }
  }

  // ── EXIT (FIXED: now properly reads vehicle from slot) ──
  const doExit = async (slotId) => {
    const s = slots[slotId]
    if (!s.vehicle) {
      addToast('No vehicle found in that slot', 'r')
      return
    }
    const { plate, type } = s.vehicle
    const timeOut = now()

    try {
      await fetch(`${API}/api/exit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotNumber: slotId })
      })
      addLog(`🗄️ MySQL: UPDATE parking_record SET exit_time=NOW() | slot ${slotId}`, 'c')
    } catch (err) { console.log(err) }

    setRecords(prev => prev.map(r =>
      r.slot === slotId && r.plate === plate && r.status === 'parked'
        ? { ...r, timeOut, status: 'exited' } : r
    ))
    setSlots(prev => ({ ...prev, [slotId]: { status: 'free', vehicle: null } }))
    addLog(`${type==='car'?'🚗':'🏍️'} <span class="ht c">${plate}</span> exiting ${slotId} | exit_time saved`, 'c')

    openGate(3000)
    const p = getSlotPos(slotId)
    const v = spawnV(type, p.x, p.y)
    await moveV(v, 105, 52, 1000)
    await moveV(v, -60, 52, 700)
    v.remove()
    addToast(`${type==='car'?'🚗':'🏍️'} ${plate} exited — saved to MySQL`, 'c')
  }

  const onConfirmExit = (slotId) => { setModal(null); doExit(slotId) }

  // ── DELETE RECORD ──
  const deleteRecord = async (id) => {
    if (!window.confirm('Delete this record from MySQL?')) return
    try {
      await fetch(`${API}/api/records/${id}`, { method: 'DELETE' })
      setRecords(prev => prev.filter(r => r.id !== id))
      loadSlots() // refresh slots in case it was parked
      addToast('Record deleted from MySQL', 'y')
      addLog(`🗑️ MySQL: DELETE FROM parking_record WHERE record_id=${id}`, 'y')
    } catch (err) { addToast('Delete failed', 'r') }
  }

  // ── DELETE VIOLATION ──
  const deleteViolation = async (id) => {
    if (!window.confirm('Delete this violation from MySQL?')) return
    try {
      await fetch(`${API}/api/violations/${id}`, { method: 'DELETE' })
      setViolations(prev => prev.filter(v => v.id !== id))
      addToast('Violation deleted from MySQL', 'y')
      addLog(`🗑️ MySQL: DELETE FROM violation WHERE violation_id=${id}`, 'y')
    } catch (err) { addToast('Delete failed', 'r') }
  }

  // ── RENDER ──
  return (
    <div className="app">

      <Sidebar view={view} setView={setView} recCount={records.length} violCount={violations.length} />

      <div className="main">
        <div className="topbar">
          <h1>{{ sim:'PARKING SIMULATION', dash:'DASHBOARD', rec:'PARKING RECORDS', viol:'VIOLATION RECORDS' }[view]}</h1>
          <div className="topbar-right">
            <div className="live-dot" />
            <span className="clock">{clock}</span>
          </div>
        </div>

        <div className="content">

          {/* ── SIMULATION ── */}
          <div className={`view ${view==='sim'?'active':''}`}>
            <div className="btn-row">
              <button className="btn btn-green"  onClick={() => setModal({ type:'arrival', arrType:'car' })}>🚗 CAR ARRIVES</button>
              <button className="btn btn-cyan"   onClick={() => setModal({ type:'arrival', arrType:'bike' })}>🏍️ BIKE ARRIVES</button>
              <button className="btn btn-orange" onClick={() => setModal({ type:'exit' })}>🚪 VEHICLE EXIT</button>
            </div>
            <div className="mid-row">
              <ParkingLot slots={slots} gateOpen={gateOpen} sceneRef={sceneRef} vlayerRef={vlayerRef}
                onClickSlot={(id) => { if (slots[id].vehicle && window.confirm(`Exit ${slots[id].vehicle.plate} from ${id}?`)) doExit(id) }} />
              <StatsPanel slots={slots} violations={violations} />
            </div>
            <ActivityLog logs={logs} />
          </div>

          {/* ── DASHBOARD ── */}
          <div className={`view ${view==='dash'?'active':''}`}>
            <div className="view-title" style={{color:'var(--cyan)'}}>DASHBOARD</div>
            <div className="dash-grid">
              <div className="d-card g"><div className="card-label">TOTAL VEHICLES</div><div className="d-big">{totalIn}</div><div className="d-sub">processed today</div></div>
              <div className="d-card r"><div className="card-label">TOTAL VIOLATIONS</div><div className="d-big">{violations.length}</div><div className="d-sub">recorded</div></div>
              <div className="d-card c"><div className="card-label">OCCUPANCY</div><div className="d-big">{Math.round(occSlots().length/8*100)}%</div><div className="d-sub">of capacity</div></div>
              <div className="d-card y"><div className="card-label">FREE SLOTS</div><div className="d-big">{freeSlots().length}</div><div className="d-sub">available now</div></div>
            </div>
            <div className="card c" style={{padding:'13px'}}>
              <div className="card-label" style={{marginBottom:'8px'}}>LIVE SLOT STATUS</div>
              <div className="d-slot-grid">
                {SLOTS.map(id => {
                  const s = slots[id]
                  const col = s.status==='free' ? 'var(--green)' : s.status==='car' ? 'var(--red)' : 'var(--cyan)'
                  return (
                    <div key={id} className="d-slot-item" style={{border:`1px solid ${col}`,background:'rgba(0,0,0,.2)'}}>
                      <div className="d-slot-id" style={{color:col}}>{id}</div>
                      <div className="d-slot-emo">{s.vehicle ? (s.vehicle.type==='car'?'🚗':'🏍️') : '·'}</div>
                      <div className="d-slot-plate">{s.vehicle?.plate || 'FREE'}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── RECORDS ── */}
          <div className={`view ${view==='rec'?'active':''}`}>
            <div className="view-title" style={{color:'var(--cyan)'}}>PARKING RECORDS — MySQL</div>
            <div className="tbl">
              <div className="t-head" style={{gridTemplateColumns:'36px 1fr 45px 48px 80px 80px 58px 60px 58px'}}>
                <div>#</div><div>PLATE</div><div>TYPE</div><div>SLOT</div><div>TIME IN</div><div>TIME OUT</div><div>STATUS</div><div>EXIT</div><div>DELETE</div>
              </div>
              {records.length === 0
                ? <div style={{padding:'20px',textAlign:'center',fontFamily:'Share Tech Mono',fontSize:'11px',color:'var(--dim)'}}>No records yet</div>
                : records.map((r, i) => (
                  <div key={r.id} className="t-row" style={{gridTemplateColumns:'36px 1fr 45px 48px 80px 80px 58px 60px 58px'}}>
                    <div className="tc" style={{color:'var(--dim)',fontSize:'10px'}}>#{i+1}</div>
                    <div className="tc mo" style={{color:'var(--cyan)'}}>{r.plate}</div>
                    <div className="tc">{r.type==='car'?'🚗':'🏍️'}</div>
                    <div className="tc" style={{fontFamily:'Orbitron',fontSize:'11px',color:'var(--green)'}}>{r.slot||'—'}</div>
                    <div className="tc mo" style={{fontSize:'10px',color:'var(--dim)'}}>{r.timeIn}</div>
                    <div className="tc mo" style={{fontSize:'10px',color:'var(--dim)'}}>{r.timeOut||'—'}</div>
                    <div className="tc"><span className={`badge-${r.status}`}>{r.status.toUpperCase()}</span></div>
                    <div className="tc">{r.status==='parked' && <button className="exit-btn" onClick={()=>doExit(r.slot)}>EXIT</button>}</div>
                    <div className="tc"><button onClick={()=>deleteRecord(r.id)} style={{background:'none',border:'1px solid var(--red)',color:'var(--red)',padding:'3px 8px',borderRadius:'5px',cursor:'pointer',fontFamily:'Orbitron',fontSize:'8px',fontWeight:700}}>DEL</button></div>
                  </div>
                ))
              }
            </div>
          </div>

          {/* ── VIOLATIONS ── */}
          <div className={`view ${view==='viol'?'active':''}`}>
            <div className="view-title" style={{color:'var(--red)'}}>VIOLATION RECORDS — MySQL</div>
            <div className="tbl">
              <div className="t-head" style={{gridTemplateColumns:'36px 1fr 45px 1fr 68px 75px 58px'}}>
                <div>#</div><div>PLATE</div><div>TYPE</div><div>ZONE</div><div>FINE ₹</div><div>TIME</div><div>DELETE</div>
              </div>
              {violations.length === 0
                ? <div style={{padding:'20px',textAlign:'center',fontFamily:'Share Tech Mono',fontSize:'11px',color:'var(--dim)'}}>No violations recorded</div>
                : violations.map((v, i) => (
                  <div key={v.id} className="t-row" style={{gridTemplateColumns:'36px 1fr 45px 1fr 68px 75px 58px'}}>
                    <div className="tc" style={{color:'var(--dim)',fontSize:'10px'}}>#{i+1}</div>
                    <div className="tc mo" style={{color:'var(--red)'}}>{v.plate}</div>
                    <div className="tc">{v.type==='car'?'🚗':'🏍️'}</div>
                    <div className="tc" style={{fontSize:'11px',color:'var(--yellow)'}}>{v.zone}</div>
                    <div className="tc" style={{fontFamily:'Orbitron',fontSize:'12px',color:'var(--red)'}}>₹{v.fine}</div>
                    <div className="tc mo" style={{fontSize:'10px',color:'var(--dim)'}}>{v.time}</div>
                    <div className="tc"><button onClick={()=>deleteViolation(v.id)} style={{background:'none',border:'1px solid var(--red)',color:'var(--red)',padding:'3px 8px',borderRadius:'5px',cursor:'pointer',fontFamily:'Orbitron',fontSize:'8px',fontWeight:700}}>DEL</button></div>
                  </div>
                ))
              }
            </div>
          </div>

        </div>
      </div>

      {/* BANNER */}
      {banner && (
        <div className={`banner show ${banner.cls}`}>
          <span style={{fontSize:'22px'}}>{banner.cls==='viol'?'⚠️':banner.cls==='wrong'?'⚠️':'🚗'}</span>
          <div>
            <div className="b-label">{banner.cls==='viol'?'VIOLATION — NO PARKING ZONE':banner.cls==='wrong'?'WRONG SLOT DETECTED':'PLATE REGISTERED — HEADING TO SLOT'}</div>
            <div style={{display:'flex',alignItems:'center',gap:'5px',marginTop:'3px'}}>
              <span className="b-plate">{banner.plate}</span>
              <span style={{color:'var(--dim)',fontSize:'11px'}}>→</span>
              <span className="b-slot">{banner.slotTxt}</span>
            </div>
          </div>
        </div>
      )}

      {/* TOASTS */}
      <div className="toast-stack">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.col}`}>
            <span style={{fontSize:'16px'}}>{{'g':'✅','c':'ℹ️','r':'⚠️','y':'🔔'}[t.col]}</span>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>

      {/* POPUPS */}
      <Modals modal={modal} setModal={setModal} slots={slots} onConfirmArrival={onConfirmArrival} onConfirmExit={onConfirmExit} />

    </div>
  )
}
