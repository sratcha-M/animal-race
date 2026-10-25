import { useEffect, useMemo, useRef, useState } from 'react'
import { Shell, BigButton, ResultModal, Panel, Choice } from './MiniShell'
import Animal from './Animal'
import { rand, sleep, shuffle } from '../lib/rand'
import { beep, fanfare } from '../lib/sound'
import { load, save } from '../lib/storage'
import { useMiniNet } from '../lib/useMiniNet'

// สีพาสเทล น่ารัก ๆ
const COLORS = ['#ff9ec4', '#ffd966', '#8fd3ff', '#9be8b5', '#c5a8ff', '#ffb48a', '#f7a8e0', '#7fe3da']
const LEVELS = [0, 2, 1, 3]            // ความสูงสลับกัน ลูกโป่งจะได้ไม่ทับกัน
const SHREDS = ['♥', '★', '✦', '♥', '★', '✦', '♥', '★', '✦', '♥']
const CONFETTI = ['#ff9ec4', '#ffd966', '#8fd3ff', '#9be8b5', '#c5a8ff']
const DUR_KEY = 'animal-race:balloon-dur'
const CHIPS = { auto: [10, 20, 30, 60, 90], tap: [0, 15, 30, 60, 90] } // วินาที (0 = ไม่จำกัด ใช้ได้เฉพาะโหมดแตะเอง)
const MODES = {
  auto: { label: 'เข็มสุ่มแตก', desc: 'ปล่อยให้ดวงเลือก' },
  tap: { label: 'แตะแตกเอง', desc: 'แตะลูกโป่งทีละลูก' },
}

