import { useEffect, useMemo, useRef, useState } from 'react'
import { Shell, BigButton } from './MiniShell'
import { randInt } from '../lib/rand'
import { beep, fanfare } from '../lib/sound'
import { load, save } from '../lib/storage'

const DEFAULT_DUTY = ['ร้องเพลง', 'เต้นท่าไก่', 'เล่าเรื่องตลก', 'ทำเสียงสัตว์', 'ชมเพื่อน', 'ถ่ายรูปหน้าตลก']
const DEFAULT_COND = ['1 นาที', '2 รอบ', 'ต่อหน้าทุกคน', 'แบบสโลว์โมชั่น', 'ด้วยเสียงเล็ก', 'แบบดราม่า']
const ROW = 56       // ความสูงต่อแถวของรีล (px)
const REP = 18       // จำนวนรอบที่ซ้ำในแถบรีล
const lines = (s, fb) => { const l = s.split('\n').map((t) => t.trim()).filter(Boolean); return l.length ? l : fb }

export default function Slot({ players, onBack }) {
  const names = useMemo(() => players.map((p) => p.name), [players])
  const [dutyText, setDutyText] = useState(() => load('animal-race:slot-duty', DEFAULT_DUTY.join('\n')))
  const [condText, setCondText] = useState(() => load('animal-race:slot-cond', DEFAULT_COND.join('\n')))
  useEffect(() => save('animal-race:slot-duty', dutyText), [dutyText])
  useEffect(() => save('animal-race:slot-cond', condText), [condText])
  const reels = [names, lines(dutyText, DEFAULT_DUTY), lines(condText, DEFAULT_COND)]
  const titles = ['ใคร', 'ทำอะไร', 'เงื่อนไข']

  const [state, setState] = useState(() => reels.map((l) => ({ pos: l.length * 2, anim: false, dur: 0 })))
  const [spinning, setSpinning] = useState(false)
  const [pulled, setPulled] = useState(false)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const timers = useRef([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms))

  // ถ้าแก้ลิสต์ตอนไม่ได้หมุน ให้ตำแหน่งรีลอยู่ในช่วงที่ซ้ำไว้เสมอ
  const safe = (r, pos) => Math.min(pos, reels[r].length * (REP - 2))

  const pull = () => {
    if (spinning) return
    setSpinning(true); setResult(null); setPulled(true); later(() => setPulled(false), 450)
    const picks = reels.map((l) => randInt(l.length))
    const durs = [2200, 3200, 4200]
    setState((st) => st.map((s, r) => {
      const len = reels[r].length
      const base = len * 2 + (safe(r, s.pos) % len)
      const target = base + len * (3 + r * 2) + ((picks[r] - (base % len) + len) % len)
      return { pos: target, anim: true, dur: durs[r], base }
    }))
    // ถ้ารีลเริ่มจากตำแหน่งปัจจุบัน ต้องรีเซ็ตให้เริ่มจาก base ก่อน (ไม่มีแอนิเมชัน)
    durs.forEach((d, r) => {
      for (let k = 1; k <= 6; k++) later(() => beep(500 + r * 90 + k * 20, 0.04, 'square', 0.03), d * (1 - Math.pow(1 - k / 7, 1.6)))
      later(() => { beep(740 + r * 120, 0.18, 'triangle', 0.08) }, d)
      later(() => setState((st) => st.map((s, i) => (i === r ? { pos: reels[r].length * 2 + picks[r], anim: false, dur: 0 } : s))), d + 120)
    })
    later(() => {
      const text = `${names[picks[0]]} – ${reels[1][picks[1]]} – ${reels[2][picks[2]]}`
      setResult(text); setHistory((h) => [text, ...h].slice(0, 6)); setSpinning(false); fanfare()
    }, durs[2] + 200)
  }

  return (
    <Shell title="สล็อตแมชชีน" right={`${names.length} คน`} onBack={onBack}>
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-3xl bg-gradient-to-b from-rose-500 to-rose-600 p-3 shadow-xl ring-4 ring-rose-300">
          <div className="grid grid-cols-3 gap-2">
            {reels.map((list, r) => {
              const s = state[r]
              const items = Array.from({ length: REP }, () => list).flat()
              return (
                <div key={r}>
                  <div className="mb-1 text-center text-[11px] font-bold text-rose-100">{titles[r]}</div>
                  <div className="relative overflow-hidden rounded-xl bg-white shadow-inner" style={{ height: ROW * 3 }}>
                    <div style={{ transform: `translateY(${-(s.pos - 1) * ROW}px)`, transition: s.anim ? `transform ${s.dur}ms cubic-bezier(.15,.7,.2,1)` : 'none' }}>
                      {items.map((t, i) => (
                        <div key={i} className="flex items-center justify-center px-1 text-center text-xs font-extrabold leading-tight text-slate-700 sm:text-sm" style={{ height: ROW }}>
                          <span className="line-clamp-2 break-words">{t}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pointer-events-none absolute inset-x-0 top-1/3 h-1/3 border-y-2 border-amber-400 bg-amber-300/20" />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-300/70 via-transparent to-slate-300/70" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        {/* คันโยก */}
        <button onClick={pull} disabled={spinning} aria-label="ดึงคันโยก" className="grid h-28 w-12 place-items-start disabled:opacity-60">
          <svg viewBox="0 0 40 110" className="h-full w-full overflow-visible" aria-hidden="true">
            <rect x="15" y="50" width="10" height="56" rx="4" fill="#94a3b8" />
            <g style={{ transformOrigin: '20px 56px', transform: pulled ? 'scaleY(-0.55)' : 'none', transition: 'transform .2s' }}>
              <rect x="17" y="14" width="6" height="42" rx="3" fill="#64748b" />
              <circle cx="20" cy="12" r="11" fill="#ef4444" stroke="#fff" strokeWidth="2" />
            </g>
          </svg>
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <BigButton onClick={pull} disabled={spinning}>{spinning ? 'กำลังหมุน...' : 'ดึงคันโยก!'}</BigButton>
        <div className="min-h-[4.5rem] rounded-2xl bg-white px-4 py-3 text-center shadow ring-1 ring-rose-100" aria-live="polite">
          {result ? <span className="pop inline-block text-2xl font-extrabold text-rose-600">{result}</span> : <span className="text-sm text-slate-400">ผลจะออกมาเป็นประโยคตลก ๆ</span>}
        </div>
        {history.length > 1 && <ul className="space-y-0.5 text-center text-sm text-slate-500">{history.slice(1).map((h, i) => <li key={i}>{h}</li>)}</ul>}
      </div>

      <details className="mt-4 rounded-xl bg-white/70 p-3 ring-1 ring-rose-100">
        <summary className="cursor-pointer font-semibold text-rose-700">แก้รายการรีล 2 และ 3</summary>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-xs font-bold text-slate-600">ทำอะไร (บรรทัดละ 1 อย่าง)
            <textarea value={dutyText} onChange={(e) => setDutyText(e.target.value)} disabled={spinning} rows={6} className="mt-1 w-full rounded-lg border-2 border-rose-200 p-2 text-sm font-normal outline-none focus:border-rose-400" />
          </label>
          <label className="text-xs font-bold text-slate-600">เงื่อนไข/รางวัล
            <textarea value={condText} onChange={(e) => setCondText(e.target.value)} disabled={spinning} rows={6} className="mt-1 w-full rounded-lg border-2 border-rose-200 p-2 text-sm font-normal outline-none focus:border-rose-400" />
          </label>
        </div>
      </details>
    </Shell>
  )
}
