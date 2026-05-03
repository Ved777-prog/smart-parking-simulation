import express from 'express'
import mysql   from 'mysql2/promise'
import cors    from 'cors'

const app = express()
app.use(cors())
app.use(express.json())

// ── DATABASE CONNECTION ──
const db = mysql.createPool({
  host:     'localhost',
  user:     'root',
  password: 'parking123',   
  database: 'smart_parking'
})

// ── TEST ──
app.get('/api/test', async (req, res) => {
  try {
    await db.query('SELECT 1')
    res.json({ message: 'MySQL connected!' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── 1. GET ALL SLOTS (with vehicle info if occupied) ──
app.get('/api/slots', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        ps.slot_id,
        ps.slot_number,
        ps.slot_status,
        v.vehicle_number,
        v.vehicle_type,
        pr.entry_time,
        pr.record_id
      FROM parking_slot ps
      LEFT JOIN parking_record pr ON ps.slot_id = pr.slot_id AND pr.exit_time IS NULL
      LEFT JOIN vehicle v ON pr.vehicle_id = v.vehicle_id
      ORDER BY ps.slot_id
    `)
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── 2. CAR / BIKE ARRIVES (Transaction) ──
app.post('/api/park', async (req, res) => {
  const { plate, type, slotNumber } = req.body
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const [vResult] = await conn.query(
      'INSERT INTO vehicle (vehicle_number, vehicle_type) VALUES (?, ?)',
      [plate, type]
    )
    const vehicleId = vResult.insertId

    const [slots] = await conn.query(
      'SELECT slot_id FROM parking_slot WHERE slot_number = ?',
      [slotNumber]
    )
    if (slots.length === 0) throw new Error('Slot not found')
    const slotId = slots[0].slot_id

    const [rResult] = await conn.query(
      'INSERT INTO parking_record (vehicle_id, slot_id, entry_time) VALUES (?, ?, NOW())',
      [vehicleId, slotId]
    )

    await conn.query(
      'UPDATE parking_slot SET slot_status = ? WHERE slot_id = ?',
      [type, slotId]
    )

    await conn.commit()
    res.json({ message: 'Vehicle parked', recordId: rResult.insertId, vehicleId })

  } catch (err) {
    await conn.rollback()
    res.status(500).json({ error: err.message })
  } finally {
    conn.release()
  }
})

// ── 3. VEHICLE EXIT (Transaction) ──
app.post('/api/exit', async (req, res) => {
  const { slotNumber } = req.body
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const [slots] = await conn.query(
      'SELECT slot_id FROM parking_slot WHERE slot_number = ?',
      [slotNumber]
    )
    if (slots.length === 0) throw new Error('Slot not found')
    const slotId = slots[0].slot_id

    await conn.query(
      `UPDATE parking_record SET exit_time = NOW() WHERE slot_id = ? AND exit_time IS NULL`,
      [slotId]
    )

    await conn.query(
      'UPDATE parking_slot SET slot_status = ? WHERE slot_id = ?',
      ['free', slotId]
    )

    await conn.commit()
    res.json({ message: 'Vehicle exited' })

  } catch (err) {
    await conn.rollback()
    res.status(500).json({ error: err.message })
  } finally {
    conn.release()
  }
})

// ── 4. GET ALL PARKING RECORDS ──
app.get('/api/records', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        pr.record_id,
        v.vehicle_number  AS plate,
        v.vehicle_type    AS type,
        ps.slot_number    AS slot,
        pr.entry_time     AS timeIn,
        pr.exit_time      AS timeOut
      FROM parking_record pr
      JOIN vehicle       v  ON pr.vehicle_id = v.vehicle_id
      LEFT JOIN parking_slot ps ON pr.slot_id = ps.slot_id
      ORDER BY pr.record_id DESC
    `)
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── 5. DELETE A PARKING RECORD ──
app.delete('/api/records/:id', async (req, res) => {
  const { id } = req.params
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    // Get slot_id before deleting
    const [recs] = await conn.query(
      'SELECT slot_id FROM parking_record WHERE record_id = ?', [id]
    )

    // If slot is occupied by this record, free it
    if (recs.length > 0 && recs[0].slot_id) {
      await conn.query(
        'UPDATE parking_slot SET slot_status = ? WHERE slot_id = ?',
        ['free', recs[0].slot_id]
      )
    }

    // Delete violations linked to this record first (foreign key)
    await conn.query('DELETE FROM violation WHERE record_id = ?', [id])

    // Delete the record
    await conn.query('DELETE FROM parking_record WHERE record_id = ?', [id])

    await conn.commit()
    res.json({ message: 'Record deleted' })
  } catch (err) {
    await conn.rollback()
    res.status(500).json({ error: err.message })
  } finally {
    conn.release()
  }
})

// ── 6. RECORD VIOLATION ──
app.post('/api/violation', async (req, res) => {
  const { plate, type, zone, fine } = req.body
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const [vResult] = await conn.query(
      'INSERT INTO vehicle (vehicle_number, vehicle_type) VALUES (?, ?)',
      [plate, type]
    )
    const vehicleId = vResult.insertId

    const [rResult] = await conn.query(
      'INSERT INTO parking_record (vehicle_id, slot_id, entry_time) VALUES (?, NULL, NOW())',
      [vehicleId]
    )

    await conn.query(
      'INSERT INTO violation (record_id, violation_type, time) VALUES (?, ?, NOW())',
      [rResult.insertId, `${zone} | Fine: Rs.${fine}`]
    )

    await conn.commit()
    res.json({ message: 'Violation recorded' })
  } catch (err) {
    await conn.rollback()
    res.status(500).json({ error: err.message })
  } finally {
    conn.release()
  }
})

// ── 7. GET ALL VIOLATIONS ──
app.get('/api/violations', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        viol.violation_id,
        v.vehicle_number  AS plate,
        v.vehicle_type    AS type,
        viol.violation_type AS zone,
        viol.time
      FROM violation viol
      JOIN parking_record pr ON viol.record_id = pr.record_id
      JOIN vehicle        v  ON pr.vehicle_id  = v.vehicle_id
      ORDER BY viol.violation_id DESC
    `)
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── 8. DELETE A VIOLATION ──
app.delete('/api/violations/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM violation WHERE violation_id = ?', [req.params.id])
    res.json({ message: 'Violation deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(3001, () => {
  console.log('Server running on http://localhost:3001/api/test')
  console.log('React should be on  http://localhost:5173')
})