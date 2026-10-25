import { useEffect, useRef, useState } from 'react'
import Animal from './Animal'
import { AI_BG } from '../lib/aiArt'
import { useGameLoop } from '../hooks/useGameLoop'
import { initRace, stepRace, isRaceOver, results } from '../game/logic'
import { COUNTDOWN_FROM } from '../game/constants'
import { beep, fanfare } from '../lib/sound'

const CAT_W = 'var(--cat-w)'
const leftFor = (p) => `calc(${(p * 100).toFixed(3)}% - ${p.toFixed(4)} * ${CAT_W})`
const RANK_STYLE = ['bg-amber-400 text-[#24405a]', 'bg-slate-300 text-slate-800', 'bg-orange-300 text-orange-950']

export default function Race({ players, round = 1, eliminating = false, onFinish, onQuit }) {
  const race = useRef(null)
  if (!race.current) race.current = initRace(players)
  const catEls = useRef([])
  const [phase, setPhase] = useState('countdown') // countdown | running | paused | done
  const [count, setCount] = useState(COUNTDOWN_FROM)
  const [ranks, setRanks] = useState({}) // index -> อันดับ
  const [leader, setLeader] = useState(null)

  // นับถอยหลัง 3-2-1-ออกตัว!
  useEffect(() => {
    if (phase !== 'countdown') return
    if (count === 0) {
      beep(990, 0.35)
      const t = setTimeout(() => setPhase('running'), 450)
      return () => clearTimeout(t)
    }
    beep(560, 0.15)
    const t = setTimeout(() => setCount((c) => c - 1), 750)
    return () => clearTimeout(t)
  }, [phase, count])

  // หยุดชั่วคราวด้วย Esc / P
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setPhase((p) => (p === 'running' ? 'paused' : p === 'paused' ? 'running' : p))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const lastLeader = useRef(null)
  const bubbleEls = useRef([])
  const trackEl = useRef(null)
  const lastAnn = useRef(null)
  const [announce, setAnnounce] = useState(null)
  useGameLoop((dt) => {
    const r = race.current
    const finished = stepRace(r, dt)
    r.cats.forEach((h, i) => {
      const el = catEls.current[i]
      if (!el) return
      el.style.left = leftFor(h.pos)
      const ev = h.event ?? ''
      if (el.dataset.event !== ev) {
        if (ev === 'turbo') beep(880, 0.08, 'sawtooth', 0.03)
        if (ev === 'trip') beep(180, 0.15, 'square', 0.04)
        el.dataset.event = ev
      }
      const b = bubbleEls.current[i]
      if (b && b.dataset.text !== h.bubble) {
        b.dataset.text = h.bubble
        b.textContent = h.bubble
        b.style.display = h.bubble ? '' : 'none'
        // ใกล้เส้นชัยให้ป๊อปอัปไปอยู่ด้านซ้าย จะได้ไม่ล้นจอ
        const flip = h.pos > 0.6
        b.style.left = flip ? 'auto' : '85%'
        b.style.right = flip ? '85%' : 'auto'
      }
    })
    if (trackEl.current) trackEl.current.dataset.slowmo = r.timeScale < 0.75 ? '1' : ''
    const ann = r.announce?.text ?? null
    if (ann !== lastAnn.current) { lastAnn.current = ann; setAnnounce(ann) }
    // ตัวที่นำอยู่ (ยังไม่เข้าเส้น)
    let lead = 0
    r.cats.forEach((h, i) => { if (h.pos > r.cats[lead].pos) lead = i })
    if (lead !== lastLeader.current) { lastLeader.current = lead; setLeader(lead) }

    if (finished.length) {
      if (r.order.length === finished.length) fanfare() // ตัวแรกเข้าเส้นชัย
      else beep(740, 0.1, 'triangle')
      setRanks(Object.fromEntries(r.order.map((idx, k) => [idx, k + 1])))
    }
    if (isRaceOver(r)) {
      setPhase('done')
      setTimeout(() => onFinish(results(r)), 1400)
    }
  }, phase === 'running')

  const r = race.current
  return (
    <div className="flex min-h-full flex-col">
      {/* แถบบน */}
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <button onClick={onQuit} className="t-btn t-ghost shrink-0 px-3 py-1 text-sm">← กลับ</button>
        <h2 className="booth-title min-w-0 truncate text-2xl text-[#24405a] sm:text-3xl">{eliminating ? `รอบที่ ${round} · เหลือ ${players.length} คน` : 'สัตว์น้อยวิ่งแข่ง'}</h2>
        <button
          onClick={() => setPhase((p) => (p === 'running' ? 'paused' : p === 'paused' ? 'running' : p))}
          disabled={phase !== 'running' && phase !== 'paused'}
          className="t-btn t-ghost shrink-0 px-3 py-1 text-sm"
        >
          {phase === 'paused' ? '▶ เล่นต่อ' : '❚❚ หยุด'}
        </button>
      </div>

      {/* สนาม */}
      <div ref={trackEl} className="track relative mx-2 flex flex-1 flex-col overflow-hidden rounded-3xl border-4 border-[#24405a] bg-gradient-to-b from-[#bfe6ff] via-[#dff3ff] to-[#fff0f6] shadow-[0_8px_0_#24405a] sm:mx-4">
        {AI_BG && <img src={AI_BG} alt="" className="pointer-events-none absolute inset-x-0 top-0 h-28 w-full object-cover object-[center_58%]" />}
        {/* ฉากหลังน่ารัก: เมฆ เนินเขา ดอกไม้ */}
        {!AI_BG && (
          <>
            {[{ t: 6, d: 38, s: 1 }, { t: 22, d: 52, s: 0.7, delay: -20 }, { t: 2, d: 64, s: 0.85, delay: -45 }].map((c, i) => (
              <svg key={i} viewBox="0 0 80 32" className="cloud pointer-events-none absolute left-0 w-24 opacity-90"
                   style={{ top: c.t, animationDuration: `${c.d}s`, animationDelay: `${c.delay ?? 0}s`, scale: c.s }} aria-hidden="true">
                <path d="M14 28 a10 10 0 0 1 2 -19 a14 14 0 0 1 26 -3 a11 11 0 0 1 20 6 a8 8 0 0 1 4 16 z" fill="#fff" />
              </svg>
            ))}
            <svg className="absolute inset-x-0 top-0 h-28 w-full" viewBox="0 0 400 70" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 55 Q60 22 130 48 T260 42 T400 46 V70 H0Z" fill="#c8eec0" />
              <path d="M0 62 Q90 40 180 60 T400 56 V70 H0Z" fill="#a6e3a1" />
            </svg>
            <div className="pointer-events-none absolute inset-x-0 top-[92px] flex justify-around text-base" aria-hidden="true">
              {Array.from({ length: 14 }, (_, i) => (
                <svg key={i} viewBox="0 0 20 20" className="h-4 w-4"><g fill={['#ff8fb0', '#ffd54d', '#c7a6ff', '#8fd3ff'][i % 4]}>
                  {[0, 72, 144, 216, 288].map((r) => <circle key={r} cx="10" cy="5" r="4" transform={`rotate(${r} 10 10)`} />)}
                </g><circle cx="10" cy="10" r="3" fill="#fff6c9" /></svg>
              ))}
            </div>
          </>
        )}
        <div className="stripe-lanes relative mt-28 flex flex-1 flex-col border-t-[6px] border-white bg-[#ffdcae] px-2 pb-3 pt-2 sm:px-4"
             style={{ '--cat-w': `clamp(70px, min(17vw, calc((100dvh - 260px) / ${r.cats.length} * 1.15)), 140px)` }}>
          {/* เส้นชัย */}
          <div className="checker-pastel absolute bottom-0 top-0 z-10 w-3" style={{ right: 'calc(var(--cat-w) * 0.08 + 12px)' }} />
          <div className="absolute -top-[6px] z-10 -translate-y-full rounded-t-lg bg-[#ff6f91] px-2 py-0.5 text-xs font-bold text-white"
               style={{ right: 'calc(var(--cat-w) * 0.08 + 2px)' }}>เส้นชัย</div>
          {/* เส้นปล่อยตัว */}
          <div className="absolute bottom-0 top-0 z-10 w-1 bg-white/90" style={{ left: 'calc(var(--cat-w) + 10px)' }} />

          {r.cats.map((h, i) => (
            <div key={h.id} className="lane relative flex-1 border-b-2 border-dashed border-white/70 last:border-b-0"
                 style={{ minHeight: 'calc(var(--cat-w) * 0.7 + 16px)' }}>
              <div className="lane-bg absolute inset-0 rounded-md" />
              <div ref={(el) => (catEls.current[i] = el)} className="racer absolute z-20 top-1/2 -translate-y-[42%]"
                   style={{ left: leftFor(0), width: CAT_W }}>
                <div className="relative">
                  <Animal animal={h.animal} number={h.num ?? i + 1} running={phase === 'running' && !(i in ranks)} />
                  <span className="dust pointer-events-none absolute -left-2 bottom-1 h-3 w-5 rounded-full bg-white/90" />
                  <span className="speed-lines pointer-events-none absolute -left-[45%] top-[30%] h-[40%] w-[50%]" />
                  <span className="zzz pointer-events-none absolute -top-2 right-0 text-sm font-extrabold text-indigo-400">z Z</span>
                  {/* คำพูดของสัตว์ */}
                  <div ref={(el) => (bubbleEls.current[i] = el)} style={{ display: 'none' }}
                       className="bubble absolute top-0 z-20 -translate-y-1/2 whitespace-nowrap rounded-xl bg-white px-2 py-0.5 text-[11px] font-bold text-[#e0466e] shadow-md ring-2 ring-[#24405a]/20 sm:text-sm" />
                  {/* ป้ายชื่อ */}
                  <div className={`absolute -top-1 left-1/2 max-w-[160%] -translate-x-1/2 -translate-y-full truncate whitespace-nowrap rounded-full border-2 border-[#24405a] px-2 py-0.5 text-xs font-bold sm:text-sm ${
                    leader === i && phase !== 'countdown' && !(i in ranks) ? 'bg-[#ff6f91] text-white' : 'bg-white text-[#24405a]'}`}>
                    {h.name}
                  </div>
                  {i in ranks && (
                    <div className={`pop absolute -right-3 top-0 grid h-8 w-8 place-items-center rounded-full text-sm font-extrabold shadow ${RANK_STYLE[ranks[i] - 1] ?? 'bg-white text-slate-700'}`}>
                      {ranks[i]}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ประกาศกลางจอ */}
        {announce && phase === 'running' && (
          <div className="pointer-events-none absolute inset-x-0 top-[38%] z-30 grid place-items-center">
            <div key={announce} className="pop booth-title rounded-2xl border-4 border-[#24405a] bg-[#ff6f91] px-6 py-2 text-3xl text-white shadow-[0_6px_0_#24405a] sm:text-5xl">
              {announce}
            </div>
          </div>
        )}
        <div className="slowmo-badge pointer-events-none absolute right-3 top-3 z-30 rounded-full bg-indigo-500 px-3 py-1 text-sm font-bold text-white">
          สโลว์โมชัน
        </div>
        {/* นับถอยหลัง / หยุดชั่วคราว */}
        {(phase === 'countdown' || phase === 'paused') && (
          <div className="absolute inset-0 grid place-items-center bg-[#24405a]/20 backdrop-blur-[1px]">
            {phase === 'countdown' ? (
              <div key={count} className="pop text-8xl font-extrabold text-white drop-shadow-[0_4px_0_rgba(0,0,0,.25)] sm:text-9xl">
                {count > 0 ? count : 'ออกตัว!'}
              </div>
            ) : (
              <div className="t-modal pop px-8 py-6 text-center">
                <div className="booth-title text-3xl text-[#24405a]">หยุดชั่วคราว</div>
                <button onClick={() => setPhase('running')} className="t-btn t-pink mt-4 px-6 py-2 text-lg">
                  เล่นต่อ
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <p className="py-2 text-center text-xs text-[#4f6a82]">
        กด Esc หรือ P เพื่อหยุดชั่วคราว<span className="sm:hidden"> · หมุนจอแนวนอนจะเห็นตัวใหญ่ขึ้น</span>
      </p>
    </div>
  )
}
