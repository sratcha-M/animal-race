import { useEffect, useMemo, useRef, useState } from 'react'
import { Shell, BigButton, ResultModal } from './MiniShell'
import Animal from './Animal'
import { rand, sleep, shuffle } from '../lib/rand'
import { beep, fanfare } from '../lib/sound'
import { load, save } from '../lib/storage'

// สีพาสเทล น่ารัก ๆ
const COLORS = ['#ff9ec4', '#ffd966', '#8fd3ff', '#9be8b5', '#c5a8ff', '#ffb48a', '#f7a8e0', '#7fe3da']
const LEVELS = [0, 2, 1, 3]            // ความสูงสลับกัน ลูกโป่งจะได้ไม่ทับกัน
const SHREDS = ['♥', '★', '✦', '♥', '★', '✦', '♥', '★', '✦', '♥']
const CONFETTI = ['#ff9ec4', '#ffd966', '#8fd3ff', '#9be8b5', '#c5a8ff']
const MODES = {
  auto: { label: 'เข็มสุ่มแตก', desc: 'ปล่อยให้ดวงเลือก' },
  tap: { label: 'แตะแตกเอง', desc: 'แตะลูกโป่งทีละลูก' },
}

export default function Balloon({ players, onBack }) {
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
  const run = useRef(0)
  useEffect(() => () => { run.current = -1 }, [])
  useEffect(() => save('animal-race:balloon-mode', mode), [mode])

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

  const start = async () => {
    const id = ++run.current
    const ok = () => run.current === id
    setPhase('float'); setPopped([]); setWinner(null); setModal(false); setTense(false); setNeedle(null); setCanTap(false)
    await sleep(2400); if (!ok()) return
    if (mode === 'tap') { setCanTap(true); return }
    const order = shuffle(alive)
    for (let i = 0; i < order.length - 1; i++) {
      const remain = order.length - i
      if (remain === 2) setTense(true)
      await sleep(remain <= 2 ? rand(2200, 3000) : rand(900, 1700)); if (!ok()) return
      await strike(order[i].id, ok, remain === 2 ? order[order.length - 1].id : null); if (!ok()) return
      await sleep(500)
    }
    win(order[order.length - 1], ok)
  }

  const tap = (p) => {
    if (!canTap || popped.includes(p.id)) return
    pop(p.id)
    const rest = alive.filter((x) => x.id !== p.id && !popped.includes(x.id))
    if (rest.length === 1) { setCanTap(false); const id = run.current; win(rest[0], () => run.current === id) } else if (rest.length === 2) setTense(true)
  }

  const again = () => { run.current++; setModal(false); setPhase('ready'); setPopped([]); setWinner(null); setTense(false); setNeedle(null); setCanTap(false) }
  const eliminate = () => { const w = winner; again(); setOutIds((o) => [...o, w.id]) }
  const reset = () => { setOutIds([]); again() }

  const bubble = phase === 'ready' ? 'กดปล่อยลูกโป่งเลย!'
    : phase === 'done' ? `ผู้รอดคือ ${winner?.name}!`
      : tense ? 'เหลือ 2 ลูกสุดท้าย... ลุ้นนน!'
        : canTap ? `แตะลูกโป่งให้แตก · เหลือ ${left} ลูก` : `ลูกโป่งลอยขึ้นแล้ว เหลือ ${left} ลูก`
  const confetti = useMemo(() => Array.from({ length: 36 }, (_, i) => ({ x: rand(0, 100), d: rand(2.4, 4.4), delay: rand(0, 1.4), c: CONFETTI[i % CONFETTI.length] })), [winner])

  return (
    <Shell title="ลูกโป่งแตก" right={`${left} ลูก`} onBack={() => { run.current = -1; onBack() }}>
      <div role="radiogroup" aria-label="วิธีแตก" className="mb-2 grid grid-cols-2 gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-rose-100">
        {Object.entries(MODES).map(([k, v]) => (
          <button key={k} onClick={() => { setMode(k); again() }} aria-pressed={mode === k} disabled={phase === 'float'}
                  className={`rounded-xl px-2 py-1.5 text-sm font-bold transition disabled:opacity-50 ${mode === k ? 'bg-rose-400 text-white shadow' : 'text-rose-500 hover:bg-rose-50'}`}>
            {v.label}<div className="text-[10px] font-normal leading-tight opacity-80">{v.desc}</div>
          </button>
        ))}
      </div>

      <div className="relative aspect-[3/4] w-full select-none overflow-hidden rounded-[2rem] border-[10px] border-white bg-gradient-to-b from-[#ffd9ec] via-[#e4f3ff] to-[#fff6d9] shadow-xl ring-4 ring-pink-200">
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

        {/* ฟองข้อความด้านบน */}
        <div className="absolute inset-x-0 top-[2.5%] z-[9] text-center">
          <span className={`inline-block rounded-full bg-white/95 px-4 py-1.5 text-sm font-extrabold shadow ring-2 ring-pink-200 ${tense && phase === 'float' ? 'animate-pulse text-fuchsia-600' : 'text-rose-500'}`}>{bubble}</span>
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
                    <span className="absolute inset-x-[-6%] top-[76%] mx-auto block w-max max-w-[118%] truncate rounded-full bg-white px-2 py-0.5 text-center text-[11px] font-extrabold text-rose-500 shadow ring-2 ring-pink-200 sm:text-sm">{p.name}</span>
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

      <div className="mt-3 flex flex-col gap-2">
        {n < 2 ? <BigButton onClick={reset}>เริ่มใหม่ทุกคน</BigButton>
          : <BigButton onClick={start} disabled={phase === 'float'}>{phase === 'float' ? (canTap ? 'แตะลูกโป่งได้เลย!' : 'ลูกโป่งกำลังแตก...') : phase === 'done' ? 'ปล่อยลูกโป่งอีกรอบ' : 'ปล่อยลูกโป่ง!'}</BigButton>}
        <p className="text-center text-xs text-rose-900/60">ลูกโป่งแตกทีละลูก ลูกสุดท้ายที่เหลืออยู่คือคนที่ถูกเลือก</p>
        {popped.length > 0 && (
          <ol className="flex flex-wrap justify-center gap-1.5" aria-label="ลำดับที่แตก">
            {popped.map((id, k) => {
              const p = roster.find((x) => x.id === id)
              return (
                <li key={id} className="pop flex items-center gap-1 rounded-full bg-white py-0.5 pl-1 pr-3 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-pink-100">
                  <span className="w-7"><Animal animal={p.animal} /></span><span className="text-pink-400">{k + 1}</span>{p.name}
                </li>
              )
            })}
          </ol>
        )}
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
        <span className="pop-text absolute -left-6 -top-14 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-sm font-extrabold text-rose-500 shadow ring-2 ring-pink-200">ป๊อป!</span>
      </div>
      <div className="cute-fall pointer-events-none absolute z-[5]" style={{ left: `${x}%`, top: `${top - 4}%`, width: `${bw * 0.78}%` }}>
        <Animal animal={animal} />
        <span className="absolute -right-3 -top-3 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-xs font-extrabold text-sky-500 shadow ring-2 ring-sky-100">ปุ๊ง~ ฮือ</span>
      </div>
    </>
  )
}
