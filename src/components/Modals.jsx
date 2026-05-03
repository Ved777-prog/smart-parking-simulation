import { useState } from 'react'
import { SLOTS } from '../store'

// Modals — all 4 popups: Arrival, Violation Alert, Wrong Slot, Exit
export default function Modals({ modal, setModal, slots, onConfirmArrival, onConfirmExit }) {

  // Local state for the arrival form
  const [plate,       setPlate]       = useState('')
  const [selectedSlot, setSelectedSlot] = useState(null)

  // Local state for the exit form
  const [exitSlot, setExitSlot] = useState(null)

  const freeSlots = SLOTS.filter(id => slots[id].status === 'free')
  const occSlots  = SLOTS.filter(id => slots[id].status !== 'free')

  // ── ARRIVAL MODAL ──
  if (modal?.type === 'arrival') {
    const iscar = modal.arrType === 'car'
    const color = iscar ? 'var(--green)' : 'var(--cyan)'
    const defaultSlot = freeSlots[0] || null
    const chosen = selectedSlot || defaultSlot

    return (
      <div className="overlay">
        <div className="popup" style={{width:'310px'}}>
          <div className="popup-line" style={{background:`linear-gradient(90deg,transparent,${color},transparent)`}} />
          <div className="popup-title" style={{color}}>{iscar ? '🚗 CAR ENTRY' : '🏍️ BIKE ENTRY'}</div>

          {/* Plate number input */}
          <div style={{marginBottom:'12px'}}>
            <label className="form-label">VEHICLE PLATE NUMBER</label>
            <input
              className="form-input"
              placeholder="TN01AB1234"
              maxLength={12}
              value={plate}
              onChange={e => setPlate(e.target.value.toUpperCase())}
              autoFocus
            />
          </div>

          {/* Slot selector */}
          <div>
            <label className="form-label">ASSIGN SLOT</label>
            <div className="slot-chooser">
              {SLOTS.map(id => (
                <div
                  key={id}
                  className={`sc ${id === chosen ? 'selected' : ''} ${!freeSlots.includes(id) ? 'disabled' : ''}`}
                  onClick={() => setSelectedSlot(id)}
                >
                  {id}
                </div>
              ))}
            </div>
          </div>

          <div className="popup-actions">
            <button className="pbtn cancel" onClick={() => { setModal(null); setPlate(''); setSelectedSlot(null) }}>CANCEL</button>
            <button className="pbtn confirm" onClick={() => {
              if (!plate.trim()) return alert('Enter a plate number')
              if (!chosen) return alert('No free slots!')
              setPlate(''); setSelectedSlot(null)
              onConfirmArrival(plate.trim().toUpperCase(), chosen)
            }}>REGISTER & ASSIGN</button>
          </div>
        </div>
      </div>
    )
  }

  // ── VIOLATION ALERT POPUP ──
  if (modal?.type === 'violAlert') {
    const { plate, vehicleType, fine, time } = modal
    return (
      <div className="overlay">
        <div className="popup" style={{minWidth:'300px',maxWidth:'440px'}}>
          <div className="popup-line" style={{background:'linear-gradient(90deg,transparent,var(--red),transparent)'}} />
          <div className="popup-title" style={{color:'var(--red)'}}>🚨 VIOLATION DETECTED!</div>

          <div style={{background:'rgba(255,34,68,.06)',border:'1px solid rgba(255,34,68,.2)',borderRadius:'7px',padding:'8px 12px',fontFamily:'Share Tech Mono',fontSize:'10px',color:'var(--red)',marginBottom:'11px'}}>
            ⚠️ DB INSERT → violations table
          </div>

          <div className="info-grid">
            <div className="info-item"><div className="info-label">PLATE</div><div className="info-val r">{plate}</div></div>
            <div className="info-item"><div className="info-label">VEHICLE</div><div className="info-val">{vehicleType==='car'?'🚗':'🏍️'} {vehicleType.toUpperCase()}</div></div>
            <div className="info-item"><div className="info-label">ZONE</div><div className="info-val y">NO PARKING ZONE</div></div>
            <div className="info-item"><div className="info-label">TIME</div><div className="info-val">{time}</div></div>
          </div>

          <div className="fine-box">
            <div className="fine-label">FINE IMPOSED</div>
            <div className="fine-amt">₹{fine}</div>
            <div style={{fontSize:'10px',color:'var(--dim)',fontFamily:'Share Tech Mono'}}>stored in violations database</div>
          </div>

          <div className="db-bar">{`INSERT INTO violations\n(plate,type,zone,fine,time)\nVALUES('${plate}','${vehicleType}',\n'NO PARKING ZONE',${fine},'${time}');`}</div>

          <button className="pbtn danger" style={{width:'100%'}} onClick={() => setModal(null)}>ACKNOWLEDGED</button>
        </div>
      </div>
    )
  }

  // ── WRONG SLOT POPUP (small) ──
  if (modal?.type === 'wrongSlot') {
    const { plate, vehicleType, assigned, actual, fine, time } = modal
    return (
      <div className="overlay">
        <div className="popup" style={{width:'290px'}}>
          <div className="popup-line" style={{background:'linear-gradient(90deg,transparent,var(--yellow),transparent)'}} />
          <div className="popup-title" style={{color:'var(--yellow)',fontSize:'12px'}}>⚠️ WRONG SLOT PARKED</div>

          <div className="info-grid">
            <div className="info-item"><div className="info-label">PLATE</div><div className="info-val y">{plate}</div></div>
            <div className="info-item"><div className="info-label">VEHICLE</div><div className="info-val">{vehicleType==='car'?'🚗':'🏍️'} {vehicleType.toUpperCase()}</div></div>
            <div className="info-item"><div className="info-label">ASSIGNED</div><div className="info-val g">{assigned}</div></div>
            <div className="info-item"><div className="info-label">PARKED IN</div><div className="info-val r">{actual}</div></div>
          </div>

          <div className="yfine-box">
            <div className="fine-label">FINE IMPOSED</div>
            <div className="yfine-amt">₹{fine}</div>
            <div style={{fontSize:'9px',color:'var(--dim)',fontFamily:'Share Tech Mono',marginTop:'2px'}}>{time}</div>
          </div>

          <button className="pbtn warn" style={{width:'100%'}} onClick={() => setModal(null)}>ACKNOWLEDGE</button>
        </div>
      </div>
    )
  }

  // ── EXIT MODAL ──
  if (modal?.type === 'exit') {
    const chosen = exitSlot || occSlots[0] || null
    const v = chosen ? slots[chosen]?.vehicle : null
    return (
      <div className="overlay">
        <div className="popup" style={{width:'300px'}}>
          <div className="popup-line" style={{background:'linear-gradient(90deg,transparent,var(--orange),transparent)'}} />
          <div className="popup-title" style={{color:'var(--orange)'}}>🚪 VEHICLE EXIT</div>

          <label className="form-label">SELECT SLOT</label>
          <div className="slot-chooser">
            {occSlots.map(id => (
              <div key={id} className={`sc orange ${id === chosen ? 'selected' : ''}`} onClick={() => setExitSlot(id)}>{id}</div>
            ))}
            {occSlots.length === 0 && <div style={{color:'var(--dim)',fontSize:'12px',gridColumn:'span 4'}}>No vehicles parked</div>}
          </div>

          {v && <div style={{fontFamily:'Share Tech Mono',fontSize:'11px',color:'var(--dim)',margin:'10px 0'}}>
            {v.type==='car'?'🚗':'🏍️'} {v.plate} — in since {v.timeIn}
          </div>}

          <div className="popup-actions">
            <button className="pbtn cancel" onClick={() => { setModal(null); setExitSlot(null) }}>CANCEL</button>
            <button className="pbtn orange" onClick={() => { setExitSlot(null); onConfirmExit(chosen) }}>CONFIRM EXIT</button>
          </div>
        </div>
      </div>
    )
  }

  return null  // no modal open
}
