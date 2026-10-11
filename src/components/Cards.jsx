import { useEffect, useMemo, useRef, useState } from 'react'
import { Shell, BigButton, ResultModal } from './MiniShell'
import Animal from './Animal'
import { randInt, shuffle, sleep } from '../lib/rand'
import { beep, fanfare } from '../lib/sound'
import { useMiniNet } from '../lib/useMiniNet'

const MODES = {
  pick: { label: 'สุ่มเลือก', desc: 'สลับไพ่ แล้วเปิดใบเดียว' },
  match: { label: 'จับคู่', desc: 'ชื่อละ 2 ใบ ความจำล้วน ๆ' },
}

export default function Cards({ players, onBack, onNet, registerHandler }) {
  const roster = useMemo(() => players.map((p, i) => ({ ...p, num: i + 1 })), [players])
  const [outIds, setOutIds] = useState([])
  const alive = roster.filter((p) => !outIds.includes(p.id))
  const n = alive.length
  const [mode, setMode] = useState('pick')
  const [deck, setDeck] = useState([])                // {id, p}
  const [slotOf, setSlotOf] = useState({})            // id -> ช่องที่วางอยู่
  const [up, setUp] = useState([])                    // id ที่หงายอยู่
  const [matched, setMatched] = useState([])
  const [phase, setPhase] = useState('ready')         // ready | show | shuffle | play | done
  const [attempts, setAttempts] = useState(0)
  const [winner, setWinner] = useState(null)
  const [modal, setModal] = useState(false)
  const busy = useRef(false)
  const run = useRef(0)
  useEffect(() => () => { run.current = -1 }, [])

  const m = deck.length || (mode === 'match' ? n * 2 : n)
  const cols = Math.min(4, m)
  const rows = Math.ceil(m / cols)

  const start = async () => {
    const id = ++run.current
    const ok = () => run.current === id
    const cards = alive.flatMap((p) => (mode === 'match' ? [{ id: `${p.id}a`, p }, { id: `${p.id}b`, p }] : [{ id: `${p.id}a`, p }]))
    const base = Object.fromEntries(cards.map((c, i) => [c.id, i]))
    setDeck(cards); setSlotOf(base); setMatched([]); setAttempts(0); setWinner(null); setModal(false)
    setUp(cards.map((c) => c.id)); setPhase('show')
    busy.current = true
    await sleep(mode === 'match' ? 2600 : 2200); if (!ok()) return
    setUp([]); await sleep(700); if (!ok()) return
    setPhase('shuffle')
    let slots = { ...base }
    const ids = cards.map((c) => c.id)
    for (let k = 0; k < 14; k++) {
      const a = ids[randInt(ids.length)]
      let b = ids[randInt(ids.length)]
      while (b === a && ids.length > 1) b = ids[randInt(ids.length)]
      slots = { ...slots, [a]: slots[b], [b]: slots[a] }
      setSlotOf(slots); beep(260 + (k % 4) * 40, 0.04, 'triangle', 0.04)
      await sleep(360); if (!ok()) return
    }
    busy.current = false
    setPhase('play')
  }

  const flip = async (card) => {
    if (phase !== 'play' || busy.current || up.includes(card.id) || matched.includes(card.id)) return
    beep(600, 0.06, 'square', 0.05)
    if (mode === 'pick') {
      busy.current = true; setUp([card.id]); await sleep(1100)
      setWinner(card.p); setPhase('done'); fanfare(); setModal(true); return
    }
    const nowUp = [...up, card.id]
    setUp(nowUp)
    if (nowUp.length < 2) return
    busy.current = true; setAttempts((a) => a + 1)
    const [a, b] = nowUp.map((id) => deck.find((c) => c.id === id))
    await sleep(900)
    if (a.p.id === b.p.id) {
      beep(880, 0.15, 'triangle', 0.08)
      const mm = [...matched, a.id, b.id]
      setMatched(mm); setUp([])
      if (mm.length === deck.length) { setPhase('done'); fanfare(); setModal(true) }
    } else setUp([])
    busy.current = false
  }

  const again = () => { run.current++; busy.current = false; setModal(false); setPhase('ready'); setDeck([]); setUp([]); setMatched([]) }
  const eliminate = () => { const w = winner; again(); setOutIds((o) => [...o, w.id]) }
  const reset = () => { setOutIds([]); again() }

  const msg = { show: 'จำตำแหน่งไพ่ไว้!', shuffle: 'กำลังสลับไพ่...', play: mode === 'pick' ? 'เลือกไพ่มา 1 ใบ' : `เปิดไพ่ทีละ 2 ใบ · ครั้งที่ ${attempts}`, ready: '', done: '' }[phase]

  useMiniNet({ onNet, registerHandler },
    {
      mode, phase, cols, rows, attempts, winnerId: winner?.id ?? null,
      cards: deck.map((c) => {
        const faceUp = up.includes(c.id) || matched.includes(c.id)
        return { id: c.id, slot: slotOf[c.id] ?? 0, up: faceUp, matched: matched.includes(c.id), ...(faceUp ? { name: c.p.name, animal: c.p.animal } : {}) }
      }),
    },
    { 'cards-flip': (from, d) => { const c = deck.find((x) => x.id === d?.id); if (c) flip(c) } })

  return (
    <Shell title="ไพ่คว่ำ" right={`${n} คน`} onBack={() => { run.current = -1; onBack() }}>
      <div role="radiogroup" aria-label="โหมดไพ่" className="mb-3 grid grid-cols-2 gap-2">
        {Object.entries(MODES).map(([k, v]) => (
          <button key={k} onClick={() => { setMode(k); again() }} aria-pressed={mode === k} disabled={phase === 'show' || phase === 'shuffle'}
                  className={`rounded-xl px-2 py-2 font-semibold ring-1 transition ${mode === k ? 'bg-rose-500 text-white ring-rose-500' : 'bg-white text-rose-600 ring-rose-200'}`}>
            {v.label}<div className="text-[11px] font-normal opacity-80">{v.desc}</div>
          </button>
        ))}
      </div>

      <div className="relative mx-auto w-full rounded-3xl bg-emerald-600/90 p-2 shadow-xl ring-4 ring-emerald-800/30" style={{ perspective: 900 }}>
        <div className="relative w-full" style={{ aspectRatio: `${cols * 3} / ${rows * 4}`, minHeight: 160 }}>
          {deck.length === 0 && (
            <div className="absolute inset-0 grid place-items-center text-center text-sm font-semibold text-white/90">กดเริ่ม ไพ่ทุกใบจะหงายให้ดูก่อน<br />แล้วคว่ำและสลับตำแหน่ง</div>
          )}
          {deck.map((c) => {
            const s = slotOf[c.id] ?? 0
            const faceUp = up.includes(c.id) || matched.includes(c.id)
            return (
              <button key={c.id} onClick={() => flip(c)} aria-label={faceUp ? c.p.name : 'ไพ่คว่ำ'}
                      className="absolute p-[1.5%]"
                      style={{ left: `${(s % cols) * (100 / cols)}%`, top: `${Math.floor(s / cols) * (100 / rows)}%`, width: `${100 / cols}%`, height: `${100 / rows}%`, transition: 'left .32s ease-in-out, top .32s ease-in-out' }}>
                <div className="relative h-full w-full" style={{ transformStyle: 'preserve-3d', transition: 'transform .45s', transform: faceUp ? 'rotateY(180deg)' : 'none' }}>
                  <div className="absolute inset-0 grid place-items-center rounded-xl bg-rose-400 ring-2 ring-white" style={{ backfaceVisibility: 'hidden' }}>
                    <div className="grid h-[70%] w-[70%] place-items-center rounded-lg border-2 border-dashed border-white/70 text-2xl font-extrabold text-white/80">?</div>
                  </div>
                  <div className={`absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-xl bg-white px-0.5 ring-2 ${matched.includes(c.id) ? 'ring-amber-400' : 'ring-rose-200'}`}
                       style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                    <div className="w-[80%]"><Animal animal={c.p.animal} /></div>
                    <div className="max-w-full truncate px-1 text-[11px] font-extrabold text-rose-700 sm:text-sm">{c.p.name}</div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {msg && <p className="text-center text-lg font-extrabold text-rose-500">{msg}</p>}
        {n < 2 ? <BigButton onClick={reset}>เริ่มใหม่ทุกคน</BigButton>
          : (phase === 'ready' || phase === 'done') && <BigButton onClick={start}>{phase === 'done' ? 'เล่นอีกรอบ' : 'เริ่ม (หงายไพ่ให้ดู)'}</BigButton>}
      </div>

      {modal && mode === 'pick' && winner && <ResultModal label="ไพ่ที่เปิดคือ" winner={winner} n={n} againLabel="สลับไพ่อีกรอบ" onAgain={again} onEliminate={eliminate} onBack={onBack} />}
      {modal && mode === 'match' && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-rose-950/30 p-4">
          <div className="pop w-full max-w-sm rounded-3xl bg-gradient-to-b from-amber-200 to-amber-50 p-6 text-center shadow-2xl ring-4 ring-amber-300">
            <div className="text-4xl font-extrabold text-amber-950">จับคู่ครบแล้ว!</div>
            <p className="mt-2 text-lg text-amber-900">ใช้ไป {attempts} ครั้ง {attempts <= n + 1 ? '· ความจำเทพมาก' : attempts <= n * 2 ? '· ทำได้ดี' : '· ลองใหม่ได้เสมอ'}</p>
            <div className="mt-4 flex flex-col gap-2">
              <button onClick={again} className="rounded-xl bg-amber-400 px-4 py-3 text-lg font-extrabold text-amber-950 hover:bg-amber-300">เล่นอีกรอบ</button>
              <button onClick={onBack} className="rounded-xl px-4 py-2 text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50">แก้ไขผู้เล่น</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
