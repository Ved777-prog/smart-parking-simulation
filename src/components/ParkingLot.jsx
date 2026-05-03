import { SLOTS } from '../store'

// ParkingLot — the visual scene with road, gate, slots, and no-parking zone
export default function ParkingLot({ slots, gateOpen, sceneRef, vlayerRef, onClickSlot }) {

  return (
    <div className="lot">

      {/* Header */}
      <div className="lot-header">
        <span>LIVE PARKING LOT</span>
        <span>{SLOTS.filter(id => slots[id].status === 'free').length} / 8 AVAILABLE</span>
      </div>

      {/* Scene */}
      <div className="scene" ref={sceneRef}>

        {/* Road at top */}
        <div className="road">
          <div className="road-dashes" />
          <div className="welcome">— WELCOME —</div>
        </div>

        {/* Gate Booth */}
        <div className="booth">🏠<span>GATE</span></div>

        {/* Gate Arm — rotates when gateOpen is true */}
        <div className={`arm-wrap ${gateOpen ? 'open' : ''}`}>
          <div className="pivot" />
          <div className="arm" />
        </div>

        {/* Signs */}
        <div className="signs">
          <div className="sign-p">P</div>
          <div className="sign-no">🚫</div>
        </div>

        {/* Parking Slots */}
        <div className="slots-area">
          {['A', 'B'].map(zone => (
            <div className="zone-row" key={zone}>
              <div className="zone-label">ZONE {zone}</div>
              {[1,2,3,4].map(n => {
                const id = zone + n
                const s  = slots[id]
                return (
                  <div
                    key={id}
                    id={`slot-${id}`}
                    className={`slot ${s.status}`}
                    onClick={() => onClickSlot(id)}
                  >
                    <div className="slot-emoji">{s.vehicle ? (s.vehicle.type==='car' ? '🚗' : '🏍️') : ''}</div>
                    <div className="slot-id">{id}</div>
                    <div className="slot-plate">{s.vehicle?.plate || ''}</div>
                    <div className="slot-time">{s.vehicle?.timeIn || ''}</div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* No Parking Zone */}
        <div className="nopk" id="nopk-zone">
          <div className="nopk-icon">🚫</div>
          <div className="nopk-text">NO<br />PARKING<br />ZONE</div>
        </div>

        {/* Vehicle animation layer — vehicles move here */}
        <div className="vlayer" ref={vlayerRef} />

      </div>
    </div>
  )
}
