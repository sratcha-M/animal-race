import { useEffect, useMemo, useRef, useState } from 'react'
import { Shell, BigButton } from './MiniShell'
import { beep, fanfare } from '../lib/sound'
import { load, save } from '../lib/storage'
import { useMiniNet } from '../lib/useMiniNet'

const COLORS = ['#f43f5e', '#f59e0b', '#0ea5e9', '#22c55e', '#8b5cf6', '#f97316', '#ec4899', '#14b8a6']
const DEFAULT_SLOTS = ['ล้างจาน', 'ถูบ้าน', 'ซื้อน้ำ', 'เลี้ยงขนม', 'เก็บขยะ', 'จดบันทึก', 'ถือของ', 'พักผ่อน']
const LEVELS = 9
const H = 300

// เส้นขวางแบบสุ่ม: แต่ละระดับวางได้เฉพาะระหว่างช่องที่ติดกัน และไม่ติดกันเองในระดับเดียวกัน
function makeRungs(n) {
  return Array.from({ length: LEVELS }, () => {
    const set = []
    for (let k = 0; k < n - 1;) { if (Math.random() < 0.45) { set.push(k); k += 2 } else k += 1 }
    return set
  })
}
function trace(rungs, start, n) {
  let col = start
  const pts = [[col, 0]]
  rungs.forEach((set, lvl) => {
    const y = ((lvl + 1) / (LEVELS + 1)) * H
    const move = set.includes(col) ? 1 : set.includes(col - 1) ? -1 : 0
    if (move) { pts.push([col, y], [col + move, y]); col += move }
  })
  pts.push([col, H])
  return { pts, end: col }
}

