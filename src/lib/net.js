// ห้องออนไลน์: ใช้ Supabase Realtime (Broadcast + Presence) ถ้าตั้งค่าไว้
// ถ้าไม่ได้ตั้งค่า จะใช้ BroadcastChannel แทน (เล่นข้ามแท็บในเครื่องเดียวกันได้ ไว้ทดสอบ)
import { createClient } from '@supabase/supabase-js'

const URL_ = import.meta.env.VITE_SUPABASE_URL
const KEY_ = import.meta.env.VITE_SUPABASE_ANON_KEY
export const ONLINE = Boolean(URL_ && KEY_)
let sb = null

export function newId() {
  return Math.random().toString(36).slice(2, 10)
}
export function newRoomCode() {
  const A = 'ABCDEFGHJKMNPQRSTUVWXYZ'
  return Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join('')
}
export const normCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)

/**
 * เปิดช่องสื่อสารของห้อง
 * onMessage({type, data, from}) — ข้อความจากคนอื่น
 * onPeers([{id, ...presence}]) — รายชื่อคนในห้องตอนนี้ (รวมตัวเอง)
 * คืนค่า { send(type, data), track(presence), close() }
 */
export function openRoom(code, me, { onMessage, onPeers, onStatus }) {
  return ONLINE ? openSupabase(code, me, onMessage, onPeers, onStatus) : openLocal(code, me, onMessage, onPeers, onStatus)
}

function openSupabase(code, me, onMessage, onPeers, onStatus) {
  sb ??= createClient(URL_, KEY_, { realtime: { params: { eventsPerSecond: 20 } } })
  const ch = sb.channel(`animal-race-${code}`, { config: { broadcast: { self: false }, presence: { key: me } } })
  let presence = null
  let ready = false
  ch.on('broadcast', { event: 'msg' }, ({ payload }) => payload && onMessage(payload))
  ch.on('presence', { event: 'sync' }, () => {
    const st = ch.presenceState()
    onPeers(Object.entries(st).map(([id, metas]) => ({ id, ...(metas[metas.length - 1] || {}) })))
  })
  ch.subscribe((status) => {
    ready = status === 'SUBSCRIBED'
    onStatus?.(ready)
    if (ready && presence) ch.track(presence)
  })
  return {
    send: (type, data) => { if (ready) ch.send({ type: 'broadcast', event: 'msg', payload: { type, data, from: me } }) },
    track: (p) => { presence = p; if (ready) ch.track(p) },
    close: () => { sb.removeChannel(ch) },
  }
}

function openLocal(code, me, onMessage, onPeers, onStatus) {
  const bc = new BroadcastChannel(`animal-race-${code}`)
  const peers = new Map() // id -> {presence, seen}
  let presence = null
  const emitPeers = () => {
    const list = [...peers.entries()].map(([id, v]) => ({ id, ...v.presence }))
    if (presence) list.push({ id: me, ...presence })
    onPeers(list)
  }
  bc.onmessage = (e) => {
    const m = e.data
    if (!m || m.from === me) return
    if (m.type === '__hello') { const isNew = !peers.has(m.from); peers.set(m.from, { presence: m.data, seen: Date.now() }); emitPeers(); if (isNew && presence) bc.postMessage({ type: '__hello', data: presence, from: me }) }
    else if (m.type === '__bye') { peers.delete(m.from); emitPeers() }
    else onMessage(m)
  }
  const beat = setInterval(() => {
    if (presence) bc.postMessage({ type: '__hello', data: presence, from: me })
    const now = Date.now(); let changed = false
    for (const [id, v] of peers) if (now - v.seen > 5000) { peers.delete(id); changed = true }
    if (changed) emitPeers()
  }, 1500)
  setTimeout(() => onStatus?.(true), 0)
  const bye = () => bc.postMessage({ type: '__bye', from: me })
  window.addEventListener('pagehide', bye)
  return {
    send: (type, data) => bc.postMessage({ type, data, from: me }),
    track: (p) => { presence = p; bc.postMessage({ type: '__hello', data: p, from: me }); emitPeers() },
    close: () => { bye(); clearInterval(beat); window.removeEventListener('pagehide', bye); bc.close() },
  }
}