export default function Balloon({ players, onBack, onNet, registerHandler }) {
  const roster = useMemo(() => players.map((p, i) => ({ ...p, num: i + 1 })), [players])
  const [outIds, setOutIds] = useState([])
  const alive = roster.filter((p) => !outIds.includes(p.id))
  const n = alive.length
  const [mode, setMode] = useState(() => load('animal-race:balloon-mode', 'auto'))
  const [phase, setPhase] = useState('ready')   // ready | float | done
  const [popped, setPopped] = useState([])      // id ที่แตกแล้ว เรียงตามลำดับ
  const [winner, setWinner] = useState(null)
  const [modal, setModal] = useState(false)
  const [tense, setTense] = useState(false)     // เหลือ 2 ลูกสุดท้าย
  const [canTap, setCanTap] = useState(false)
  const [needle, setNeedle] = useState(null)    // { x, y, side, ms }
  const [dur, setDur] = useState(() => Number(load(DUR_KEY, 30)) || 0) // เวลาทั้งหมดที่เลือก (วินาที)
  const [secLeft, setSecLeft] = useState(null)  // นับถอยหลัง
  const endsAt = useRef(0)
  const poppedRef = useRef([]); const phaseRef = useRef('ready'); const finishing = useRef(false)
  const run = useRef(0)
  useEffect(() => () => { run.current = -1 }, [])
  useEffect(() => save('animal-race:balloon-mode', mode), [mode])
  useEffect(() => save(DUR_KEY, dur), [dur])
  const effDur = mode === 'auto' ? Math.max(dur || 30, Math.ceil(n * 1.5)) : dur // เวลาจริงที่ใช้ (อย่างน้อย 1.5 วิต่อลูก)

  poppedRef.current = popped; phaseRef.current = phase
  const floating = phase !== 'ready'
  const bw = Math.min(26, 150 / Math.max(n, 1))             // ความกว้างลูกโป่ง (% ของฉาก)
  const geom = (i) => {
    const bottom = floating ? 24 + LEVELS[i % 4] * 7 : 5 + LEVELS[i % 4] * 2
    return { x: ((i + 0.5) / n) * 100, bottom, top: 100 - bottom - bw * 1.05 * 0.6 } // top = จุดกลางตัวลูกโป่ง
  }
  const idxOf = (id) => alive.findIndex((p) => p.id === id)
  const left = n - popped.length

  // เสียงหัวใจเต้นตอนลุ้นสองลูกสุดท้าย
  useEffect(() => {
    if (!tense || phase !== 'float') return undefined
    const t = setInterval(() => { beep(110, 0.09, 'sine', 0.12); setTimeout(() => beep(110, 0.09, 'sine', 0.09), 160) }, 720)
    return () => clearInterval(t)
  }, [tense, phase])

  // นับถอยหลัง
  useEffect(() => {
    if (phase !== 'float' || !endsAt.current) { if (phase !== 'float') setSecLeft(null); return undefined }
    const t = setInterval(() => setSecLeft(Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1000))), 250)
    return () => clearInterval(t)
  }, [phase, canTap])

  const pop = (id) => {
    beep(1000, 0.05, 'sine', 0.09); setTimeout(() => beep(1500, 0.07, 'triangle', 0.07), 40)
    setPopped((p) => (p.includes(id) ? p : [...p, id]))
  }

  // เข็มดาวบินเข้าไปจิ้มลูกโป่ง (feintAt = ทำท่าจะจิ้มอีกลูกก่อน เพิ่มความลุ้น)
  const strike = async (id, ok, feintAt) => {
    const t = geom(idxOf(id))
    const side = Math.random() < 0.5 ? 'l' : 'r'
    const off = side === 'l' ? -14 : 114
    setNeedle({ x: off, y: t.top, side, ms: 0 }); await sleep(40)
    if (feintAt) {
      const f = geom(idxOf(feintAt))
      setNeedle({ x: f.x + (side === 'l' ? -12 : 12), y: f.top, side, ms: 900 }); await sleep(1000)
      if (!ok()) return
      beep(500, 0.1, 'sine', 0.06)
      setNeedle({ x: off, y: f.top, side, ms: 600 }); await sleep(900)
      if (!ok()) return
      setNeedle({ x: off, y: t.top, side, ms: 0 }); await sleep(60)
    }
    beep(300, 0.18, 'triangle', 0.05)
    setNeedle({ x: t.x + (side === 'l' ? -bw * 0.28 : bw * 0.28), y: t.top, side, ms: 380 }); await sleep(400)
    if (!ok()) return
    pop(id); setNeedle(null)
  }

  const win = async (last, ok) => {
    await sleep(900); if (!ok()) return
    setTense(false); setWinner(last); setPhase('done'); fanfare()
    await sleep(2000); if (ok()) setModal(true)
  }

  // แตกทีละลูกตามลำดับ order (ลูกสุดท้ายคือผู้รอด) ให้จบภายในประมาณ totalSec วินาที
  // ช่วงแรกแตกถี่ ๆ สุ่มช้าเร็ว ส่วน 2 ลูกสุดท้ายเว้นนานขึ้นให้ลุ้น
  const runPops = async (order, totalSec, ok) => {
    const m = order.length - 1
    if (m < 1) return win(order[0], ok)
    const w = Array.from({ length: m }, (_, i) => (i >= m - 2 ? (i === m - 1 ? 3 : 2) : rand(0.6, 1.4)))
    const sum = w.reduce((a, b) => a + b, 0)
    for (let i = 0; i < m; i++) {
      const remain = order.length - i
      if (remain === 2) setTense(true)
      const over = 0.9 + (remain === 2 ? 2.6 : 0)
      await sleep(Math.max(0.25, (totalSec * w[i]) / sum - over) * 1000); if (!ok()) return
      await strike(order[i].id, ok, remain === 2 ? order[order.length - 1].id : null); if (!ok()) return
      await sleep(500)
    }
    win(order[order.length - 1], ok)
  }

  const start = async () => {
    const id = ++run.current
    const ok = () => run.current === id
    finishing.current = false
    setPhase('float'); setPopped([]); setWinner(null); setModal(false); setTense(false); setNeedle(null); setCanTap(false)
    if (mode === 'auto' || dur > 0) { endsAt.current = Date.now() + (effDur + 2.4) * 1000; setSecLeft(effDur + 3) } else { endsAt.current = 0; setSecLeft(null) }
    if (mode === 'auto') { await sleep(2400); if (ok()) runPops(shuffle(alive), effDur - 2.4 > 3 ? effDur - 2.4 : effDur, ok); return }
    await sleep(2400); if (!ok()) return
    setCanTap(true)
    if (dur > 0) {
      await sleep(dur * 1000); if (!ok()) return
      // หมดเวลา: ที่เหลือแตกเองจนเหลือลูกเดียว
      if (phaseRef.current !== 'float' || finishing.current) return
      setCanTap(false)
      const rest = alive.filter((x) => !poppedRef.current.includes(x.id))
      if (rest.length > 1) runPops(shuffle(rest), Math.max(4, rest.length * 1.5), ok)
      else if (rest.length === 1) win(rest[0], ok)
    }
  }

  const tap = (p) => {
    if (!canTap || popped.includes(p.id)) return
    pop(p.id)
    const rest = alive.filter((x) => x.id !== p.id && !popped.includes(x.id))
    if (rest.length === 1) { finishing.current = true; setCanTap(false); const id = run.current; win(rest[0], () => run.current === id) } else if (rest.length === 2) setTense(true)
  }

  const again = () => { run.current++; setModal(false); setPhase('ready'); setPopped([]); setWinner(null); setTense(false); setNeedle(null); setCanTap(false) }
  const eliminate = () => { const w = winner; again(); setOutIds((o) => [...o, w.id]) }
  const reset = () => { setOutIds([]); again() }

  const bubble = phase === 'ready' ? 'กดปล่อยลูกโป่งเลย!'
    : phase === 'done' ? `ผู้รอดคือ ${winner?.name}!`
      : tense ? 'เหลือ 2 ลูกสุดท้าย... ลุ้นนน!'
        : canTap ? `แตะลูกโป่งให้แตก · เหลือ ${left} ลูก` : `ลูกโป่งลอยขึ้นแล้ว เหลือ ${left} ลูก`
  const confetti = useMemo(() => Array.from({ length: 36 }, (_, i) => ({ x: rand(0, 100), d: rand(2.4, 4.4), delay: rand(0, 1.4), c: CONFETTI[i % CONFETTI.length] })), [winner])

  useMiniNet({ onNet, registerHandler },
    { mode, phase, canTap, tense, left, secLeft, winnerId: winner?.id ?? null, alive: alive.filter((p) => !popped.includes(p.id)).map((p) => p.id) },
    {
      'balloon-start': () => { if (phase === 'ready' && n >= 2) start() },
      'balloon-tap': (from, d) => { const p = alive.find((x) => x.id === d?.id); if (p) tap(p) },
    })

  const side = (
    <>
      {n < 2 ? <BigButton onClick={reset}>เริ่มใหม่ทุกคน</BigButton>
        : <BigButton onClick={start} disabled={phase === 'float'}>{phase === 'float' ? (canTap ? 'แตะลูกโป่งได้เลย!' : 'ลูกโป่งกำลังแตก...') : phase === 'done' ? 'ปล่อยลูกโป่งอีกรอบ' : 'ปล่อยลูกโป่ง!'}</BigButton>}
      <p className="-mt-1 text-center text-xs text-[#4f6a82]">ลูกโป่งแตกทีละลูก ลูกสุดท้ายที่เหลืออยู่คือคนที่ถูกเลือก</p>
      {popped.length > 0 && (
        <Panel title="ลำดับที่แตก" extra={`${popped.length}/${alive.length}`}>
          <ol className="flex flex-wrap gap-1.5" aria-label="ลำดับที่แตก">
            {popped.map((id, k) => {
              const p = roster.find((x) => x.id === id)
              return (
                <li key={id} className="pop flex items-center gap-1 rounded-full border-2 border-[#24405a] bg-white py-0.5 pl-1 pr-3 text-sm font-bold">
                  <span className="w-7"><Animal animal={p.animal} /></span><span className="text-[#e0466e]">{k + 1}</span>{p.name}
                </li>
              )
            })}
          </ol>
        </Panel>
      )}
      <Panel title="ตั้งค่า">
        <div className="flex flex-col gap-3">
          <Choice label="วิธีแตก" value={mode} disabled={phase === 'float'} onChange={(k) => { setMode(k); again() }}
                  options={Object.entries(MODES).map(([k, v]) => ({ k, label: v.label, desc: v.desc }))} />
          <div>
            <Choice label="เวลา" value={dur} disabled={phase === 'float'} onChange={setDur} cols={CHIPS[mode].length}
                    options={CHIPS[mode].map((sec) => ({ k: sec, label: sec === 0 ? 'ไม่จำกัด' : `${sec} วิ` }))} />
            <label className="mt-2 flex items-center justify-end gap-1 text-xs text-[#4f6a82]">กำหนดเอง
              <input type="number" inputMode="numeric" min={5} max={300} value={dur || ''} placeholder="วิ" disabled={phase === 'float'} aria-label="กำหนดเวลาเอง (วินาที)"
                     onChange={(e) => setDur(Math.max(0, Math.min(300, Number(e.target.value) || 0)))}
                     className="w-16 rounded-lg border-2 border-[#24405a]/30 px-1.5 py-1 text-center text-sm disabled:opacity-50" />วิ
            </label>
            <p className="mt-1 text-xs text-[#4f6a82]">{mode === 'auto' ? `ลูกโป่งจะแตกจนเหลือลูกเดียวภายในประมาณ ${effDur} วินาที${effDur > dur && dur ? ' (ขั้นต่ำ 1.5 วิต่อลูก)' : ''}` : dur ? `แตะลูกโป่งให้ทันใน ${dur} วินาที หมดเวลาแล้วที่เหลือจะแตกเอง` : 'แตะได้ไม่จำกัดเวลา'}</p>
          </div>
        </div>
      </Panel>
    </>
  )

  return (
    <Shell title="ลูกโป่งแตก" right={`${left} ลูก`} onBack={() => { run.current = -1; onBack() }} side={side}>
      <div className="relative mx-auto aspect-[3/4] w-[min(100%,calc((100dvh-8rem)*0.75))] min-w-[15rem] select-none overflow-hidden rounded-[2rem] border-4 border-[#24405a] bg-gradient-to-b from-[#ffd9ec] via-[#e4f3ff] to-[#fff6d9] shadow-[0_8px_0_#24405a]">
        {/* เมฆฟู ๆ + ประกายดาว */}
        {[['6%', 46, 0.9], ['20%', 62, 0.7], ['34%', 54, 0.55]].map(([top, dur, sc], i) => (
          <svg key={i} viewBox="0 0 120 60" className="cloud absolute w-28 opacity-90" style={{ top, animationDuration: `${dur}s`, animationDelay: `${-i * 17}s`, scale: String(sc) }} aria-hidden="true">
            <path d="M25 52 a18 18 0 0 1 2-35 a24 24 0 0 1 46-4 a20 20 0 0 1 28 14 a16 16 0 0 1-2 25 Z" fill="#fff" />
            <circle cx="42" cy="38" r="3" fill="#ffc2dc" opacity=".7" /><circle cx="78" cy="38" r="3" fill="#ffc2dc" opacity=".7" />
          </svg>
        ))}
        {[[10, 12], [86, 9], [74, 30], [18, 40], [92, 52], [8, 66]].map(([x, y], i) => (
          <span key={i} className="twinkle absolute text-lg text-yellow-300" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.4}s` }} aria-hidden="true">✦</span>
        ))}
        {/* พื้นหญ้า */}
        <div className="absolute inset-x-0 bottom-0 h-[7%] rounded-t-[50%] bg-[#bdeccb]" />
        <div className="absolute bottom-[1.5%] left-[8%] text-xl text-pink-300" aria-hidden="true">✿</div>
        <div className="absolute bottom-[2%] left-[40%] text-lg text-yellow-300" aria-hidden="true">✿</div>
        <div className="absolute bottom-[1%] right-[10%] text-xl text-pink-300" aria-hidden="true">✿</div>

        {/* ฉากลุ้น 2 ลูกสุดท้าย */}
        <div className="pointer-events-none absolute inset-0 z-[8] transition-opacity duration-700" style={{ opacity: tense && phase === 'float' ? 1 : 0, background: 'radial-gradient(circle at 50% 50%, transparent 38%, rgba(150,90,190,.38) 100%)' }} />

        {phase === 'float' && secLeft != null && (
          <div className="absolute left-2 top-2 z-[9] rounded-full bg-white/90 px-2.5 py-1 text-sm font-extrabold tabular-nums text-[#e0466e] shadow ring-2 ring-pink-200" aria-label="เวลาที่เหลือ">⏱ {secLeft}</div>
        )}
        {/* ฟองข้อความด้านบน */}
        <div className="absolute inset-x-0 top-[2.5%] z-[9] px-14 text-center">
          <span className={`inline-block rounded-full bg-white/95 px-4 py-1.5 text-sm font-extrabold shadow ring-2 ring-pink-200 ${tense && phase === 'float' ? 'animate-pulse text-fuchsia-600' : 'text-[#e0466e]'}`}>{bubble}</span>
        </div>

        {/* ลูกโป่ง */}
        {alive.map((p, i) => {
          const g = geom(i)
          const isPopped = popped.includes(p.id)
          const isWinner = winner?.id === p.id
          const color = COLORS[i % COLORS.length]
          const clickable = canTap && !isPopped
          return (
            <div key={p.id}>
              {!isPopped && (
                <button type="button" onClick={() => tap(p)} disabled={!clickable} aria-label={`ลูกโป่ง ${p.name}`}
                        className="absolute block disabled:cursor-default"
                        style={{
                          left: `${isWinner ? 50 : g.x}%`, bottom: `${isWinner ? 30 : g.bottom}%`, width: `${bw}%`,
                          transform: `translateX(-50%) scale(${isWinner ? 1.5 : 1})`, zIndex: isWinner ? 7 : 2 + (LEVELS[i % 4]),
                          transition: 'bottom 2.4s cubic-bezier(.3,.9,.4,1), left 1.1s ease-in-out, transform 1.1s cubic-bezier(.3,1.6,.5,1)',
                          cursor: clickable ? 'pointer' : 'default',
                        }}>
                  {isWinner && <span className="absolute left-1/2 top-[34%] -z-10 h-[150%] w-[150%] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-[radial-gradient(circle,#fff6b0_0%,rgba(255,246,176,0)_68%)]" />}
                  <span className={`relative block ${floating && !isWinner ? 'balloon-bob' : ''} ${tense && !isWinner && phase === 'float' ? 'balloon-jitter' : ''} ${clickable ? 'hover:scale-105 active:scale-95' : ''}`}
                        style={{ animationDelay: `${i * -0.45}s`, animationDuration: tense && !isWinner ? '0.5s' : `${1.9 + (i % 3) * 0.5}s`, transition: 'scale .15s' }}>
                    <svg viewBox="0 0 100 140" className="block w-full overflow-visible" aria-hidden="true">
                      <defs>
                        <radialGradient id={`bg-${p.id}`} cx="35%" cy="28%" r="80%">
                          <stop offset="0%" stopColor="#fff" stopOpacity=".95" /><stop offset="28%" stopColor={color} /><stop offset="100%" stopColor={color} stopOpacity=".82" />
                        </radialGradient>
                      </defs>
                      <path d="M50 118 q-9 8 0 14 q9 6 0 12" stroke="#c9b9c9" strokeWidth="2" fill="none" strokeLinecap="round" />
                      <path d="M50 3 C88 3 98 42 82 70 C74 85 62 96 50 106 C38 96 26 85 18 70 C2 42 12 3 50 3 Z" fill={`url(#bg-${p.id})`} stroke="#fff" strokeWidth="2.5" />
                      <path d="M43 106 L50 116 L57 106 Z" fill={color} />
                      <ellipse cx="29" cy="26" rx="8" ry="13" fill="#fff" opacity=".55" transform="rotate(22 29 26)" />
                    </svg>
                    {/* สัตว์โผล่ในลูกโป่ง */}
                    <span className="absolute left-[17%] top-[11%] grid aspect-square w-[66%] place-items-center overflow-hidden rounded-full bg-white/70 ring-2 ring-white">
                      <span className="block w-[96%]"><Animal animal={p.animal} /></span>
                    </span>
                    {/* ป้ายชื่อน่ารัก ๆ */}
                    <span className="absolute inset-x-[-6%] top-[76%] mx-auto block w-max max-w-[118%] truncate rounded-full bg-white px-2 py-0.5 text-center text-[11px] font-extrabold text-[#e0466e] shadow ring-2 ring-pink-200 sm:text-sm">{p.name}</span>
                  </span>
                </button>
              )}
              {isPopped && <PopFx x={g.x} top={g.top} bw={bw} color={color} animal={p.animal} seed={i} />}
            </div>
          )
        })}

        {/* เข็มดาว */}
        {needle && (
          <div className="pointer-events-none absolute z-[9]" style={{ left: `${needle.x}%`, top: `${needle.y}%`, transform: `translate(${needle.side === 'l' ? '-100%' : '0'}, -50%) ${needle.side === 'r' ? 'scaleX(-1)' : ''}`, transformOrigin: 'center', transition: `left ${needle.ms}ms ease-in-out, top ${needle.ms}ms ease-in-out` }}>
            <svg viewBox="0 0 80 24" className="w-20 drop-shadow" aria-hidden="true">
              <path d="M2 12 H58" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" />
              <path d="M58 12 L72 12" stroke="#e5e7eb" strokeWidth="2" strokeLinecap="round" />
              <path d="M8 12 L2 6 M8 12 L2 18" stroke="#f9a8d4" strokeWidth="3" strokeLinecap="round" />
              <path d="M70 12 l2 -5 l2 5 l5 0 l-4 3 l2 5 l-5 -3 l-5 3 l2 -5 l-4 -3 z" fill="#fde047" stroke="#f59e0b" strokeWidth="1" transform="translate(-4 0)" />
            </svg>
          </div>
        )}

        {/* ฉลองผู้รอด */}
        {phase === 'done' && winner && confetti.map((c, i) => (
          <span key={i} className="confetti z-[9]" style={{ left: `${c.x}%`, background: c.c, animationDuration: `${c.d}s`, animationDelay: `${c.delay}s` }} />
        ))}
      </div>

      {modal && winner && <ResultModal label="ลูกสุดท้ายที่รอด" winner={winner} n={n} againLabel="ปล่อยอีกรอบ" onAgain={again} onEliminate={eliminate} onBack={onBack} />}
    </Shell>
  )
}

