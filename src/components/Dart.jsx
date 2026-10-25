import { useEffect, useMemo, useRef, useState } from 'react'
import { Shell, BigButton, ResultModal } from './MiniShell'
import Animal from './Animal'
import { rand, sleep } from '../lib/rand'
import { beep, fanfare } from '../lib/sound'
import { useMiniNet } from '../lib/useMiniNet'

// กระดานดาร์ตแบบการ์ตูน: วงนอกสีดำเขียนชื่อ ช่องสลับครีม/ดำ มีวงแดง-เขียวเหมือนของจริง
const C = 120                       // จุดศูนย์กลาง (viewBox 240)
const R_EDGE = 116                  // ขอบกระดาน (วงชื่อ)
const R_NAME = 90                   // ขอบในของวงชื่อ = ขอบนอกของช่องคะแนน
const FILL = ['#f3e3bf', '#2a2623', '#cfa86a']   // ครีม / ดำ / (ช่องสุดท้ายถ้าจำนวนคนเป็นเลขคี่)
const RING = ['#1f9d57', '#d93f33', '#3b82c4']   // เขียว / แดง / ฟ้า
const DART_COLORS = ['#ef4444', '#3b82f6', '#facc15', '#22c55e']

const pt = (deg, r) => { const t = (deg * Math.PI) / 180; return [C + r * Math.sin(t), C - r * Math.cos(t)] }
// ชิ้นวงแหวน: มุม a0→a1 (องศา วัดจากด้านบนตามเข็ม) รัศมี r0→r1
function wedge(a0, a1, r0, r1) {
  const [x0, y0] = pt(a0, r1); const [x1, y1] = pt(a1, r1)
  const [x2, y2] = pt(a1, r0); const [x3, y3] = pt(a0, r0)
  const big = a1 - a0 > 180 ? 1 : 0
  return `M${x0} ${y0} A${r1} ${r1} 0 ${big} 1 ${x1} ${y1} L${x2} ${y2} A${r0} ${r0} 0 ${big} 0 ${x3} ${y3} Z`
}

