import { useEffect, useMemo, useRef, useState } from 'react'
import Animal from './Animal'
import { animalById } from '../game/constants'
import { beep, fanfare } from '../lib/sound'
import { useMiniNet } from '../lib/useMiniNet'

const COLORS = ['#ff6f91', '#ffd166', '#3ec1b0', '#8ed1fc', '#c3a6ff', '#ffb38a', '#a0e3b0', '#f6a6d5']
const SPIN_MS = 5200
const R = 92
const BULBS = 24

const pt = (deg, r) => {
  const t = (deg * Math.PI) / 180
  return [100 + r * Math.sin(t), 100 - r * Math.cos(t)]
}

export default function Wheel({ players, onBack, onNet, registerHandler }) {
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

  useMiniNet({ onNet, registerHandler },
    { phase: spinning ? 'spin' : winner ? 'done' : 'ready', winnerId: winner?.id ?? null, n },
    { 'wheel-spin': () => { if (!winner) spin() } })

  const colorOf = (id) => { const i = remaining.findIndex((p) => p.id === id); return i < 0 ? '#d5dbe1' : COLORS[i % COLORS.length] }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button onClick={onBack} className="t-btn t-ghost px-3 py-1 text-sm">← กลับ</button>
        <h2 className="booth-title text-2xl text-[#24405a] sm:text-3xl">วงล้อสุ่ม</h2>
        <span className="rounded-full border-[3px] border-[#24405a] bg-[#ffd166] px-3 py-0.5 text-sm font-bold text-[#24405a]">{n} คน</span>
      </div>

      <div className="flex flex-1 flex-col items-center gap-6 lg:flex-row lg:items-center lg:justify-center lg:gap-12">
        {/* วงล้อ: ขนาดตามทั้งความกว้างและความสูงจอ */}
        <div className="@container relative mt-6 w-[min(100%,calc(100dvh-16rem),36rem)] min-w-[16rem] select-none">
          {/* ลูกศรชี้ */}
          <svg viewBox="0 0 40 46" className="absolute left-1/2 top-0 z-10 w-[11%] -translate-x-1/2 -translate-y-[38%]" aria-hidden="true">
            <path d="M20 43 L5 11 Q20 -3 35 11 Z" fill="#ff6f91" stroke="#24405a" strokeWidth="4" strokeLinejoin="round" />
            <circle cx="20" cy="14" r="5" fill="#fff" stroke="#24405a" strokeWidth="3" />
          </svg>
          <div className="relative aspect-square">
            {/* ขาตั้ง */}
            <svg viewBox="0 0 200 60" className="absolute left-1/2 top-[94%] w-[46%] -translate-x-1/2" aria-hidden="true">
              <path d="M70 0 L130 0 L170 52 L30 52 Z" fill="#3ec1b0" stroke="#24405a" strokeWidth="6" strokeLinejoin="round" />
              <rect x="12" y="48" width="176" height="10" rx="5" fill="#24405a" />
            </svg>
            {/* ขอบวงล้อ + หลอดไฟ */}
            <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full drop-shadow-[0_8px_0_#24405a]" aria-hidden="true">
              <circle cx="100" cy="100" r="99" fill="#24405a" />
              {Array.from({ length: BULBS }, (_, i) => {
                const [x, y] = pt((i * 360) / BULBS, 95.5)
                return <circle key={i} cx={x} cy={y} r="2.6" className={`wheel-bulb ${spinning ? 'on' : ''}`} style={{ animationDelay: `${(i % 2) * 0.25}s` }} fill={i % 2 ? '#ffd166' : '#fff'} />
              })}
            </svg>
            <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" role="img" aria-label="วงล้อรายชื่อผู้เล่น"
                 style={{ transform: `rotate(${rot}deg)`, transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(.12,.6,.08,1)` : 'none' }}>
              {n >= 2 && remaining.map((p, i) => {
                const a0 = i * slice
                const a1 = (i + 1) * slice
                const [x0, y0] = pt(a0, R)
                const [x1, y1] = pt(a1, R)
                const mid = a0 + slice / 2
                const name = p.name.length > 10 ? `${p.name.slice(0, 9)}…` : p.name
                return (
                  <g key={p.id}>
                    <path d={`M100 100 L${x0} ${y0} A${R} ${R} 0 ${slice > 180 ? 1 : 0} 1 ${x1} ${y1} Z`} fill={COLORS[i % COLORS.length]} stroke="#24405a" strokeWidth="1.6" />
                    <g transform={`rotate(${mid - 90} 100 100)`}>
                      <text x="182" y="100" textAnchor="end" dominantBaseline="central" fontSize={n > 6 ? 9.5 : 11.5} fontWeight="700" fill="#24405a" fontFamily="Mali, Kanit, sans-serif">{name}</text>
                    </g>
                  </g>
                )
              })}
            </svg>
            {/* ดุมกลาง = ปุ่มหมุน */}
            <button onClick={n < 2 ? reset : spin} disabled={spinning}
                    className="booth-title absolute left-1/2 top-1/2 grid aspect-square w-[24%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[5px] border-[#24405a] bg-white text-[6.5cqw] leading-none text-[#e0466e] shadow-[0_5px_0_#24405a] transition hover:bg-[#fff4f7] active:translate-y-[-46%] disabled:cursor-not-allowed disabled:text-[#9aa8b5]">
              {spinning ? '...' : n < 2 ? 'ใหม่' : 'หมุน!'}
            </button>
          </div>
          <div className="aspect-[100/11]" aria-hidden />
        </div>

        {/* แผงข้าง: ปุ่มหมุน + รายชื่อ + ประวัติ */}
        <aside className="flex w-full max-w-md flex-col gap-4">
          {n < 2 ? (
            <button onClick={reset} className="t-btn t-pink booth-title px-6 py-3 text-3xl">เริ่มใหม่ทุกคน</button>
          ) : (
            <button onClick={spin} disabled={spinning} className="t-btn t-pink booth-title px-6 py-3 text-3xl">
              {spinning ? 'กำลังหมุน...' : 'หมุนวงล้อ!'}
            </button>
          )}
          <section className="t-card overflow-hidden">
            <div className="flex items-center justify-between border-b-4 border-[#24405a] bg-[#3ec1b0] px-4 py-2">
              <h3 className="booth-title text-xl text-white [text-shadow:0_2px_0_#24405a]">ผู้เล่นบนวงล้อ</h3>
              <span className="text-sm font-bold text-white">{n}/{roster.length}</span>
            </div>
            <ul className="grid grid-cols-2 gap-2 p-3">
              {roster.map((p) => {
                const out = outIds.includes(p.id)
                return (
                  <li key={p.id} className={`flex items-center gap-2 rounded-xl border-2 border-[#24405a]/15 px-2 py-1 ${out ? 'opacity-45' : ''}`}>
                    <span className="size-3.5 shrink-0 rounded-full border-2 border-[#24405a]" style={{ background: colorOf(p.id) }} />
                    <span className="w-9 shrink-0"><Animal animal={p.animal} /></span>
                    <span className={`min-w-0 truncate font-bold ${out ? 'line-through' : ''}`}>{p.name}</span>
                  </li>
                )
              })}
            </ul>
          </section>
          {picked.length > 0 && (
            <section className="rounded-2xl bg-[#ffe1e9] p-3">
              <div className="mb-1 text-sm font-bold text-[#e0466e]">วงล้อเลือกมาแล้ว</div>
              <ol className="flex flex-wrap gap-1.5 text-sm">
                {picked.map((p, i) => (
                  <li key={i} className="rounded-full border-2 border-[#24405a] bg-white px-2.5 py-0.5 font-bold">{i + 1}. {p.name}</li>
                ))}
              </ol>
            </section>
          )}
          <p className="text-center text-xs text-[#4f6a82]">กดหมุน ลูกศรด้านบนชี้ที่ใคร คนนั้นโดน! ทุกคนมีโอกาสเท่ากัน</p>
        </aside>
      </div>

      {winner && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#24405a]/30 p-4">
          <div className="t-modal pop w-full max-w-sm p-6 text-center">
            <div className="text-lg font-semibold text-[#1f8f80]">วงล้อเลือกแล้ว</div>
            <div className="float mx-auto w-44"><Animal animal={winner.animal} number={winner.num} running /></div>
            <h3 className="text-4xl font-extrabold text-[#24405a]">{winner.name}</h3>
            <p className="text-sm text-[#4f6a82]">{animalById(winner.animal).name}</p>
            <div className="mt-4 flex flex-col gap-2">
              <button onClick={again} className="t-btn t-yellow px-4 py-3 text-lg font-extrabold">หมุนอีกรอบ</button>
              {n > 2 && (
                <button onClick={eliminate} className="t-btn t-pink px-4 py-3 text-lg font-bold">
                  เอา {winner.name} ออก แล้วหมุนต่อ (เหลือ {n - 1})
                </button>
              )}
              <button onClick={onBack} className="t-btn t-ghost px-4 py-2">แก้ไขผู้เล่น</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
