import { useEffect, useMemo, useRef, useState } from 'react'
import Animal from './Animal'
import { animalById } from '../game/constants'
import { beep, fanfare } from '../lib/sound'

const COLORS = ['#ff8fab', '#ffd166', '#8ed1fc', '#a0e3b0', '#c3a6ff', '#ffb38a', '#f6a6d5', '#9fe0e0']
const SPIN_MS = 5200
const R = 96

const pt = (deg, r) => {
  const t = (deg * Math.PI) / 180
  return [100 + r * Math.sin(t), 100 - r * Math.cos(t)]
}

export default function Wheel({ players, onBack }) {
  const roster = useMemo(() => players.map((p, i) => ({ ...p, num: i + 1 })), [players])
  const [outIds, setOutIds] = useState([])
  const remaining = roster.filter((p) => !outIds.includes(p.id))
  const n = remaining.length
  const slice = 360 / n
  const [rot, setRot] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState(null)
  const [picked, setPicked] = useState([])
  const timers = useRef([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)) }

  const spin = () => {
    if (spinning || n < 2) return
    const next = rot + 360 * (5 + Math.floor(Math.random() * 4)) + Math.random() * 360
    // ลูกศรชี้ขึ้นด้านบน: มุมของวงล้อที่อยู่ใต้ลูกศร = (360 - rot) mod 360
    const under = (((360 - (next % 360)) % 360) + 360) % 360
    const w = remaining[Math.min(n - 1, Math.floor(under / slice))]
    setSpinning(true); setWinner(null); setRot(next)
    // เสียงติ๊กถี่ตอนแรก แล้วช้าลงเรื่อย ๆ ตามจังหวะวงล้อชะลอ
    for (let k = 0; k < 28; k++) {
      const t = SPIN_MS * (1 - Math.pow(1 - k / 28, 1.8))
      later(() => beep(700 + (k % 2) * 120, 0.04, 'square', 0.04), t)
    }
    later(() => {
      setSpinning(false); setWinner(w); setPicked((p) => [...p, w]); fanfare()
    }, SPIN_MS + 100)
  }

  const again = () => setWinner(null)
  const eliminate = () => { setOutIds((o) => [...o, winner.id]); setWinner(null) }
  const reset = () => { setOutIds([]); setPicked([]); setWinner(null) }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-4">
      <div className="mb-2 flex items-center justify-between">
        <button onClick={onBack} className="rounded-lg px-3 py-1.5 text-rose-700 hover:bg-white/70">← กลับ</button>
        <h2 className="text-xl font-extrabold text-rose-500">วงล้อสุ่ม</h2>
        <span className="w-16 text-right text-xs text-rose-900/60">{n} คน</span>
      </div>

      <div className="relative mx-auto mt-2 w-full max-w-[22rem] select-none">
        {/* ลูกศรชี้ */}
        <svg viewBox="0 0 40 40" className="absolute left-1/2 top-0 z-10 w-10 -translate-x-1/2 -translate-y-[40%] drop-shadow" aria-hidden="true">
          <path d="M20 38 L6 8 Q20 -2 34 8 Z" fill="#f43f5e" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
        </svg>
        <div className="rounded-full bg-white p-2 shadow-xl ring-4 ring-pink-400">
          <svg viewBox="0 0 200 200" className="w-full" role="img" aria-label="วงล้อรายชื่อผู้เล่น"
               style={{ transform: `rotate(${rot}deg)`, transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(.12,.6,.08,1)` : 'none' }}>
            {n >= 2 && remaining.map((p, i) => {
              const a0 = i * slice
              const a1 = (i + 1) * slice
              const [x0, y0] = pt(a0, R)
              const [x1, y1] = pt(a1, R)
              const mid = a0 + slice / 2
              const name = p.name.length > 11 ? `${p.name.slice(0, 10)}…` : p.name
              return (
                <g key={p.id}>
                  <path d={`M100 100 L${x0} ${y0} A${R} ${R} 0 ${slice > 180 ? 1 : 0} 1 ${x1} ${y1} Z`} fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth="1.5" />
                  <g transform={`rotate(${mid - 90} 100 100)`}>
                    <text x="186" y="100" textAnchor="end" dominantBaseline="central" fontSize={n > 6 ? 10 : 12} fontWeight="800" fill="#5a2a3c" fontFamily="Kanit, sans-serif">{name}</text>
                  </g>
                </g>
              )
            })}
            <circle cx="100" cy="100" r="12" fill="#fff" stroke="#f472b6" strokeWidth="4" />
          </svg>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        {n < 2 ? (
          <button onClick={reset} className="rounded-2xl bg-amber-400 px-6 py-4 text-2xl font-extrabold text-amber-950 shadow-lg hover:bg-amber-300 active:scale-95">เริ่มใหม่ทุกคน</button>
        ) : (
          <button onClick={spin} disabled={spinning}
                  className="rounded-2xl bg-amber-400 px-6 py-4 text-2xl font-extrabold text-amber-950 shadow-lg shadow-amber-500/30 hover:bg-amber-300 active:scale-95 disabled:opacity-40">
            {spinning ? 'กำลังหมุน...' : 'หมุนเลย!'}
          </button>
        )}
        <p className="text-center text-xs text-rose-900/60">กดหมุน ลูกศรด้านบนชี้ที่ใคร คนนั้นโดน! ทุกคนมีโอกาสเท่ากัน</p>
        {picked.length > 0 && <p className="text-center text-sm text-slate-600">ที่ผ่านมา: {picked.map((p) => p.name).join(' → ')}</p>}
      </div>

      {winner && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-rose-950/30 p-4">
          <div className="pop w-full max-w-sm rounded-3xl bg-gradient-to-b from-amber-200 to-amber-50 p-6 text-center shadow-2xl ring-4 ring-amber-300">
            <div className="text-lg font-semibold text-amber-800">วงล้อเลือกแล้ว</div>
            <div className="float mx-auto w-44"><Animal animal={winner.animal} number={winner.num} running /></div>
            <h3 className="text-4xl font-extrabold text-amber-950">{winner.name}</h3>
            <p className="text-sm text-amber-900/70">{animalById(winner.animal).name}</p>
            <div className="mt-4 flex flex-col gap-2">
              <button onClick={again} className="rounded-xl bg-amber-400 px-4 py-3 text-lg font-extrabold text-amber-950 hover:bg-amber-300">หมุนอีกรอบ</button>
              {n > 2 && (
                <button onClick={eliminate} className="rounded-xl bg-rose-500 px-4 py-3 text-lg font-bold text-white hover:bg-rose-600">
                  เอา {winner.name} ออก แล้วหมุนต่อ (เหลือ {n - 1})
                </button>
              )}
              <button onClick={onBack} className="rounded-xl px-4 py-2 text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50">แก้ไขผู้เล่น</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
