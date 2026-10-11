import { useEffect, useMemo, useRef, useState } from 'react'
import Animal from './Animal'
import BombSvg from './BombSvg'
import { animalById } from '../game/constants'
import { beep, boom, fanfare } from '../lib/sound'
import { load, save } from '../lib/storage'

// ความยาวชนวน (วินาที) — สุ่มในช่วงนี้ ไม่มีใครรู้ว่าจะระเบิดเมื่อไหร่
const FUSES = {
  short: { label: 'สั้น', range: [6, 15] },
  normal: { label: 'ปกติ', range: [12, 30] },
  long: { label: 'ยาว', range: [25, 60] },
}
const PENALTIES = [
  'ร้องเพลง 1 ท่อน', 'เต้นท่าไก่ 10 วินาที', 'ทำหน้าตลกให้ทุกคนดู', 'ชมคนทางซ้าย 3 ข้อ',
  'ทำเสียงสัตว์ที่ตัวเองเลือก', 'ยืนขาเดียว 15 วินาที', 'เล่าเรื่องน่าอายสั้น ๆ', 'พูดคำว่า "ตูม" แบบดราม่า',
  'ถ่ายรูปหน้าตลก 1 รูป', 'เลี้ยงขนมทุกคน (ล้อเล่นนะ... หรือเปล่า?)',
]
// วิธีส่งระเบิด: ส่งเอง / ออโต้สุ่มช้าเร็ว / ออโต้สม่ำเสมอ
const MODES = {
  manual: { label: 'ส่งเอง', desc: 'กดส่งต่อกันเอง' },
  random: { label: 'ออโต้ สุ่ม', desc: 'วนเอง ช้าบ้างเร็วบ้าง' },
  steady: { label: 'ออโต้ คงที่', desc: 'วนเองจังหวะเท่ากัน' },
}
const STEADY = { slow: { label: 'ช้า', sec: 1.0 }, mid: { label: 'กลาง', sec: 0.6 }, fast: { label: 'เร็ว', sec: 0.3 } }
const rand = (a, b) => a + Math.random() * (b - a)
// จังหวะสุ่ม: ส่วนใหญ่เร็ว บางทีช้า บางทีหยุดนิ่งให้ลุ้น
function randomGap() {
  const r = Math.random()
  if (r < 0.55) return rand(0.12, 0.35)
  if (r < 0.88) return rand(0.4, 0.9)
  return rand(1.0, 2.2)
}
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