export default function Dart({ players, onBack, onNet, registerHandler }) {
  const roster = useMemo(() => players.map((p, i) => ({ ...p, num: i + 1 })), [players])
  const [outIds, setOutIds] = useState([])
  const alive = roster.filter((p) => !outIds.includes(p.id))
  const n = alive.length
  const slice = 360 / n
  const [cross, setCross] = useState({ x: C, y: C })
  const [dart, setDart] = useState(null)       // {x, y, landed, color}
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [winner, setWinner] = useState(null)
  const [hit, setHit] = useState(null)         // index ช่องที่ลูกดอกปัก
  const [hist, setHist] = useState([])
  const [boardRot, setBoardRot] = useState(() => rand(0, 360)) // เป้าเล็งแกว่งในบางทิศมากกว่า: หมุนกระดานสุ่มทุกรอบให้ทุกช่องมีโอกาสเท่ากัน
  const [throws, setThrows] = useState(0)
  const raf = useRef(0)
  const live = useRef(true)
  const pos = useRef({ x: C, y: C })
  const t0 = useRef(performance.now())

  useEffect(() => {
    live.current = true
    const loop = (now) => {
      if (!live.current) return
      const t = now - t0.current
      let dx = 78 * Math.sin(t * 0.0021) + 26 * Math.sin(t * 0.0057 + 1)
      let dy = 78 * Math.sin(t * 0.0027 + 2) + 26 * Math.sin(t * 0.0049)
      const r = Math.hypot(dx, dy)
      if (r > 100) { dx *= 100 / r; dy *= 100 / r } // ให้เป้าเล็งวนอยู่ในกระดานเสมอ (ไม่งั้นมุมสี่เหลี่ยมจะหลุดขอบบ่อย)
      pos.current = { x: C + dx, y: C + dy }
      setCross(pos.current)
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
    return () => { live.current = false; cancelAnimationFrame(raf.current) }
  }, [])

  const throwDart = async () => {
    if (busy || n < 2) return
    setBusy(true); setMsg(''); setWinner(null); setHit(null)
    // ลูกดอกส่ายเล็กน้อยจากจุดที่เล็งไว้
    const a = rand(0, Math.PI * 2); const d = rand(0, 13)
    const land = { x: pos.current.x + Math.cos(a) * d, y: pos.current.y + Math.sin(a) * d, color: DART_COLORS[throws % DART_COLORS.length] }
    setThrows((k) => k + 1)
    beep(520, 0.08, 'sawtooth', 0.05)
    setDart({ ...land, landed: false })
    await sleep(40); setDart({ ...land, landed: true })
    await sleep(430); beep(180, 0.12, 'square', 0.08)
    const dx = land.x - C; const dy = land.y - C
    if (Math.hypot(dx, dy) > R_EDGE) {
      setMsg('พลาดกระดาน! ปาใหม่'); await sleep(1100); setDart(null); setBusy(false); return
    }
    const ang = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360
    const idx = Math.min(n - 1, Math.floor((((ang - boardRot) % 360) + 360) % 360 / slice))
    const w = alive[idx]
    setHit(idx); setHist((h) => [...h, w]); setMsg(`โดนช่องของ ${w.name}!`); fanfare()
    await sleep(1100); setWinner(w)
  }

  const again = () => {
    setWinner(null); setDart(null); setMsg(''); setHit(null)
    setBoardRot(rand(0, 360)); setBusy(true); setTimeout(() => setBusy(false), 750) // รอกระดานหมุนเสร็จก่อนปา
  }
  const eliminate = () => { const w = winner; again(); setOutIds((o) => [...o, w.id]) }
  const reset = () => { setOutIds([]); setHist([]); again() }

  useMiniNet({ onNet, registerHandler },
    { phase: winner ? 'done' : busy ? 'busy' : 'aim', msg, winnerId: winner?.id ?? null },
    { 'dart-throw': () => { if (!winner) throwDart() } })

  const parity = (i) => (n % 2 === 1 && i === n - 1 ? 2 : i % 2)
  const short = (name) => (name.length > (n > 6 ? 7 : 9) ? `${name.slice(0, n > 6 ? 6 : 8)}…` : name)

  return (
    <Shell title="ปาเป้า" right={`${n} ช่อง`} onBack={onBack}>
      {/* ผนังไม้ + กระดาน */}
      <div className="relative mx-auto aspect-[1/1.1] w-full max-w-[26rem] select-none overflow-hidden rounded-[2rem] shadow-xl ring-4 ring-amber-900/25"
           style={{ background: 'repeating-linear-gradient(90deg,#dba15c 0,#dba15c 62px,#c88a46 62px,#c88a46 64px), linear-gradient(180deg,rgba(255,255,255,.18),rgba(120,60,10,.18))', backgroundBlendMode: 'multiply' }}>
        {/* โน้ตสติกเกอร์ */}
        <div className="absolute left-3 top-3 z-[2] grid h-16 w-16 -rotate-6 place-items-center bg-yellow-200 shadow-md" style={{ boxShadow: '2px 4px 8px rgba(80,40,0,.3)' }}>
          <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-red-500 shadow" />
          <svg viewBox="0 0 40 40" className="w-10" aria-hidden="true"><circle cx="20" cy="20" r="14" fill="none" stroke="#c2410c" strokeWidth="2" /><path d="M13 18 q2 -3 4 0 M23 18 q2 -3 4 0" stroke="#c2410c" strokeWidth="2" fill="none" strokeLinecap="round" /><path d="M14 24 q6 6 12 0" stroke="#c2410c" strokeWidth="2" fill="none" strokeLinecap="round" /><circle cx="12" cy="23" r="2" fill="#fca5a5" /><circle cx="28" cy="23" r="2" fill="#fca5a5" /></svg>
        </div>
        {/* ฟองเชียร์ */}
        <div className="absolute right-3 top-3 z-[2] rotate-3 rounded-[1.4rem] bg-[#fff6e3] px-3 py-2 text-center shadow-md ring-2 ring-white/70">
          <div className="text-base font-extrabold leading-4 text-amber-900">Good<br />Luck!</div>
          <div className="text-sm text-pink-500" aria-hidden="true">♥</div>
        </div>
        {/* กระดานดำเล็ก */}
        <div className="absolute bottom-[17%] right-2 z-[2] grid h-[4.2rem] w-12 place-items-center rounded-md bg-[#2d2d2d] ring-2 ring-[#6b4a2b]" aria-hidden="true">
          <svg viewBox="0 0 30 40" className="w-8"><circle cx="13" cy="14" r="8" fill="none" stroke="#fff" strokeWidth="1.6" /><circle cx="13" cy="14" r="3.5" fill="none" stroke="#fff" strokeWidth="1.6" /><path d="M13 14 L24 5" stroke="#fff" strokeWidth="1.6" /><path d="M15 33 l1.7 -3.5 l1.7 3.5 l3.8 .4 l-2.9 2.5 l.9 3.7 l-3.5 -2 l-3.5 2 l.9 -3.7 l-2.9 -2.5 z" fill="#facc15" /></svg>
        </div>

        {/* กระดาน */}
        <svg viewBox="0 -14 240 254" className="absolute left-1/2 top-[3%] z-[1] w-[86%] -translate-x-1/2 overflow-visible drop-shadow-[0_10px_10px_rgba(70,30,0,.45)]" role="img" aria-label="กระดานปาเป้า">
          <path d="M104 4 L120 -10 L136 4" stroke="#3b3b3b" strokeWidth="4" fill="none" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx="120" cy="-6" r="4" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
          <circle cx={C} cy={C} r={R_EDGE} fill="#231f1d" stroke="#0f0d0c" strokeWidth="3" />
          <circle cx={C} cy={C} r={R_EDGE - 3} fill="none" stroke="#4a4340" strokeWidth="1" />
          <g style={{ transform: `rotate(${boardRot}deg)`, transformOrigin: `${C}px ${C}px`, transition: 'transform .7s ease-in-out' }}>
          {n >= 2 && alive.map((p, i) => {
            const a0 = i * slice; const a1 = (i + 1) * slice; const mid = a0 + slice / 2
            const k = parity(i)
            const bottom = mid > 90 && mid < 270
            return (
              <g key={p.id}>
                <path d={wedge(a0, a1, 12, R_NAME)} fill={FILL[k]} />
                <path d={wedge(a0, a1, R_NAME - 6, R_NAME)} fill={RING[k]} />
                <path d={wedge(a0, a1, 50, 56)} fill={RING[k]} />
                {/* ชื่อบนวงดำ: วางตามแนวสัมผัสวงกลม */}
                <g transform={`rotate(${bottom ? mid + 180 : mid} ${C} ${C})`}>
                  <text x={C} y={bottom ? C + (R_EDGE + R_NAME) / 2 + 4 : C - (R_EDGE + R_NAME) / 2 + 4} textAnchor="middle" fontSize={n > 6 ? 10 : 12} fontWeight="800" fill="#fff" fontFamily="Kanit, sans-serif">{short(p.name)}</text>
                </g>
              </g>
            )
          })}
          {/* ลวดแบ่งช่อง */}
          {alive.map((_, i) => { const [x0, y0] = pt(i * slice, 12); const [x1, y1] = pt(i * slice, R_NAME); return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#c9ced6" strokeWidth="1.1" /> })}
          <circle cx={C} cy={C} r={R_NAME} fill="none" stroke="#c9ced6" strokeWidth="1.2" />
          {/* ช่องที่โดน */}
          {hit != null && <path className="animate-pulse" d={wedge(hit * slice, (hit + 1) * slice, 12, R_EDGE)} fill="rgba(255,236,120,.38)" stroke="#fde047" strokeWidth="2.5" />}
          </g>
          {/* จุดกลาง */}
          <circle cx={C} cy={C} r="12" fill="#1f9d57" stroke="#c9ced6" strokeWidth="1.2" />
          <circle cx={C} cy={C} r="5.5" fill="#d93f33" stroke="#c9ced6" strokeWidth="1" />

          {/* เป้าเล็งที่ส่ายไปมา */}
          {!busy && (
            <g transform={`translate(${cross.x} ${cross.y})`} fill="none" strokeLinecap="round">
              <g stroke="#fff" strokeWidth="5"><circle r="10" /><path d="M-17 0H-6M6 0H17M0 -17V-6M0 6V17" /></g>
              <g stroke="#ef2f2f" strokeWidth="2.4"><circle r="10" /><path d="M-17 0H-6M6 0H17M0 -17V-6M0 6V17" /></g>
            </g>
          )}
          {/* ลูกดอก: ปลายแหลมอยู่ที่จุดที่ปัก ตัวลูกดอกเฉียงออกมาทางขวาล่าง */}
          {dart && (
            <g style={{ transform: `translate(${dart.landed ? dart.x : C + 80}px, ${dart.landed ? dart.y : 270}px) scale(${dart.landed ? 1 : 1.7})`, transition: 'transform .4s cubic-bezier(.2,.7,.4,1)' }}>
              <g transform="rotate(38)">
                <path d="M0 0 L9 0" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round" />
                <rect x="9" y="-2.8" width="22" height="5.6" rx="2.6" fill="#d9a521" stroke="#8a6410" strokeWidth=".8" />
                <path d="M14 -2.6 v5.2 M18 -2.6 v5.2 M22 -2.6 v5.2" stroke="#8a6410" strokeWidth=".7" />
                <rect x="31" y="-1.4" width="12" height="2.8" rx="1.2" fill={dart.color} />
                <path d="M40 0 L54 -9 L58 -1 L58 1 L54 9 Z" fill={dart.color} stroke="rgba(0,0,0,.25)" strokeWidth=".8" strokeLinejoin="round" />
                <path d="M42 0 L55 0" stroke="rgba(255,255,255,.55)" strokeWidth="1.2" />
              </g>
            </g>
          )}
        </svg>

        {/* ชั้นวางลูกดอก */}
        <div className="absolute inset-x-0 bottom-0 z-[3] h-[12%] border-t-4 border-[#e6b574] bg-gradient-to-b from-[#d99a52] to-[#bd7a35]" />
        <svg viewBox="0 0 140 60" className="absolute bottom-[1.2%] right-2 z-[4] w-[44%]" aria-hidden="true">
          {[['#3b82f6', 6, 0], ['#facc15', 14, 14], ['#22c55e', 22, 28]].map(([c, y, dx], i) => (
            <g key={i} transform={`translate(${20 + dx} ${18 + y}) rotate(-12)`}>
              <path d="M0 0 L12 0" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
              <rect x="12" y="-3.4" width="30" height="6.8" rx="3" fill="#d9a521" stroke="#8a6410" strokeWidth=".9" />
              <rect x="42" y="-1.6" width="14" height="3.2" rx="1.4" fill={c} />
              <path d="M52 0 L68 -10 L72 -1 L72 1 L68 10 Z" fill={c} stroke="rgba(0,0,0,.25)" strokeWidth=".9" strokeLinejoin="round" />
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <p className="min-h-[1.75rem] text-center text-lg font-extrabold text-rose-500" aria-live="polite">{msg}</p>
        {n < 2 ? <BigButton onClick={reset}>เริ่มใหม่ทุกคน</BigButton>
          : <BigButton onClick={throwDart} disabled={busy}>{busy ? 'ลูกดอกกำลังไป...' : 'ปา!'}</BigButton>}
        <p className="text-center text-xs text-rose-900/60">เป้าเล็งส่ายไปมา กดปาตอนที่ชอบ แต่ลูกดอกก็ส่ายเองนิดหน่อย ผลเลยสุ่ม</p>
        {hist.length > 0 && (
          <ol className="flex flex-wrap justify-center gap-1.5" aria-label="ที่ผ่านมา">
            {hist.map((p, k) => (
              <li key={k} className="pop flex items-center gap-1 rounded-full bg-white py-0.5 pl-1 pr-3 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-amber-200">
                <span className="w-7"><Animal animal={p.animal} /></span><span className="text-amber-600">{k + 1}</span>{p.name}
              </li>
            ))}
          </ol>
        )}
      </div>

      {winner && <ResultModal label="ลูกดอกปักที่" winner={winner} n={n} againLabel="ปาอีกรอบ" onAgain={again} onEliminate={eliminate} onBack={onBack} />}
    </Shell>
  )
}