// ตอนแตก: ป๊อป! + หัวใจ/ดาวกระจาย + สัตว์ตกลงมาเบา ๆ พร้อมฟองพูด
function PopFx({ x, top, bw, color, animal, seed }) {
  const shreds = useMemo(() => SHREDS.map((ch, i) => {
    const a = (i / SHREDS.length) * Math.PI * 2 + seed
    const r = rand(55, 95)
    return { ch, dx: Math.cos(a) * r, dy: Math.sin(a) * r, s: rand(0.9, 1.5) }
  }), [seed])
  return (
    <>
      <div className="pointer-events-none absolute z-[6]" style={{ left: `${x}%`, top: `${top}%` }}>
        <span className="burst absolute -left-8 -top-8 block h-16 w-16 rounded-full border-4" style={{ borderColor: color }} />
        {shreds.map((s, i) => (
          <span key={i} className="shred absolute text-xl font-black" style={{ color: i % 2 ? color : '#ffd966', '--dx': `${s.dx}px`, '--dy': `${s.dy}px`, fontSize: `${s.s}rem` }}>{s.ch}</span>
        ))}
        <span className="pop-text absolute -left-6 -top-14 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-sm font-extrabold text-[#e0466e] shadow ring-2 ring-pink-200">ป๊อป!</span>
      </div>
      <div className="cute-fall pointer-events-none absolute z-[5]" style={{ left: `${x}%`, top: `${top - 4}%`, width: `${bw * 0.78}%` }}>
        <Animal animal={animal} />
        <span className="absolute -right-3 -top-3 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-xs font-extrabold text-sky-500 shadow ring-2 ring-sky-100">ปุ๊ง~ ฮือ</span>
      </div>
    </>
  )
}