export default function Ladder({ players, onBack, onNet, registerHandler }) {
  const roster = useMemo(() => players.map((p, i) => ({ ...p, num: i + 1 })), [players])
  const n = roster.length
  const [rungs, setRungs] = useState(() => makeRungs(n))
  const [slots, setSlots] = useState(() => { const s = load('animal-race:ladder-slots', []); return Array.from({ length: n }, (_, i) => s[i] || DEFAULT_SLOTS[i % DEFAULT_SLOTS.length]) })
  const [shown, setShown] = useState([]) // index ของคนที่ปล่อยเส้นแล้ว (เส้นกำลังไหลลง)
  const [done, setDone] = useState([])   // index ของคนที่เส้นไหลถึงปลายทางแล้ว ถึงตอนนี้ค่อยเฉลย
  const [hide, setHide] = useState(false)
  const paths = useMemo(() => roster.map((_, i) => trace(rungs, i, n)), [rungs, roster, n])
  const allShown = shown.length === n
  const colW = 64
  const x = (c) => c * 100 + 50

  // มีคนเข้า/ออกห้อง: จัดเส้นและช่องปลายทางใหม่ให้พอดีกับจำนวนคน
  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return }
    setRungs(makeRungs(n)); setShown([]); setDone([])
    setSlots((prev) => Array.from({ length: n }, (_, i) => prev[i] || DEFAULT_SLOTS[i % DEFAULT_SLOTS.length]))
  }, [n])

  const reveal = (i) => {
    if (shown.includes(i)) return
    setShown((s) => [...s, i])
    for (let k = 0; k < 8; k++) setTimeout(() => beep(500 + k * 50, 0.05, 'triangle', 0.05), k * 280)
  }
  // เส้นถึงปลายทางแล้ว (แอนิเมชันจบ) ค่อยเฉลยว่าได้ช่องไหน
  const finish = (i) => {
    setDone((d) => (d.includes(i) ? d : [...d, i]))
    beep(880, 0.2, 'triangle', 0.08)
  }
  useEffect(() => { if (n > 0 && done.length === n) { const t = setTimeout(fanfare, 250); return () => clearTimeout(t) } return undefined }, [done.length, n]) // eslint-disable-line react-hooks/exhaustive-deps
  const revealAll = () => { roster.forEach((_, i) => setTimeout(() => reveal(i), i * 400)) }
  const reroll = () => { setRungs(makeRungs(n)); setShown([]); setDone([]) }
  const setSlot = (i, v) => { const s = slots.map((t, k) => (k === i ? v : t)); setSlots(s); save('animal-race:ladder-slots', s) }

  useMiniNet({ onNet, registerHandler },
    {
      slots,
      going: shown.filter((i) => !done.includes(i)).map((i) => roster[i]?.id),
      shown: done.map((i) => roster[i]?.id),
      results: Object.fromEntries(done.filter((i) => roster[i] && paths[i]).map((i) => [roster[i].id, slots[paths[i].end]])),
    },
    { 'ladder-go': (from) => { const i = roster.findIndex((p) => p.id === from); if (i >= 0) reveal(i) } })

  return (
    <Shell title="บันไดงู" right={`${n} คน`} onBack={onBack}>
      <p className="mb-2 text-center text-xs text-rose-900/60">แตะชื่อเพื่อให้เส้นไหลลงไปหาปลายทาง · แก้ชื่อช่องข้างล่างได้ตามต้องการ</p>
      <div className="overflow-x-auto rounded-2xl bg-white p-3 shadow ring-1 ring-rose-100">
        <div style={{ minWidth: n * colW }}>
          <div className="grid" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
            {roster.map((p, i) => (
              <button key={p.id} onClick={() => reveal(i)} aria-label={`ปล่อยเส้นของ ${p.name}`}
                      className="mx-0.5 truncate rounded-lg px-1 py-1.5 text-xs font-extrabold text-white shadow active:scale-95 sm:text-sm"
                      style={{ background: COLORS[i % COLORS.length], opacity: shown.includes(i) ? 0.55 : 1 }}>{p.name}</button>
            ))}
          </div>
          <svg viewBox={`0 0 ${n * 100} ${H}`} preserveAspectRatio="none" className="block w-full" style={{ height: H }} aria-hidden="true">
            {roster.map((_, c) => <line key={c} x1={x(c)} x2={x(c)} y1="0" y2={H} stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />)}
            {rungs.flatMap((set, lvl) => set.map((k) => {
              const y = ((lvl + 1) / (LEVELS + 1)) * H
              return <line key={`${lvl}-${k}`} x1={x(k)} x2={x(k + 1)} y1={y} y2={y} stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" vectorEffect="non-scaling-stroke"
                           style={{ opacity: hide && !allShown ? 0 : 1, transition: 'opacity .4s' }} />
            }))}
            {shown.map((i) => (
              <polyline key={i} className="trace" pathLength="1" strokeDasharray="1" fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
                        points={paths[i].pts.map(([c, y]) => `${x(c)},${y}`).join(' ')} onAnimationEnd={() => finish(i)} />
            ))}
          </svg>
          <div className="grid" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
            {slots.map((s, i) => {
              const who = done.find((d) => paths[d]?.end === i)
              return (
                <input key={i} value={s} maxLength={10} onChange={(e) => setSlot(i, e.target.value)} aria-label={`ปลายทางช่อง ${i + 1}`}
                       className={`mx-0.5 min-w-0 rounded-lg border-2 px-1 py-1.5 text-center text-xs font-bold text-slate-700 outline-none focus:border-rose-300 sm:text-sm ${who != null ? 'pop bg-white' : 'border-slate-200 bg-slate-50'}`}
                       style={who != null ? { borderColor: COLORS[who % COLORS.length] } : undefined} />
              )
            })}
          </div>
          <div className="grid" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }} aria-label="ผู้ที่ได้แต่ละช่อง">
            {slots.map((_, i) => {
              const who = done.find((d) => paths[d]?.end === i)
              return (
                <span key={i} className="mx-0.5 mt-1 min-h-[1.25rem] truncate rounded-md px-1 text-center text-[11px] font-extrabold text-white sm:text-xs"
                      style={who != null ? { background: COLORS[who % COLORS.length] } : undefined}>{who != null ? roster[who].name : ''}</span>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <BigButton onClick={revealAll} disabled={allShown}>เปิดทุกเส้น</BigButton>
        <div className="flex gap-2">
          <button onClick={reroll} className="flex-1 rounded-xl px-4 py-2 text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50">สุ่มเส้นขวางใหม่</button>
          <label className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm text-rose-600 ring-1 ring-rose-200">
            <input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} /> ซ่อนเส้นขวาง
          </label>
        </div>
      </div>

      {shown.length > 0 && (
        <ul className="mt-4 space-y-1">
          {shown.map((i) => (
            <li key={i} className="flex items-center gap-2 rounded-lg bg-white/80 px-3 py-1.5 text-sm ring-1 ring-rose-100">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="font-bold">{roster[i].name}</span>
              <span className="text-slate-400">→</span>
              {done.includes(i)
                ? <span className="pop min-w-0 flex-1 truncate font-extrabold text-rose-600">{slots[paths[i].end]}</span>
                : <span className="min-w-0 flex-1 animate-pulse text-slate-400">กำลังไหลลงไป...</span>}
            </li>
          ))}
        </ul>
      )}
    </Shell>
  )
}