export default function Bomb({ players, onBack, onNet, registerPass }) {
  const roster = useMemo(() => players.map((p, i) => ({ ...p, num: i + 1 })), [players])
  const [activeIds, setActiveIds] = useState(() => roster.map((p) => p.id))
  const active = roster.filter((p) => activeIds.includes(p.id))
  const [out, setOut] = useState([]) // คนที่โดนไปแล้ว (โหมดคัดออก)
  const [phase, setPhase] = useState('ready') // ready | live | boom | winner
  const [fuse, setFuse] = useState(() => load('animal-race:fuse', 'normal'))
  const [holder, setHolder] = useState(0) // index ใน active
  const [loser, setLoser] = useState(null)
  const [penalty, setPenalty] = useState('')
  const [passes, setPasses] = useState(0)
  const [losses, setLosses] = useState(() => load('animal-race:bomb-losses', {}))
  const bombRef = useRef(null)
  const timer = useRef({ total: 0, left: 0, nextTick: 0 })
  const lastPass = useRef(0)
  const holderRef = useRef(0)
  holderRef.current = holder

  useEffect(() => save('animal-race:fuse', fuse), [fuse])
  const [mode, setMode] = useState(() => load('animal-race:bomb-mode', 'manual'))
  const [speed, setSpeed] = useState(() => load('animal-race:bomb-speed', 'mid'))
  useEffect(() => save('animal-race:bomb-mode', mode), [mode])
  useEffect(() => save('animal-race:bomb-speed', speed), [speed])
  const auto = mode !== 'manual'

  const light = () => {
    const [a, b] = FUSES[fuse].range
    const total = rand(a, b)
    timer.current = { total, left: total, nextTick: 0, nextPass: mode === 'steady' ? STEADY[speed].sec : randomGap() }
    setHolder(Math.floor(Math.random() * active.length))
    setPasses(0)
    setLoser(null)
    setPhase('live')
    beep(300, 0.2, 'sawtooth', 0.05)
  }

  // นาฬิกาชนวน: ยิ่งใกล้ระเบิด เสียงติ๊กยิ่งถี่ ระเบิดยิ่งสั่น
  useEffect(() => {
    if (phase !== 'live') return
    let id
    let last = performance.now()
    const tick = (t) => {
      const dt = Math.min((t - last) / 1000, 0.1)
      last = t
      const T = timer.current
      T.left -= dt
      const progress = 1 - T.left / T.total
      // ไม่บอกเวลาตรง ๆ แต่ใบ้ด้วยจังหวะติ๊ก (สุ่มจังหวะนิดหน่อยให้เดายาก)
      // ออโต้: ระเบิดวนไปคนถัดไปเอง
      if (mode !== 'manual') {
        T.nextPass -= dt
        if (T.nextPass <= 0 && T.left > 0) {
          const nh = (holderRef.current + 1) % active.length
          holderRef.current = nh
          setHolder(nh)
          setPasses((k) => k + 1)
          beep(700 + Math.random() * 300, 0.05, 'triangle', 0.045)
          T.nextPass = mode === 'steady' ? STEADY[speed].sec : randomGap()
        }
      }
      T.nextTick -= dt
      if (T.nextTick <= 0) {
        beep(progress > 0.75 ? 1400 : 1100, 0.04, 'square', 0.035)
        T.nextTick = Math.max(0.12, 0.85 - progress * 0.75) * rand(0.85, 1.15)
      }
      if (bombRef.current) bombRef.current.style.setProperty('--pulse', `${Math.max(0.12, 0.7 - progress * 0.6)}s`)
      if (T.left <= 0) {
        const who = active[holderRef.current]
        boom()
        if (navigator.vibrate) try { navigator.vibrate([200, 80, 300]) } catch { /* ignore */ }
        const l = { ...losses, [who.name]: (losses[who.name] ?? 0) + 1 }
        setLosses(l); save('animal-race:bomb-losses', l)
        setLoser(who)
        setPenalty(pick(PENALTIES))
        setPhase('boom')
        return
      }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const passTo = (idx) => {
    if (phase !== 'live' || auto) return
    const now = performance.now()
    if (now - lastPass.current < 250) return // กันกดรัว
    if (idx === holder) return
    lastPass.current = now
    setHolder(idx)
    setPasses((n) => n + 1)
    beep(700 + Math.random() * 300, 0.06, 'triangle', 0.05)
  }
  const passNext = () => passTo((holder + 1) % active.length)

  // ห้องออนไลน์: เพื่อนที่ถือระเบิดกด "ส่งต่อ" จากมือถือตัวเอง
  const remotePass = useRef(null)
  remotePass.current = (fromId) => { if (phase === 'live' && active[holder]?.id === fromId) passNext() }
  useEffect(() => registerPass?.((fromId) => remotePass.current(fromId)), []) // eslint-disable-line react-hooks/exhaustive-deps
  // รายงานสถานะให้มือถือเพื่อน
  useEffect(() => {
    onNet?.({
      phase, passes, penalty, auto,
      holderId: phase === 'live' ? active[holder]?.id ?? null : null,
      loserId: loser?.id ?? null,
      activeIds,
      outIds: out.map((p) => p.id),
    })
  }, [phase, holder, loser, penalty, passes, activeIds, out]) // eslint-disable-line react-hooks/exhaustive-deps

  // ปุ่มลัด: Space / Enter = ส่งต่อ
  useEffect(() => {
    const onKey = (e) => {
      if (phase === 'live' && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); passNext() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const eliminate = () => {
    const rest = activeIds.filter((id) => id !== loser.id)
    setOut((o) => [...o, loser])
    setActiveIds(rest)
    if (rest.length <= 1) { setPhase('winner'); fanfare() } else setPhase('ready')
  }
  const restartAll = () => { setActiveIds(roster.map((p) => p.id)); setOut([]); setPhase('ready') }

  // ตำแหน่งผู้เล่นรอบวง
  const n = active.length
  const pos = (i, r = 40) => {
    const a = (-90 + (i * 360) / n) * (Math.PI / 180)
    return { left: 50 + r * Math.cos(a), top: 50 + r * Math.sin(a) }
  }
  const hp = pos(holder, 22)
  const holderP = active[holder]
  const nextP = active[(holder + 1) % n]
  const size = n <= 4 ? 22 : n <= 6 ? 19 : 16

  return (
    <div className={`flex min-h-full flex-col ${phase === 'boom' ? 'boom-shake' : ''}`}>
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <button onClick={onBack} className="rounded-lg px-3 py-1.5 text-rose-700 hover:bg-white/70">← กลับ</button>
        <h2 className="text-xl font-extrabold text-rose-600">
          ระเบิดเวลา{out.length > 0 && ` · เหลือ ${n} คน`}
        </h2>
        <span className="w-16 text-right text-sm text-rose-900/60 tabular-nums">{phase === 'live' ? `ส่ง ${passes}` : ''}</span>
      </div>

      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-4 pb-6">
        {/* สถานะ */}
        <div className="mb-2 h-10 text-center text-lg font-bold text-rose-700">
          {phase === 'ready' && 'เลือกวิธีส่งกับความยาวชนวน แล้วกดจุดชนวน!'}
          {phase === 'live' && <span className="pop inline-block" key={holder}>ระเบิดอยู่ที่ <span className="text-rose-500">{holderP?.name}</span>{auto ? '' : ' รีบส่ง!'}</span>}
        </div>

        {/* วงผู้เล่น */}
        <div className="relative aspect-square w-full max-w-[min(100%,62vh)]">
          <div className="absolute inset-[12%] rounded-full border-4 border-dashed border-rose-200 bg-white/50" />
          {active.map((p, i) => {
            const { left, top } = pos(i)
            const isHolder = phase === 'live' && i === holder
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => passTo(i)}
                disabled={phase !== 'live' || isHolder || auto}
                className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform ${isHolder ? 'holder z-10 scale-110' : phase === 'live' && !auto ? 'hover:scale-105' : ''}`}
                style={{ left: `${left}%`, top: `${top}%`, width: `${size}%` }}
                aria-label={`ส่งระเบิดให้ ${p.name}`}
              >
                <div className={`rounded-full p-1 ${isHolder ? 'bg-rose-200 ring-4 ring-rose-400' : ''}`}>
                  <Animal animal={p.animal} number={p.num} running={isHolder} />
                </div>
                <div className={`mx-auto mt-1 max-w-[140%] truncate rounded-full px-2 py-0.5 text-xs font-semibold shadow sm:text-sm ${isHolder ? 'bg-rose-500 text-white' : 'bg-white text-slate-700'}`}>
                  {p.name}
                </div>
              </button>
            )
          })}

          {/* ระเบิด */}
          {phase === 'live' && (
            <div ref={bombRef} className="bomb pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
                 style={{ left: `${hp.left}%`, top: `${hp.top}%`, width: '20%', transitionDuration: auto && (mode === 'random' || speed === 'fast') ? '.12s' : undefined }}>
              <BombSvg className="w-full drop-shadow-lg" />
            </div>
          )}
          {phase === 'ready' && (
            <div className="absolute left-1/2 top-1/2 w-[30%] -translate-x-1/2 -translate-y-1/2">
              <BombSvg className="float w-full drop-shadow-lg" />
            </div>
          )}
        </div>

        {/* ปุ่มควบคุม */}
        <div className="mt-4 w-full max-w-sm">
          {phase === 'ready' && (
            <div className="flex flex-col gap-3">
              <div className="text-sm font-semibold text-rose-700">วิธีส่งระเบิด</div>
              <div className="-mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="วิธีส่งระเบิด">
                {Object.entries(MODES).map(([k, m]) => (
                  <button key={k} type="button" onClick={() => setMode(k)} aria-pressed={mode === k}
                          className={`rounded-xl px-2 py-2 font-semibold ring-1 transition ${mode === k ? 'bg-sky-500 text-white ring-sky-500' : 'bg-white text-sky-700 ring-sky-200 hover:bg-sky-50'}`}>
                    {m.label}
                    <div className="text-[11px] font-normal opacity-80">{m.desc}</div>
                  </button>
                ))}
              </div>
              {mode === 'steady' && (
                <div className="-mt-1 flex items-center justify-center gap-2 text-sm" role="radiogroup" aria-label="ความเร็ว">
                  <span className="text-sky-800">ความเร็ว</span>
                  {Object.entries(STEADY).map(([k, v]) => (
                    <button key={k} type="button" onClick={() => setSpeed(k)} aria-pressed={speed === k}
                            className={`rounded-full px-3 py-1 font-semibold ring-1 ${speed === k ? 'bg-sky-500 text-white ring-sky-500' : 'bg-white text-sky-700 ring-sky-200'}`}>
                      {v.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="text-sm font-semibold text-rose-700">ความยาวชนวน</div>
              <div className="-mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="ความยาวชนวน">
                {Object.entries(FUSES).map(([k, f]) => (
                  <button key={k} type="button" onClick={() => setFuse(k)} aria-pressed={fuse === k}
                          className={`rounded-xl px-2 py-2 font-semibold ring-1 transition ${fuse === k ? 'bg-rose-500 text-white ring-rose-500' : 'bg-white text-rose-600 ring-rose-200 hover:bg-rose-50'}`}>
                    {f.label}
                    <div className="text-[11px] font-normal opacity-80">{f.range[0]}–{f.range[1]} วิ</div>
                  </button>
                ))}
              </div>
              <button onClick={light} disabled={n < 2}
                      className="rounded-2xl bg-amber-400 px-6 py-4 text-2xl font-extrabold text-amber-950 shadow-lg shadow-amber-500/30 hover:bg-amber-300 active:scale-95 disabled:opacity-40">
                จุดชนวน!
              </button>
              <p className="text-center text-xs text-rose-900/60">ไม่มีใครรู้ว่าระเบิดจะตูมตอนไหน · ฟังเสียงติ๊กให้ดี ยิ่งถี่ยิ่งใกล้!</p>
            </div>
          )}
          {phase === 'live' && auto && (
            <div className="rounded-2xl bg-white/80 px-4 py-4 text-center shadow ring-1 ring-sky-200">
              <div className="text-xl font-extrabold text-sky-700">ระเบิดกำลังวนเอง{mode === 'random' ? ' (สุ่มช้าเร็ว)' : ` (${STEADY[speed].label})`}</div>
              <div className="text-sm text-slate-500">ลุ้นอย่าให้มันหยุดที่คุณ!</div>
            </div>
          )}
          {phase === 'live' && !auto && (
            <div className="flex flex-col gap-2">
              <button onClick={passNext}
                      className="rounded-2xl bg-rose-500 px-6 py-5 text-2xl font-extrabold text-white shadow-lg shadow-rose-500/30 hover:bg-rose-600 active:scale-95">
                ส่งต่อให้ {nextP?.name} ➜
              </button>
              <p className="text-center text-xs text-rose-900/60">หรือแตะรูปเพื่อนเพื่อโยนให้ใครก็ได้ · คีย์บอร์ดกด Space</p>
            </div>
          )}
        </div>
      </div>

      {/* ตูม! */}
      {phase === 'boom' && loser && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-rose-950/40 p-4">
          <div className="boom-flash pointer-events-none fixed inset-0" />
          <div className="pop relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl ring-4 ring-orange-300">
            <div className="text-6xl font-extrabold text-orange-500 drop-shadow-[0_3px_0_#7c2d12]">ตูม!!</div>
            <div className="relative mx-auto mt-2 w-40">
              <div className="sooty"><Animal animal={loser.animal} number={loser.num} /></div>
              <BombSvg scared className="absolute -right-6 -top-4 w-14 rotate-12" />
            </div>
            <h3 className="mt-2 text-3xl font-extrabold text-slate-800">{loser.name} โดน!</h3>
            <p className="text-sm text-slate-500">{animalById(loser.animal).name} · โดนสะสม {losses[loser.name] ?? 1} ครั้ง · ส่งต่อกัน {passes} ครั้ง</p>
            <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-amber-900 ring-1 ring-amber-200">
              บทลงโทษ: <b>{penalty}</b>
              <button onClick={() => setPenalty(pick(PENALTIES))} className="ml-2 text-xs text-amber-700 underline">สุ่มใหม่</button>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {n - 1 >= 1 && (
                <button onClick={eliminate} className="rounded-xl bg-amber-400 px-4 py-3 text-lg font-extrabold text-amber-950 hover:bg-amber-300">
                  {n - 1 >= 2 ? `คัด ${loser.name} ออก แล้วเล่นต่อ (เหลือ ${n - 1} คน)` : `คัด ${loser.name} ออก → ประกาศผู้รอด`}
                </button>
              )}
              <button onClick={() => setPhase('ready')} className="rounded-xl bg-rose-500 px-4 py-3 text-lg font-bold text-white hover:bg-rose-600">
                เล่นอีกรอบ (ไม่คัดออก)
              </button>
              <button onClick={onBack} className="rounded-xl px-4 py-2 text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50">แก้ไขผู้เล่น</button>
            </div>
          </div>
        </div>
      )}

      {/* ผู้รอดคนสุดท้าย */}
      {phase === 'winner' && active[0] && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-rose-950/30 p-4">
          <div className="pop w-full max-w-sm rounded-3xl bg-gradient-to-b from-amber-200 to-amber-50 p-6 text-center shadow-2xl ring-4 ring-amber-300">
            <div className="text-lg font-semibold text-amber-800">ผู้รอดคนสุดท้าย</div>
            <div className="float mx-auto w-44"><Animal animal={active[0].animal} number={active[0].num} running /></div>
            <h3 className="text-4xl font-extrabold text-amber-950">{active[0].name}</h3>
            <ol className="mt-4 space-y-1 text-left text-sm">
              {out.map((p, i) => (
                <li key={p.id} className="flex items-center gap-2 rounded-lg bg-white/70 px-2 py-1">
                  <span className="w-14 shrink-0 text-rose-500">ตูมที่ {i + 1}</span>
                  <span className="w-8 shrink-0"><Animal animal={p.animal} /></span>
                  <span className="truncate font-semibold">{p.name}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 flex flex-col gap-2">
              <button onClick={restartAll} className="rounded-xl bg-amber-400 px-4 py-3 text-lg font-extrabold text-amber-950 hover:bg-amber-300">เล่นใหม่ทุกคน</button>
              <button onClick={onBack} className="rounded-xl px-4 py-2 text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50">แก้ไขผู้เล่น</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
