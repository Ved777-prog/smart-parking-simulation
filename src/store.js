// ── All slot IDs ──
export const SLOTS = ['A1','A2','A3','A4','B1','B2','B3','B4']

// ── Initial empty slot data (simulates DB table: slots) ──
export const initSlots = () =>
  Object.fromEntries(SLOTS.map(id => [id, { status: 'free', vehicle: null }]))

// ── Helper: current time as string ──
export const now = () =>
  new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

// ── Helper: pause for ms milliseconds (used in animations) ──
export const wait = ms => new Promise(r => setTimeout(r, ms))

// ── Helper: random number between a and b ──
export const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1))
