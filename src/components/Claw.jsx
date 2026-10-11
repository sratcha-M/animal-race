import { useEffect, useMemo, useRef, useState } from 'react'
import Animal from './Animal'
import { animalById } from '../game/constants'
import { beep, fanfare } from '../lib/sound'

const rand = (a, b) => a + Math.random() * (b - a)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const HOME = { x: 62, y: 6 }          // ตำแหน่งก้ามปูตอนว่าง (% ของตู้)
const CHUTE_X = 11                     // ช่องรับตุ๊กตา (ซ้ายล่าง)
const AREA = [24, 96]                  // ช่วงแกน x ที่วางตุ๊กตา
const MAX_DROPS = 3                    // หลุดได้สูงสุดกี่ครั้ง ครั้งถัดไปคีบติดแน่

// จัดตุ๊กตาเป็น 1-2 แถว: แถวหน้าอยู่ล่างสุด แถวหลังสูงขึ้นและอยู่ด้านหลัง
function layout(n) {
  const cols = n <= 4 ? n : Math.ceil(n / 2)
  const w = Math.min(26, ((AREA[1] - AREA[0]) / cols) * 1.3)
  return Array.from({ length: n }, (_, i) => {
    const back = n > 4 && i % 2 === 1
    const col = n <= 4 ? i : Math.floor(i / 2)
    const rowCols = cols
    const x = AREA[0] + ((col + 0.5 + (back ? 0.5 : 0)) / (rowCols + (n > 4 ? 0.5 : 0))) * (AREA[1] - AREA[0])
    const top = 96 - w * 0.58 - 6 - (back ? 13 : 0)
    return { x, top, w, z: back ? 1 : 2, tilt: rand(-7, 7) }
  })
}

