import { useEffect, useMemo, useRef, useState } from 'react'
import { Shell, BigButton, Panel } from './MiniShell'
import Animal from './Animal'
import { randInt, rand } from '../lib/rand'
import { beep, fanfare } from '../lib/sound'
import { load, save } from '../lib/storage'
import { useMiniNet } from '../lib/useMiniNet'

const DEFAULT_DUTY = ['ร้องเพลง', 'เต้นท่าไก่', 'เล่าเรื่องตลก', 'ทำเสียงสัตว์', 'ชมเพื่อน', 'ถ่ายรูปหน้าตลก']
const DEFAULT_COND = ['1 นาที', '2 รอบ', 'ต่อหน้าทุกคน', 'แบบสโลว์โมชั่น', 'ด้วยเสียงเล็ก', 'แบบดราม่า']
const ROW = 60       // ความสูงต่อแถวของรีล (px)
const REP = 18       // จำนวนรอบที่ซ้ำในแถบรีล
const TITLES = ['ใคร', 'ทำอะไร', 'เงื่อนไข']
const CHIP = ['#ff8fb8', '#8fd3ff', '#ffd166']      // สีป้ายหัวรีล
const BITS = ['#ff8fb8', '#ffd166', '#8fd3ff', '#a0e3b0', '#c5a8ff']
const lines = (s, fb) => { const l = s.split('\n').map((t) => t.trim()).filter(Boolean); return l.length ? l : fb }

