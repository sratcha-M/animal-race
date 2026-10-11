import { useEffect, useMemo, useRef, useState } from 'react'
import { Shell, BigButton, ResultModal } from './MiniShell'
import { rand, sleep, shuffle } from '../lib/rand'
import { beep, fanfare } from '../lib/sound'

const COLORS = ['#ff6b8b', '#ffc233', '#4cc3ff', '#5fd68a', '#b08cff', '#ff9a5c', '#f58bd0', '#46d1c9']

export default function Balloon({ players, onBack }) {
  const roster = useMemo(() => players.map((p, i) => ({ ...p, num: i + 1 })), [players])
  const [outIds, setOutIds] = useState([])
  const alive = roster.filter((p) => !outIds.includes(p.id))
  const n = alive.length
  const [phase, setPhase] = useState('ready') // ready | float | done
  const [popped, setPopped] = useState([])    // ลำดับที่แตก
  const [winner, setWinner] = useState(null)
  const [modal, setModal] = useState(false)
  const run = useRef(0)
  const heights = useMemo(() => alive.map(() => rand(12, 34)), [phase, n]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { run.current = -1 }, [])

  const start = async () => {
    const id = ++run.current
    setPhase('float'); setPopped([]); setWinner(null)
    const order = shuffle(alive)
    const ok = () => run.current === id
    await sleep(2200)
    for (let i = 0; i < order.length - 1; i++) {
      if (!ok()) return
      const left = order.length - i
      await sleep(left <= 2 ? rand(2800, 3800) : rand(1100, 2200))
      if (!ok()) return
      beep(1100, 0.05, 'square', 0.07); beep(260, 0.18, 'sawtooth', 0.06)
      setPopped((p) => [...p, order[i]])
    }
    const last = order[order.length - 1]
    await sleep(1000)
    if (!ok()) return
    setWinner(last); setPhase('done'); fanfare()
    await sleep(1400)
    if (ok()) setModal(true)
  }

  const again = () => { run.current++; setModal(false); setPhase('ready'); setPopped([]); setWinner(null) }
  const eliminate = () => { const w = winner; again(); setOutIds((o) => [...o, w.id]) }
  const reset = () => { setOutIds([]); again() }
  const poppedIds = popped.map((p) => p.id)

  return (
    <Shell title="ลูกโป่งแตก" right={`${n} ลูก`} onBack={() => { run.current = -1; onBack() }}>
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl border-[10px] border-sky-300 bg-gradient-to-b from-sky-200 via-sky-100 to-white shadow-xl">
        <div className="absolute -left-4 top-[16%] h-6 w-24 rounded-full bg-white/80" />
        <div className="absolute right-4 top-[8%] h-5 w-20 rounded-full bg-white/80" />
        {alive.map((p, i) => {
          const isPopped = poppedIds.includes(p.id)
          const isWinner = winner?.id === p.id
          const x = ((i + 0.5) / n) * 100
          const floating = phase !== 'ready'
          const bottom = isWinner ? 38 : floating ? 40 + heights[i] : 8
          return (
            <div key={p.id} className="absolute" style={{
              left: `${isWinner ? 50 : x}%`, bottom: `${bottom}%`, width: `${Math.min(26, 80 / n + 6)}%`,
              transform: `translateX(-50%) scale(${isWinner ? 1.5 : 1})`,
              transition: 'bottom 2.4s ease-out, left 1s ease-in-out, transform 1s ease-out, opacity .15s',
              opacity: isPopped ? 0 : 1, zIndex: isWinner ? 5 : 1, pointerEvents: 'none',
            }}>
              <div className={`relative ${floating && !isWinner ? 'balloon-bob' : ''}`} style={{ animationDelay: `${i * -0.45}s`, animationDuration: `${1.8 + (i % 3) * 0.5}s` }}>
                <svg viewBox="0 0 100 130" className="w-full overflow-visible" aria-hidden="true">
                  <path d="M50 118 Q42 128 50 138 M50 118 Q58 128 50 138" stroke="#94a3b8" strokeWidth="2" fill="none" />
                  <path d="M50 4 C86 4 94 40 80 66 C72 82 60 92 50 100 C40 92 28 82 20 66 C6 40 14 4 50 4 Z" fill={COLORS[i % COLORS.length]} />
                  <path d="M44 100 L50 108 L56 100 Z" fill={COLORS[i % COLORS.length]} />
                  <ellipse cx="32" cy="28" rx="9" ry="14" fill="#fff" opacity=".45" transform="rotate(20 32 28)" />
                </svg>
                <div className="absolute inset-x-0 top-[26%] truncate px-1 text-center text-[11px] font-extrabold text-white [text-shadow:0_1px_2px_rgba(0,0,0,.45)] sm:text-sm">{p.name}</div>
              </div>
              {isPopped && <div className="burst absolute left-1/2 top-[30%] h-12 w-12 -translate-x-1/2 rounded-full border-4 border-amber-300" />}
            </div>
          )
        })}
        <div className="absolute inset-x-0 bottom-0 h-[6%] bg-emerald-300/70" />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {n < 2 ? <BigButton onClick={reset}>เริ่มใหม่ทุกคน</BigButton>
          : <BigButton onClick={start} disabled={phase === 'float'}>{phase === 'float' ? 'ลูกโป่งกำลังแตก...' : phase === 'done' ? 'ปล่อยลูกโป่งอีกรอบ' : 'ปล่อยลูกโป่ง!'}</BigButton>}
        <p className="text-center text-xs text-rose-900/60">ลูกโป่งแตกไปทีละลูก ลูกสุดท้ายที่เหลืออยู่คือคนที่ถูกเลือก</p>
        {popped.length > 0 && <p className="text-center text-sm text-slate-600">แตกไปแล้ว: {popped.map((p) => p.name).join(' → ')}</p>}
      </div>

      {modal && winner && <ResultModal label="ลูกสุดท้ายที่รอด" winner={winner} n={n} againLabel="ปล่อยอีกรอบ" onAgain={again} onEliminate={eliminate} onBack={onBack} />}
    </Shell>
  )
}
