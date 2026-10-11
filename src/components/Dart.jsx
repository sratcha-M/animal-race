import { useEffect, useMemo, useRef, useState } from 'react'
import { Shell, BigButton, ResultModal } from './MiniShell'
import { rand, sleep } from '../lib/rand'
import { beep, fanfare } from '../lib/sound'

const COLORS = ['#ff8fab', '#ffd166', '#8ed1fc', '#a0e3b0', '#c3a6ff', '#ffb38a', '#f6a6d5', '#9fe0e0']
const R = 88
const pt = (deg, r) => { const t = (deg * Math.PI) / 180; return [100 + r * Math.sin(t), 100 - r * Math.cos(t)] }

export default function Dart({ players, onBack }) {
  const roster = useMemo(() => players.map((p, i) => ({ ...p, num: i + 1 })), [players])
  const [outIds, setOutIds] = useState([])
  const alive = roster.filter((p) => !outIds.includes(p.id))
  const n = alive.length
  const slice = 360 / n
  const [cross, setCross] = useState({ x: 100, y: 100 })
  const [dart, setDart] = useState(null)       // {x, y, landed}
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [winner, setWinner] = useState(null)
  const [hist, setHist] = useState([])
  const raf = useRef(0)
  const live = useRef(true)
  const pos = useRef({ x: 100, y: 100 })
  const t0 = useRef(performance.now())

  useEffect(() => {
    live.current = true
    const loop = (now) => {
      if (!live.current) return
      const t = now - t0.current
      pos.current = {
        x: 100 + 66 * Math.sin(t * 0.0021) + 24 * Math.sin(t * 0.0057 + 1),
        y: 100 + 66 * Math.sin(t * 0.0027 + 2) + 24 * Math.sin(t * 0.0049),
      }
      setCross(pos.current)
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
    return () => { live.current = false; cancelAnimationFrame(raf.current) }
  }, [])

  const throwDart = async () => {
    if (busy || n < 2) return
    setBusy(true); setMsg(''); setWinner(null)
    // ลูกดอกส่ายเล็กน้อยจากจุดที่เล็งไว้
    const a = rand(0, Math.PI * 2); const d = rand(0, 11)
    const land = { x: pos.current.x + Math.cos(a) * d, y: pos.current.y + Math.sin(a) * d }
    beep(520, 0.08, 'sawtooth', 0.05)
    setDart({ ...land, landed: false })
    await sleep(40); setDart({ ...land, landed: true })
    await sleep(420); beep(180, 0.12, 'square', 0.08)
    const dx = land.x - 100; const dy = land.y - 100
    if (Math.hypot(dx, dy) > R) {
      setMsg('พลาดกระดาน! ปาใหม่'); await sleep(1100); setDart(null); setBusy(false); return
    }
    const ang = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360
    const w = alive[Math.min(n - 1, Math.floor(ang / slice))]
    setHist((h) => [...h, w]); setMsg(`โดนช่องของ ${w.name}!`); fanfare()
    await sleep(900); setWinner(w)
  }

  const again = () => { setWinner(null); setDart(null); setMsg(''); setBusy(false) }
  const eliminate = () => { const w = winner; again(); setOutIds((o) => [...o, w.id]) }
  const reset = () => { setOutIds([]); setHist([]); again() }

  return (
    <Shell title="ปาเป้า" right={`${n} ช่อง`} onBack={onBack}>
      <div className="relative mx-auto w-full max-w-[22rem] select-none rounded-full bg-amber-900 p-2 shadow-xl">
        <svg viewBox="0 0 200 200" className="w-full overflow-visible" role="img" aria-label="เป้าปาลูกดอก">
          {n >= 2 && alive.map((p, i) => {
            const [x0, y0] = pt(i * slice, R)
            const [x1, y1] = pt((i + 1) * slice, R)
            const mid = i * slice + slice / 2
            const name = p.name.length > 9 ? `${p.name.slice(0, 8)}…` : p.name
            return (
              <g key={p.id}>
                <path d={`M100 100 L${x0} ${y0} A${R} ${R} 0 ${slice > 180 ? 1 : 0} 1 ${x1} ${y1} Z`} fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth="1.5" />
                <g transform={`rotate(${mid - 90} 100 100)`}>
                  <text x="176" y="100" textAnchor="end" dominantBaseline="central" fontSize={n > 6 ? 9 : 11} fontWeight="800" fill="#5a2a3c" fontFamily="Kanit, sans-serif">{name}</text>
                </g>
              </g>
            )
          })}
          <circle cx="100" cy="100" r="8" fill="#fff" stroke="#be123c" strokeWidth="3" />
          <circle cx="100" cy="100" r={R} fill="none" stroke="#7c2d12" strokeWidth="3" />
          {/* เป้าเล็งที่ส่ายไปมา */}
          {!busy && (
            <g transform={`translate(${cross.x} ${cross.y})`} stroke="#be123c" strokeWidth="2" fill="none" strokeLinecap="round">
              <circle r="9" /><path d="M-14 0H-5M5 0H14M0 -14V-5M0 5V14" />
            </g>
          )}
          {dart && (
            <g style={{ transform: `translate(${dart.landed ? dart.x : 100}px, ${dart.landed ? dart.y : 260}px) scale(${dart.landed ? 1 : 2})`, transition: 'transform .38s cubic-bezier(.2,.7,.4,1)' }}>
              <path d="M0 0 L-3 14 M0 0 L3 14" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
              <path d="M-4 12 L0 28 L4 12 Z" fill="#ef4444" />
              <circle r="2.6" fill="#1e293b" />
            </g>
          )}
        </svg>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {msg && <p className="text-center text-lg font-extrabold text-rose-500">{msg}</p>}
        {n < 2 ? <BigButton onClick={reset}>เริ่มใหม่ทุกคน</BigButton>
          : <BigButton onClick={throwDart} disabled={busy}>{busy ? 'ลูกดอกกำลังไป...' : 'ปา!'}</BigButton>}
        <p className="text-center text-xs text-rose-900/60">เป้าเล็งส่ายไปมา กดปาตอนที่ชอบ แต่ลูกดอกก็ส่ายเองนิดหน่อย ผลเลยสุ่ม</p>
        {hist.length > 0 && <p className="text-center text-sm text-slate-600">ที่ผ่านมา: {hist.map((p) => p.name).join(' → ')}</p>}
      </div>

      {winner && <ResultModal label="ลูกดอกปักที่" winner={winner} n={n} againLabel="ปาอีกรอบ" onAgain={again} onEliminate={eliminate} onBack={onBack} />}
    </Shell>
  )
}