export default function Slot({ players, onBack, onNet, registerHandler }) {
  const people = useMemo(() => players.map((p) => ({ text: p.name, animal: p.animal })), [players])
  const [dutyText, setDutyText] = useState(() => load('animal-race:slot-duty', DEFAULT_DUTY.join('\n')))
  const [condText, setCondText] = useState(() => load('animal-race:slot-cond', DEFAULT_COND.join('\n')))
  useEffect(() => save('animal-race:slot-duty', dutyText), [dutyText])
  useEffect(() => save('animal-race:slot-cond', condText), [condText])
  const reels = [people, lines(dutyText, DEFAULT_DUTY).map((text) => ({ text })), lines(condText, DEFAULT_COND).map((text) => ({ text }))]

  const [state, setState] = useState(() => reels.map((l) => ({ pos: l.length * 2, anim: false, dur: 0 })))
  const [spinning, setSpinning] = useState(false)
  const [pulled, setPulled] = useState(false)
  const [result, setResult] = useState(null)   // ข้อความประโยค (ส่งให้มือถือเพื่อน)
  const [parts, setParts] = useState(null)     // ชิ้นส่วนไว้โชว์การ์ดน่ารัก ๆ
  const [round, setRound] = useState(0)
  const [history, setHistory] = useState([])
  const timers = useRef([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms))

  // ถ้าแก้ลิสต์ตอนไม่ได้หมุน ให้ตำแหน่งรีลอยู่ในช่วงที่ซ้ำไว้เสมอ
  const safe = (r, pos) => Math.min(pos, reels[r].length * (REP - 2))

  const pull = () => {
    if (spinning) return
    setSpinning(true); setResult(null); setParts(null); setPulled(true); later(() => setPulled(false), 450)
    const picks = reels.map((l) => randInt(l.length))
    const durs = [2200, 3200, 4200]
    setState((st) => st.map((s, r) => {
      const len = reels[r].length
      const base = len * 2 + (safe(r, s.pos) % len)
      const target = base + len * (3 + r * 2) + ((picks[r] - (base % len) + len) % len)
      return { pos: target, anim: true, dur: durs[r] }
    }))
    durs.forEach((d, r) => {
      for (let k = 1; k <= 6; k++) later(() => beep(500 + r * 90 + k * 20, 0.04, 'square', 0.03), d * (1 - Math.pow(1 - k / 7, 1.6)))
      later(() => { beep(740 + r * 120, 0.18, 'triangle', 0.08) }, d)
      later(() => setState((st) => st.map((s, i) => (i === r ? { pos: reels[r].length * 2 + picks[r], anim: false, dur: 0 } : s))), d + 120)
    })
    later(() => {
      const who = reels[0][picks[0]]; const duty = reels[1][picks[1]].text; const cond = reels[2][picks[2]].text
      const text = `${who.text} – ${duty} – ${cond}`
      setResult(text); setParts({ who, duty, cond }); setRound((k) => k + 1)
      setHistory((h) => [text, ...h].slice(0, 6)); setSpinning(false); fanfare()
    }, durs[2] + 200)
  }

  useMiniNet({ onNet, registerHandler },
    { spinning, result },
    { 'slot-pull': () => pull() })

  const bits = useMemo(() => Array.from({ length: 26 }, (_, i) => ({ x: rand(0, 100), d: rand(1.8, 3.2), delay: rand(0, 0.8), c: BITS[i % BITS.length] })), [round])

  return (
    <Shell title="สล็อตแมชชีน" right={`${people.length} คน`} onBack={onBack}
           side={<SlotSide {...{ pull, spinning, parts, round, bits, result, history, dutyText, setDutyText, condText, setCondText }} />}>
      <div className="relative mx-auto mt-5 flex w-full max-w-[34rem] items-start gap-1.5">
        {/* ตัวเครื่อง: หูกลม ๆ + หน้าตาน่ารัก */}
        <div className="relative min-w-0 flex-1">
          <span className="absolute -top-5 left-5 z-0 h-12 w-12 rounded-full border-[5px] border-[#24405a] bg-[#ff9cc3]"><span className="absolute inset-2 rounded-full bg-[#ffc3da]" /></span>
          <span className="absolute -top-5 right-5 z-0 h-12 w-12 rounded-full border-[5px] border-[#24405a] bg-[#ff9cc3]"><span className="absolute inset-2 rounded-full bg-[#ffc3da]" /></span>

          <div className="relative z-[1] overflow-hidden rounded-[2.2rem] border-[5px] border-[#24405a] bg-gradient-to-b from-[#ffb3d1] via-[#ff97bf] to-[#ff7fb0] p-3 shadow-[0_8px_0_#24405a]">
            {/* ไฟประดับ */}
            <div className="mb-1 flex justify-around" aria-hidden="true">
              {Array.from({ length: 9 }, (_, i) => <span key={i} className="twinkle h-2 w-2 rounded-full bg-yellow-200 shadow-[0_0_6px_#fff3a0]" style={{ animationDelay: `${i * 0.25}s` }} />)}
            </div>
            {/* หน้า */}
            <div className="relative mx-auto mb-2 flex h-16 items-center justify-center gap-7" aria-hidden="true">
              <span className="relative h-6 w-5 rounded-full bg-[#4a2a3a]"><span className="absolute left-0.5 top-0.5 h-2 w-2 rounded-full bg-white" /><span className="absolute bottom-1 right-0.5 h-1 w-1 rounded-full bg-white/80" /></span>
              <span className="relative h-6 w-5 rounded-full bg-[#4a2a3a]"><span className="absolute left-0.5 top-0.5 h-2 w-2 rounded-full bg-white" /><span className="absolute bottom-1 right-0.5 h-1 w-1 rounded-full bg-white/80" /></span>
              <span className="absolute left-[24%] top-7 h-3 w-6 rounded-full bg-[#ff6f9f]/60 blur-[1px]" />
              <span className="absolute right-[24%] top-7 h-3 w-6 rounded-full bg-[#ff6f9f]/60 blur-[1px]" />
              <svg viewBox="0 0 30 14" className={`absolute top-[1.8rem] w-7 ${spinning ? 'animate-pulse' : ''}`}>
                {spinning ? <ellipse cx="15" cy="6" rx="5" ry="5" fill="#8c2a52" /> : <path d="M3 3 Q9 12 15 5 Q21 12 27 3" fill="none" stroke="#8c2a52" strokeWidth="2.4" strokeLinecap="round" />}
              </svg>
            </div>

            {/* หน้าต่างรีล */}
            <div className="rounded-[1.6rem] bg-[#fff8fb] p-2 shadow-[inset_0_3px_8px_rgba(200,80,130,.25)] ring-4 ring-pink-200">
              <div className="grid grid-cols-3 gap-1.5">
                {reels.map((list, r) => {
                  const s = state[r]
                  const items = Array.from({ length: REP }, () => list).flat()
                  return (
                    <div key={r} className="min-w-0">
                      <div className="mb-1 rounded-full py-0.5 text-center text-[11px] font-extrabold text-white" style={{ background: CHIP[r] }}>{TITLES[r]}</div>
                      <div className="relative overflow-hidden rounded-xl bg-white ring-2 ring-pink-100" style={{ height: ROW * 3 }}>
                        <div style={{ transform: `translateY(${-(s.pos - 1) * ROW}px)`, transition: s.anim ? `transform ${s.dur}ms cubic-bezier(.15,.7,.2,1)` : 'none' }}>
                          {items.map((it, i) => (
                            <div key={i} className={`flex items-center justify-center gap-1 px-1 text-center ${i % 2 ? 'bg-[#fff0f6]' : 'bg-white'}`} style={{ height: ROW }}>
                              {it.animal && <span className="w-9 shrink-0"><Animal animal={it.animal} /></span>}
                              <span className="line-clamp-2 min-w-0 break-words text-xs font-extrabold leading-tight text-[#e0466e] sm:text-sm">{it.text}</span>
                            </div>
                          ))}
                        </div>
                        {/* กรอบเส้นกลาง + ลูกศรหัวใจ */}
                        <div className={`pointer-events-none absolute inset-x-0 top-1/3 h-1/3 border-y-[3px] border-pink-400 bg-pink-200/20 ${parts && !spinning ? 'animate-pulse' : ''}`} />
                        <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-xs text-pink-500">▶</span>
                        <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-xs text-pink-500">◀</span>
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-pink-100/90 via-transparent to-pink-100/90" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ถาดรับเหรียญ */}
            <div className="mx-auto mt-3 flex h-9 w-3/4 items-end justify-center gap-1 rounded-t-2xl bg-[#e2578f] pb-1 shadow-inner" aria-hidden="true">
              {['#ffd166', '#fff3a0', '#ffd166', '#ffb703', '#fff3a0'].map((c, i) => <span key={i} className="h-3.5 w-3.5 rounded-full border-2 border-[#d99a06]" style={{ background: c }} />)}
            </div>
          </div>
        </div>

        {/* คันโยก */}
        <button onClick={pull} disabled={spinning} aria-label="ดึงคันโยก" className="mt-16 grid h-32 w-11 shrink-0 place-items-start disabled:opacity-60">
          <svg viewBox="0 0 44 130" className="h-full w-full overflow-visible" aria-hidden="true">
            <rect x="0" y="52" width="14" height="30" rx="7" fill="#ffc3da" stroke="#fff" strokeWidth="3" />
            <g style={{ transformOrigin: '16px 66px', transform: pulled ? 'scaleY(-0.7)' : 'none', transition: 'transform .22s' }}>
              <rect x="12" y="14" width="9" height="52" rx="4.5" fill="#ff8fb8" stroke="#fff" strokeWidth="2.5" />
              <circle cx="16.5" cy="12" r="12" fill="#ff5f8f" stroke="#fff" strokeWidth="3" />
              <path d="M16.5 5 l2 4.2 l4.6 .5 l-3.4 3.1 l1 4.5 l-4.2 -2.4 l-4.2 2.4 l1 -4.5 l-3.4 -3.1 l4.6 -.5 z" fill="#fff3a0" />
            </g>
          </svg>
        </button>
      </div>

    </Shell>
  )
}

function SlotSide({ pull, spinning, parts, round, bits, result, history, dutyText, setDutyText, condText, setCondText }) {
  return (
    <>
        <BigButton onClick={pull} disabled={spinning}>{spinning ? 'กำลังหมุน...' : 'ดึงคันโยก!'}</BigButton>

        {/* ผลลัพธ์ */}
        <Panel title="ผลสล็อต">
        <div className="relative min-h-[6rem] text-center" aria-live="polite">
          {parts && !spinning ? (
            <div key={round} className="pop relative">
              {bits.map((b, i) => <span key={i} className="confetti" style={{ left: `${b.x}%`, background: b.c, animationDuration: `${b.d}s`, animationDelay: `${b.delay}s` }} />)}
              <div className="flex items-center justify-center gap-2">
                <span className="w-16 shrink-0"><Animal animal={parts.who.animal} /></span>
                <span className="booth-title text-2xl text-[#24405a]">{parts.who.text}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-lg font-extrabold">
                <span className="rounded-full px-3 py-0.5 text-white" style={{ background: CHIP[1] }}>{parts.duty}</span>
                <span className="text-pink-400" aria-hidden="true">♥</span>
                <span className="rounded-full px-3 py-0.5 text-[#24405a]" style={{ background: CHIP[2] }}>{parts.cond}</span>
              </div>
              <p className="sr-only">{result}</p>
            </div>
          ) : <div className="grid min-h-[6rem] place-items-center text-sm text-[#4f6a82]">{spinning ? 'ลุ้นๆๆ...' : 'ดึงคันโยกแล้วผลจะออกมาเป็นประโยคตลกๆ'}</div>}
        </div>
        </Panel>

        {history.length > 1 && (
          <Panel title="รอบก่อน ๆ">
            <ul className="flex flex-wrap gap-1.5 text-sm">
              {history.slice(1).map((h, i) => <li key={i} className="rounded-full border-2 border-[#24405a]/20 bg-white px-3 py-0.5 font-semibold text-[#4f6a82]">{h}</li>)}
            </ul>
          </Panel>
        )}

      <details className="t-card p-3">
        <summary className="cursor-pointer font-bold text-[#24405a]">แก้รายการรีล 2 และ 3</summary>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-xs font-bold text-[#24405a]">ทำอะไร (บรรทัดละ 1 อย่าง)
            <textarea value={dutyText} onChange={(e) => setDutyText(e.target.value)} disabled={spinning} rows={6} className="mt-1 w-full rounded-lg border-2 border-[#24405a]/25 p-2 text-sm font-normal outline-none focus:border-[#3ec1b0]" />
          </label>
          <label className="text-xs font-bold text-[#24405a]">เงื่อนไข/รางวัล
            <textarea value={condText} onChange={(e) => setCondText(e.target.value)} disabled={spinning} rows={6} className="mt-1 w-full rounded-lg border-2 border-[#24405a]/25 p-2 text-sm font-normal outline-none focus:border-[#3ec1b0]" />
          </label>
        </div>
      </details>
    </>
  )
}