export default function Claw({ players, onBack }) {
  const roster = useMemo(() => players.map((p, i) => ({ ...p, num: i + 1 })), [players])
  const [outIds, setOutIds] = useState([])            // คนที่ถูกคีบออกไปแล้ว (โหมดคัดออก)
  const remaining = roster.filter((p) => !outIds.includes(p.id))
  const pos = useMemo(() => layout(remaining.length), [remaining.length]) // eslint-disable-line react-hooks/exhaustive-deps
  const [claw, setClaw] = useState({ ...HOME, open: true, dur: 0, wobble: false })
  const [carry, setCarry] = useState(null)             // id ตุ๊กตาที่ก้ามปูถืออยู่
  const [gone, setGone] = useState(null)               // id ตุ๊กตาที่ตกลงช่องรับแล้ว
  const [phase, setPhase] = useState('ready')          // ready | play | done
  const [msg, setMsg] = useState('')
  const [winner, setWinner] = useState(null)
  const [drops, setDrops] = useState(0)
  const [picked, setPicked] = useState([])             // ลำดับคนที่ถูกคีบ (โหมดคัดออก)
  const run = useRef(0)

  useEffect(() => () => { run.current = -1 }, [])

  const move = async (patch, ms, id) => {
    setClaw((c) => ({ ...c, ...patch, dur: ms }))
    await sleep(ms + 60)
    if (run.current !== id) throw new Error('cancel')
  }

  const start = async () => {
    const id = ++run.current
    setPhase('play'); setWinner(null); setGone(null); setCarry(null); setDrops(0)
    const list = remaining
    const spots = pos
    try {
      setMsg('ก้ามปูกำลังเล็ง...')
      // เล็งส่ายไปมา ไม่รู้ว่าจะลงที่ตัวไหน
      for (let k = 0; k < 3; k++) {
        beep(300 + k * 60, 0.08, 'triangle', 0.05)
        await move({ x: rand(AREA[0], AREA[1]), open: true }, rand(500, 800), id)
      }
      let lost = 0
      for (;;) {
        const i = Math.floor(Math.random() * list.length)
        const t = spots[i]
        const target = list[i]
        setMsg('ก้ามปูกำลังเล็ง...')
        await move({ x: t.x, y: HOME.y, open: true }, 750, id)
        await sleep(350)
        setMsg('ลงไปแล้ว!')
        beep(220, 0.15, 'sawtooth', 0.04)
        await move({ y: t.top - 9 }, 900, id)
        await sleep(250)
        await move({ open: false }, 450, id)
        beep(520, 0.1, 'square', 0.05)
        setCarry(target.id)
        setMsg('คีบติดแล้ว ลุ้น...')
        await sleep(250)
        // ยกขึ้น: อาจหลุดกลางทาง
        const slip = lost < MAX_DROPS && Math.random() < 0.55
        if (slip) {
          const stopY = rand(HOME.y + 22, t.top - 24)
          await move({ y: stopY }, 800, id)
          setClaw((c) => ({ ...c, wobble: true }))
          await sleep(650)
          setClaw((c) => ({ ...c, wobble: false, open: true }))
          setCarry(null)
          lost++
          setDrops(lost)
          beep(180, 0.3, 'sawtooth', 0.06)
          setMsg(`โอ๊ะ หลุด! (${lost})`)
          await sleep(900)
          await move({ y: HOME.y }, 700, id)
          continue
        }
        await move({ y: HOME.y }, 900, id)
        setMsg('ได้แล้ว! กำลังพาไปช่องรับ')
        await move({ x: CHUTE_X }, 1100, id)
        await sleep(250)
        setClaw((c) => ({ ...c, open: true }))
        setCarry(null); setGone(target.id)
        beep(784, 0.15, 'triangle', 0.07)
        await sleep(800)
        await move({ x: HOME.x }, 700, id)
        fanfare()
        setWinner(target); setPicked((p) => [...p, target])
        setPhase('done'); setMsg('')
        return
      }
    } catch { /* ยกเลิกกลางคัน */ }
  }

  const again = () => { setGone(null); setWinner(null); setPhase('ready'); setMsg('') }
  const eliminate = () => { setOutIds((o) => [...o, winner.id]); setGone(null); setWinner(null); setPhase('ready'); setMsg('') }
  const reset = () => { setOutIds([]); setPicked([]); again() }
  const n = remaining.length

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-4">
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => { run.current = -1; onBack() }} className="rounded-lg px-3 py-1.5 text-rose-700 hover:bg-white/70">← กลับ</button>
        <h2 className="text-xl font-extrabold text-rose-500">ตู้คีบตุ๊กตา</h2>
        <span className="w-16 text-right text-xs text-rose-900/60">{n} ตัว</span>
      </div>

      {/* ตู้ */}
      <div className="relative aspect-[4/5] w-full select-none overflow-hidden rounded-3xl border-[10px] border-pink-400 bg-gradient-to-b from-sky-100 via-sky-50 to-amber-100 shadow-xl">
        <div className="absolute inset-x-0 top-0 h-[4%] bg-pink-300/80" />
        {/* ช่องรับ */}
        <div className="absolute bottom-0 left-0 z-[3] flex h-[22%] w-[20%] items-end justify-center rounded-tr-2xl bg-slate-700/90 pb-1 text-[10px] font-bold text-white">ช่องรับ</div>
        <div className="absolute inset-x-0 bottom-0 h-[3%] bg-pink-400/60" />

        {/* ตุ๊กตา */}
        {remaining.map((p, i) => {
          const s = pos[i]
          if (!s) return null
          const held = carry === p.id
          const isGone = gone === p.id
          const left = held ? claw.x : isGone ? CHUTE_X : s.x
          const top = held ? claw.y + 7 : isGone ? 80 : s.top
          const ms = held ? claw.dur : isGone ? 700 : 600
          return (
            <div key={p.id}
                 className="absolute"
                 style={{
                   left: `${left}%`, top: `${top}%`, width: `${s.w}%`, zIndex: held ? 6 : isGone ? 2 : s.z + 3,
                   transform: `translateX(-50%) rotate(${held ? 0 : s.tilt}deg)`,
                   transition: `left ${ms}ms ease-in-out, top ${ms}ms ${held ? 'ease-in-out' : 'cubic-bezier(.5,0,.9,.6)'}, transform .3s`,
                   opacity: isGone ? 0 : 1,
                 }}>
              <Animal animal={p.animal} />
              <div className="absolute inset-x-[6%] -bottom-[6%] truncate rounded-md bg-white/95 px-1 py-px text-center text-[10px] font-extrabold leading-tight text-rose-700 shadow ring-1 ring-rose-300 sm:text-xs">
                {p.name}
              </div>
            </div>
          )
        })}

        {/* สายเคเบิล + ก้ามปู */}
        <div className="absolute z-[5] w-[2px] -translate-x-1/2 bg-slate-500"
             style={{ left: `${claw.x}%`, top: 0, height: `${claw.y + 1}%`, transition: `left ${claw.dur}ms ease-in-out, height ${claw.dur}ms ease-in-out` }} />
        <div className={`absolute z-[6] w-[17%] -translate-x-1/2 ${claw.wobble ? 'claw-wobble' : ''}`}
             style={{ left: `${claw.x}%`, top: `${claw.y}%`, transition: `left ${claw.dur}ms ease-in-out, top ${claw.dur}ms ease-in-out` }}>
          <ClawSvg open={claw.open} />
        </div>

        {phase !== 'ready' && msg && (
          <div className="absolute inset-x-0 top-[6%] z-[7] text-center">
            <span className="rounded-full bg-white/90 px-3 py-1 text-sm font-bold text-rose-600 shadow ring-1 ring-rose-200">{msg}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {n < 2 ? (
          <button onClick={reset} className="rounded-2xl bg-amber-400 px-6 py-4 text-2xl font-extrabold text-amber-950 shadow-lg hover:bg-amber-300 active:scale-95">เริ่มใหม่ทุกคน</button>
        ) : (
          <button onClick={start} disabled={phase === 'play'}
                  className="rounded-2xl bg-amber-400 px-6 py-4 text-2xl font-extrabold text-amber-950 shadow-lg shadow-amber-500/30 hover:bg-amber-300 active:scale-95 disabled:opacity-40">
            {phase === 'play' ? 'กำลังคีบ...' : 'คีบเลย!'}
          </button>
        )}
        <p className="text-center text-xs text-rose-900/60">ก้ามปูสุ่มคีบตุ๊กตา 1 ตัว บางทีคีบติดแล้วหลุดกลางทาง · ชื่อบนตุ๊กตาคือคนที่ถูกเลือก</p>
        {picked.length > 0 && (
          <p className="text-center text-sm text-slate-600">ถูกคีบแล้ว: {picked.map((p) => p.name).join(' → ')}</p>
        )}
        {drops > 0 && phase === 'play' && <p className="text-center text-sm text-rose-500">หลุดไปแล้ว {drops} ครั้ง</p>}
      </div>

      {phase === 'done' && winner && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-rose-950/30 p-4">
          <div className="pop w-full max-w-sm rounded-3xl bg-gradient-to-b from-amber-200 to-amber-50 p-6 text-center shadow-2xl ring-4 ring-amber-300">
            <div className="text-lg font-semibold text-amber-800">ก้ามปูคีบได้</div>
            <div className="float mx-auto w-44"><Animal animal={winner.animal} number={winner.num} running /></div>
            <h3 className="text-4xl font-extrabold text-amber-950">{winner.name}</h3>
            <p className="text-sm text-amber-900/70">{animalById(winner.animal).name}{drops > 0 ? ` · หลุดมา ${drops} ครั้งกว่าจะได้` : ' · คีบติดตั้งแต่ครั้งแรก!'}</p>
            <div className="mt-4 flex flex-col gap-2">
              <button onClick={again} className="rounded-xl bg-amber-400 px-4 py-3 text-lg font-extrabold text-amber-950 hover:bg-amber-300">คีบอีกรอบ</button>
              {n > 2 && (
                <button onClick={eliminate} className="rounded-xl bg-rose-500 px-4 py-3 text-lg font-bold text-white hover:bg-rose-600">
                  เอา {winner.name} ออก แล้วคีบต่อ (เหลือ {n - 1})
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

function ClawSvg({ open }) {
  const a = open ? 28 : 8
  return (
    <svg viewBox="0 0 100 90" className="w-full overflow-visible" aria-hidden="true">
      <rect x="40" y="0" width="20" height="14" rx="4" fill="#64748b" />
      <rect x="30" y="12" width="40" height="12" rx="5" fill="#94a3b8" />
      <g style={{ transformOrigin: '36px 22px', transform: `rotate(${a}deg)`, transition: 'transform .35s' }}>
        <path d="M36 22 L26 52 Q22 66 36 74" stroke="#64748b" strokeWidth="7" strokeLinecap="round" fill="none" />
      </g>
      <g style={{ transformOrigin: '64px 22px', transform: `rotate(${-a}deg)`, transition: 'transform .35s' }}>
        <path d="M64 22 L74 52 Q78 66 64 74" stroke="#64748b" strokeWidth="7" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  )
}
