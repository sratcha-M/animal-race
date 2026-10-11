import { useEffect, useMemo, useRef, useState } from 'react'
import { Shell, BigButton } from './MiniShell'
import Animal from './Animal'
import { shuffle, pick, sleep } from '../lib/rand'
import { beep, fanfare } from '../lib/sound'
import { load, save } from '../lib/storage'

export const TIERS = {
  gold: { label: 'ทอง', color: '#f59e0b', light: '#fef3c7' },
  silver: { label: 'เงิน', color: '#94a3b8', light: '#f1f5f9' },
  bronze: { label: 'ทองแดง', color: '#b4683a', light: '#fde6d2' },
  none: { label: 'ไม่ได้รางวัล', color: '#64748b', light: '#f1f5f9' }, // ไข่เปล่า (โหมดรางวัลไม่ซ้ำและรางวัลไม่พอ)
}
const PASTELS = ['#ff8fab', '#8ed1fc', '#a0e3b0', '#c3a6ff', '#ffd166', '#ffb38a']
const DEFAULT_PRIZES = {
  gold: ['รางวัลใหญ่'],
  silver: ['รางวัลรอง'],
  bronze: ['รางวัลปลอบใจ'],
}
const KEY = 'animal-race:gacha-prizes'
const REPEAT_KEY = 'animal-race:gacha-repeat'
const TIERS_KEY = 'animal-race:gacha-tiers'
const BRONZE_KEY = 'animal-race:gacha-bronze' // ค่าเดิม (เปิด/ปิดทองแดงอย่างเดียว)
const ORDER = ['gold', 'silver', 'bronze'] // เรียงจากหายากไปธรรมดา
const MODES = {
  solo: { label: 'ทีละใบ', desc: 'เจ้าของห้องหมุนเอง' },
  all: { label: 'พร้อมกัน', desc: 'ทุกคนหมุนทีเดียว' },
  phones: { label: 'หมุนบนมือถือ', desc: 'เพื่อนหมุนเอง ผลขึ้นจอ' },
}

// รองรับค่าที่เคยบันทึกไว้แบบข้อความเดียวต่อระดับ
function loadPrizes() {
  const saved = load(KEY, {})
  return Object.fromEntries(Object.keys(DEFAULT_PRIZES).map((k) => {
    const v = Array.isArray(saved[k]) ? saved[k] : typeof saved[k] === 'string' ? [saved[k]] : DEFAULT_PRIZES[k]
    const list = v.map((t) => String(t).trim()).filter(Boolean)
    return [k, list.length ? list : DEFAULT_PRIZES[k]]
  }))
}
// สุ่มของรางวัลจากรายการของระดับนั้น ให้ซ้ำกันน้อยที่สุด
const parsePrizes = (text) => String(text).split(/[,;\n\r،、]+/).map((t) => t.trim().slice(0, 24)).filter(Boolean)
// สัดส่วนระดับของไข่ทั้งหมด (tiers เรียงจากหายากไปธรรมดา)
// 3 ระดับ = หายากสุด 1 ใบ / ระดับกลาง ~1 ใน 3 / ที่เหลือธรรมดา
// 2 ระดับ = หายาก ~1 ใน 3 (อย่างน้อย 1 ใบ) ที่เหลือธรรมดา · 1 ระดับ = ทุกใบเป็นระดับนั้น
function tierBag(n, tiers) {
  if (n < 1) return []
  if (tiers.length === 1) return Array(n).fill(tiers[0])
  if (tiers.length === 2) {
    const rare = Math.min(n, Math.max(1, Math.round(n / 3)))
    return shuffle([...Array(rare).fill(tiers[0]), ...Array(n - rare).fill(tiers[1])])
  }
  const mid = n >= 3 ? Math.max(1, Math.round(n / 3)) : 0
  return shuffle([tiers[0], ...Array(mid).fill(tiers[1]), ...Array(Math.max(0, n - 1 - mid)).fill(tiers[2])]).slice(0, n)
}
// ผลของไข่ n ใบ
// ซ้ำได้: แค่กำหนดระดับ แล้วสุ่มรางวัลจากรายการของระดับนั้นตอนเปิด (หลายคนได้รางวัลเดียวกันได้)
// ไม่ซ้ำ: เอารางวัลทุกอย่างของระดับที่เปิดใช้มารวมกัน สับ แล้วแจกรางวัลละ 1 ใบ ที่เหลือเป็นไข่เปล่า
function outcomes(n, tiers, prizes, repeat) {
  if (repeat) return tierBag(n, tiers).map((tier) => ({ tier }))
  const pool = shuffle(tiers.flatMap((tier) => prizes[tier].map((prize) => ({ tier, prize }))))
  return Array.from({ length: n }, (_, i) => pool[i] ?? { tier: 'none', prize: null })
}
const deal = (roster, out) => shuffle(roster).map((p, i) => ({ player: p, ...out[i], shell: pick(PASTELS) }))
function loadTiers() {
  const saved = load(TIERS_KEY, null)
  const on = ORDER.filter((k) => (saved ? saved[k] !== false : !(k === 'bronze' && load(BRONZE_KEY, true) === false)))
  return on.length ? on : ORDER
}

function Capsule({ shell, open, className = 'w-28' }) {
  return (
    <svg viewBox="0 0 100 100" className={`${className} overflow-visible`} aria-hidden="true">
      <path className={open ? 'cap-bot' : ''} d="M5 50 A45 45 0 0 0 95 50 Z" fill="#fff" stroke="#e5e7eb" strokeWidth="2" />
      <path className={open ? 'cap-top' : ''} d="M5 50 A45 45 0 0 1 95 50 Z" fill={shell} stroke="#fff" strokeWidth="2" />
    </svg>
  )
}

function ResultCard({ e, className = 'w-56' }) {
  const t = TIERS[e.tier]
  return (
    <div className={`pop rounded-2xl p-3 text-center shadow-xl ring-4 ${className}`}
         style={{ background: t.light, '--tw-ring-color': t.color, boxShadow: `0 0 28px ${t.color}` }}>
      <div className="text-sm font-extrabold" style={{ color: t.color }}>{e.tier === 'none' ? t.label : `ระดับ ${t.label}`}</div>
      <div className="mx-auto w-20"><Animal animal={e.player.animal} /></div>
      <div className="text-2xl font-extrabold text-slate-800">{e.player.name}</div>
      <div className="text-sm font-bold text-slate-700">{e.prize ?? 'ไข่เปล่า เสียใจด้วย'}</div>
    </div>
  )
}

function Machine({ rolling, left }) {
  return (
    <svg viewBox="0 0 200 240" className="w-full" aria-hidden="true">
      <circle cx="100" cy="86" r="76" fill="#e0f2fe" stroke="#f472b6" strokeWidth="6" />
      {Array.from({ length: Math.min(left, 12) }, (_, i) => {
        const ang = (i / Math.max(Math.min(left, 12), 1)) * Math.PI * 2 + 0.6
        const rr = 22 + (i % 3) * 18
        return <circle key={i} cx={100 + Math.cos(ang) * rr} cy={96 + Math.sin(ang) * rr * 0.8} r="15" fill={PASTELS[i % PASTELS.length]} stroke="#fff" strokeWidth="3" />
      })}
      <path d="M104 20 A76 76 0 0 1 176 70" stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" opacity=".7" />
      <rect x="30" y="150" width="140" height="70" rx="16" fill="#f472b6" />
      <circle cx="100" cy="180" r="20" fill="#fff" />
      <g className={rolling ? 'cranking' : ''} style={{ transformOrigin: '100px 180px' }}>
        <rect x="94" y="163" width="12" height="34" rx="5" fill="#f43f5e" />
      </g>
      <rect x="130" y="196" width="34" height="24" rx="6" fill="#9d174d" />
    </svg>
  )
}

// ไข่ที่กลิ้งออกมา / ไข่ที่เปิดแล้วมีการ์ดผลลอยขึ้น
function Stage({ s }) {
  return (
    <div className="relative flex flex-col items-center">
      {s.phase === 'open' && <div className="absolute bottom-8 z-10"><ResultCard e={s.e} /></div>}
      <div className={s.phase === 'egg' ? 'egg-out' : ''}><Capsule shell={s.e.shell} open={s.phase === 'open'} /></div>
      {s.phase === 'egg' && <div className="mt-1 text-sm font-bold text-rose-500">{s.e.player.name} หมุนได้ไข่!</div>}
    </div>
  )
}

export default function Gacha({ players, onBack, room, onNet, registerHandler }) {
  const roster = useMemo(() => players.map((p, i) => ({ ...p, num: i + 1 })), [players])
  const [mode, setMode] = useState('solo')
  const [prizes, setPrizes] = useState(loadPrizes)
  const [tiersOn, setTiersOn] = useState(loadTiers) // ระดับที่เปิดใช้ (เรียงหายาก→ธรรมดา)
  const [repeat, setRepeat] = useState(() => load(REPEAT_KEY, true) !== false) // รางวัลซ้ำกันได้ไหม
  const [sortBy, setSortBy] = useState('order') // เรียงผลที่ขึ้นด้านล่าง: order | name | tier
  const [draft, setDraft] = useState({ gold: '', silver: '', bronze: '' })
  const [opened, setOpened] = useState([])        // ผลที่เปิดแล้ว (ทุกโหมดใช้ร่วมกัน) แสดงด้านล่างทันที
  const [eggs, setEggs] = useState(() => deal(roster, outcomes(roster.length, tiersOn, prizes, repeat)))
  // ทีละใบ
  const [drawn, setDrawn] = useState(0)
  const [phase, setPhase] = useState('ready')     // ready | rolling | egg | open
  // พร้อมกัน
  const [allPhase, setAllPhase] = useState('ready') // ready | rolling | out
  // มือถือ
  const [spun, setSpun] = useState([])            // id ผู้เล่นที่หมุนแล้ว
  const [stage, setStage] = useState(null)        // { e, phase: 'egg' | 'open' }
  const bag = useRef(outcomes(roster.length, tiersOn, prizes, repeat))
  const queue = useRef([])
  const pumping = useRef(false)
  const alive = useRef(true)
  const timers = useRef([])
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms))
  useEffect(() => { alive.current = true; return () => { alive.current = false; timers.current.forEach(clearTimeout) } }, [])
  useEffect(() => save(KEY, prizes), [prizes])
  useEffect(() => save(REPEAT_KEY, repeat), [repeat])
  useEffect(() => save(TIERS_KEY, Object.fromEntries(ORDER.map((k) => [k, tiersOn.includes(k)]))), [tiersOn])

  const rosterRef = useRef(roster); rosterRef.current = roster
  const modeRef = useRef(mode); modeRef.current = mode
  const spunRef = useRef(spun); spunRef.current = spun
  const prizesRef = useRef(prizes); prizesRef.current = prizes
  const tiersRef = useRef(tiersOn); tiersRef.current = tiersOn
  const repeatRef = useRef(repeat); repeatRef.current = repeat

  const resetAll = (m = mode, tiers = tiersOn, rep = repeat) => {
    timers.current.forEach(clearTimeout); timers.current = []
    queue.current = []; pumping.current = false
    tiersRef.current = tiers; repeatRef.current = rep
    bag.current = outcomes(rosterRef.current.length, tiers, prizesRef.current, rep)
    setEggs(deal(rosterRef.current, outcomes(rosterRef.current.length, tiers, prizesRef.current, rep))); setRepeat(rep); setOpened([]); setDrawn(0); setPhase('ready'); setAllPhase('ready'); setSpun([]); setStage(null); setMode(m); setTiersOn(tiers)
  }

  // ---------- ทีละใบ ----------
  const left = eggs.length - drawn
  const current = eggs[drawn - 1]
  const turn = () => {
    if (left < 1 || phase !== 'ready') return
    setPhase('rolling')
    for (let k = 0; k < 6; k++) later(() => beep(300 + k * 40, 0.06, 'square', 0.05), k * 140)
    later(() => { setDrawn((d) => d + 1); setPhase('egg') }, 900)
  }
  const prizeOf = (e) => (e.tier === 'none' ? null : e.prize ?? pick(prizesRef.current[e.tier]))
  const openEgg = (e) => {
    const entry = { ...e, prize: prizeOf(e) }
    setOpened((o) => [...o, entry])
  }
  const openSolo = () => { openEgg(current); setPhase('open'); fanfare() }

  // ---------- พร้อมกัน ----------
  const spinAll = () => {
    setAllPhase('rolling')
    for (let k = 0; k < 8; k++) later(() => beep(300 + k * 35, 0.06, 'square', 0.05), k * 130)
    later(() => setAllPhase('out'), 1200)
  }
  const isOpen = (id) => opened.some((o) => o.player.id === id)
  const openOne = (e) => { if (!isOpen(e.player.id)) { openEgg(e); beep(760, 0.1, 'triangle', 0.07) } }
  const openAll = () => {
    eggs.filter((e) => !isOpen(e.player.id)).forEach((e, k, arr) => {
      later(() => { openEgg(e); beep(600 + k * 60, 0.1, 'triangle', 0.07); if (k === arr.length - 1) fanfare() }, k * 450)
    })
  }

  // ---------- หมุนบนมือถือ ----------
  const pump = async () => {
    if (pumping.current) return
    pumping.current = true
    while (queue.current.length && alive.current) {
      const e = queue.current.shift()
      setStage({ e, phase: 'egg' }); beep(420, 0.12, 'square', 0.06)
      await sleep(1500); if (!alive.current) return
      const entry = { ...e, prize: prizeOf(e) }
      setOpened((o) => [...o, entry]); setStage({ e: entry, phase: 'open' }); fanfare()
      await sleep(2800)
    }
    if (alive.current) setStage(null)
    pumping.current = false
  }
  const spinFor = (id) => {
    if (modeRef.current !== 'phones' || spunRef.current.includes(id)) return
    const p = rosterRef.current.find((x) => x.id === id)
    if (!p) return
    const out = bag.current.pop() ?? (repeatRef.current ? { tier: tiersRef.current[tiersRef.current.length - 1] } : { tier: 'none', prize: null })
    spunRef.current = [...spunRef.current, id]
    setSpun(spunRef.current)
    queue.current.push({ player: p, ...out, shell: pick(PASTELS) })
    pump()
  }
  const spinForRef = useRef(spinFor); spinForRef.current = spinFor
  useEffect(() => registerHandler?.('gacha-spin', (from) => spinForRef.current(from)), []) // eslint-disable-line react-hooks/exhaustive-deps

  // ส่งสถานะไปให้มือถือเพื่อน
  const results = useMemo(() => Object.fromEntries(opened.map((o) => [o.player.id, { tier: o.tier, prize: o.prize }])), [opened])
  useEffect(() => { onNet?.({ mode, spun, results }) }, [mode, spun, results]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => onNet?.(null), []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- ของรางวัล ----------
  // เพิ่มหลายรางวัลทีเดียว: คั่นด้วย , ; หรือขึ้นบรรทัดใหม่ เช่น "นอน,ลางาน,หยุด,เงิน" = 4 รางวัล
  const addPrize = (k, text = draft[k]) => {
    const fresh = []
    for (const t of parsePrizes(text)) if (!prizes[k].includes(t) && !fresh.includes(t)) fresh.push(t)
    if (fresh.length) setPrizes({ ...prizes, [k]: [...prizes[k], ...fresh] })
    setDraft({ ...draft, [k]: '' })
  }
  const removePrize = (k, i) => prizes[k].length > 1 && setPrizes({ ...prizes, [k]: prizes[k].filter((_, j) => j !== i) })

  const soloStage = (phase === 'egg' || phase === 'open') && current ? { e: phase === 'open' ? opened[opened.length - 1] ?? current : current, phase } : null
  const busy = phase !== 'ready' || stage
  const total = eggs.length
  const sortedResults = useMemo(() => {
    const th = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), 'th')
    const rank = (t) => (t === 'none' ? 9 : ORDER.indexOf(t))
    const list = [...opened]
    if (sortBy === 'name') list.sort((a, b) => th(a.player.name, b.player.name))
    if (sortBy === 'prize') list.sort((a, b) => th(a.prize, b.prize))
    if (sortBy === 'tier') list.sort((a, b) => rank(a.tier) - rank(b.tier) || th(a.player.name, b.player.name))
    return list
  }, [opened, sortBy])
  const waiting = roster.flatMap((p) => {
    const o = opened.find((x) => x.player.id === p.id)
    return !o ? [{ p, empty: false }] : o.tier === 'none' ? [{ p, empty: true }] : []
  })

  return (
    <Shell title="กาชาปอง" right={mode === 'solo' ? `เหลือ ${left} ไข่` : `${total} คน`} onBack={onBack}>
      <div role="radiogroup" aria-label="วิธีเล่น" className="mb-2 grid grid-cols-3 gap-1.5">
        {Object.entries(MODES).map(([k, v]) => (
          <button key={k} onClick={() => resetAll(k)} aria-pressed={mode === k} disabled={k === 'phones' && !room}
                  className={`rounded-xl px-1 py-1.5 text-sm font-bold ring-1 transition disabled:opacity-40 ${mode === k ? 'bg-rose-500 text-white ring-rose-500' : 'bg-white text-rose-600 ring-rose-200'}`}>
            {v.label}<div className="text-[10px] font-normal leading-tight opacity-80">{v.desc}</div>
          </button>
        ))}
      </div>
      {!room && <p className="mb-2 text-center text-xs text-rose-900/60">โหมด "หมุนบนมือถือ" ต้องเปิดห้องออนไลน์ก่อน (กดปุ่มเปิดห้องที่หน้าตั้งค่าผู้เล่น)</p>}

      {mode !== 'all' && (
        <div className="relative mx-auto mt-1 w-full max-w-[18rem]">
          <Machine rolling={phase === 'rolling'} left={mode === 'solo' ? left : roster.length - spun.length} />
        </div>
      )}

      {/* ====== ทีละใบ ====== */}
      {mode === 'solo' && (
        <>
          <div className="relative mx-auto -mt-1 grid h-52 w-full place-items-center">
            {phase === 'ready' && <p className="text-sm text-rose-900/60">{left > 0 ? 'กดหมุนตู้ ไข่จะกลิ้งออกมา' : 'ไข่หมดตู้แล้ว'}</p>}
            {phase === 'rolling' && <p className="text-sm font-bold text-rose-500">กำลังหมุน...</p>}
            {soloStage && <Stage s={soloStage} />}
          </div>
          <div className="flex flex-col gap-2">
            {phase === 'egg' && <BigButton onClick={openSolo}>เปิดไข่!</BigButton>}
            {phase === 'open' && left > 0 && <BigButton onClick={() => setPhase('ready')}>เก็บไข่ต่อไป</BigButton>}
            {phase === 'ready' && left > 0 && <BigButton onClick={turn}>หมุนตู้!</BigButton>}
            {(phase === 'ready' || phase === 'open') && left < 1 && <BigButton onClick={() => resetAll()}>สับไข่ใหม่</BigButton>}
          </div>
        </>
      )}

      {/* ====== พร้อมกัน ====== */}
      {mode === 'all' && (
        <>
          <div className="relative mx-auto w-full max-w-[14rem]"><Machine rolling={allPhase === 'rolling'} left={allPhase === 'ready' ? total : 0} /></div>
          {allPhase === 'out' && (
            <ul className="mt-2 grid grid-cols-2 gap-2" aria-label="ไข่ของแต่ละคน">
              {eggs.map((e, i) => {
                const o = opened.find((x) => x.player.id === e.player.id)
                return (
                  <li key={e.player.id} className="relative flex min-h-[9.5rem] flex-col items-center justify-end rounded-2xl bg-white/80 p-2 ring-1 ring-rose-100">
                    {o ? <ResultCard e={o} className="w-full" /> : (
                      <button onClick={() => openOne(e)} aria-label="เปิดไข่" className="egg-out flex flex-col items-center" style={{ animationDelay: `${i * 90}ms` }}>
                        <Capsule shell={e.shell} className="w-20" />
                        <span className="mt-1 text-xs font-bold text-rose-500">แตะเพื่อเปิด</span>
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          <div className="mt-3 flex flex-col gap-2">
            {allPhase === 'ready' && <BigButton onClick={spinAll}>ทุกคนหมุนพร้อมกัน!</BigButton>}
            {allPhase === 'rolling' && <p className="text-center font-bold text-rose-500">กำลังหมุน...</p>}
            {allPhase === 'out' && opened.length < total && <BigButton onClick={openAll}>เปิดไข่ทุกใบ</BigButton>}
            {allPhase === 'out' && opened.length >= total && <BigButton onClick={() => resetAll()}>หมุนใหม่ทุกคน</BigButton>}
          </div>
        </>
      )}

      {/* ====== หมุนบนมือถือ ====== */}
      {mode === 'phones' && (
        <>
          <div className="relative mx-auto -mt-1 grid h-52 w-full place-items-center">
            {!stage && <p className="px-4 text-center text-sm text-rose-900/60">{spun.length ? 'รอเพื่อนคนต่อไปหมุน...' : 'ให้เพื่อนกดหมุนกาชาปองที่มือถือของตัวเอง ผลจะขึ้นที่จอนี้'}</p>}
            {stage && <Stage s={stage} />}
          </div>
          <ul className="grid grid-cols-2 gap-1.5" aria-label="สถานะผู้เล่น">
            {roster.map((p) => {
              const did = spun.includes(p.id)
              return (
                <li key={p.id} className={`flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm ring-1 ${did ? 'bg-emerald-50 ring-emerald-200' : 'bg-white ring-rose-100'}`}>
                  <span className="w-7 shrink-0"><Animal animal={p.animal} /></span>
                  <span className="min-w-0 flex-1 truncate font-bold">{p.name}</span>
                  {did ? <span className="text-xs font-bold text-emerald-600">หมุนแล้ว</span>
                    : p.remote ? <span className="text-xs text-slate-400">รอหมุน</span>
                      : <button onClick={() => spinFor(p.id)} className="rounded-lg bg-amber-400 px-2 py-0.5 text-xs font-extrabold text-amber-950">หมุนให้</button>}
                </li>
              )
            })}
          </ul>
          {spun.length >= roster.length && !busy && <div className="mt-3"><BigButton onClick={() => resetAll()}>เริ่มรอบใหม่</BigButton></div>}
        </>
      )}

      {opened.length > 0 && (
        <div className="mt-4 flex items-center justify-between gap-2">
          <h3 className="font-extrabold text-rose-600">ผลรางวัล</h3>
          <label className="flex items-center gap-1.5 text-xs text-slate-600">เรียงตาม
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded-lg border border-rose-200 bg-white px-2 py-1 text-sm">
              <option value="order">ลำดับที่เปิด</option>
              <option value="name">ชื่อคน</option>
              <option value="prize">ชื่อรางวัล</option>
              <option value="tier">ระดับ</option>
            </select>
          </label>
        </div>
      )}
      {opened.length > 0 && (
        <ul className="mt-1.5 space-y-1 text-sm" aria-live="polite" aria-label="ผลที่เปิดแล้ว">
          {sortedResults.map((d, i) => (
            <li key={d.player.id} className="pop flex items-center gap-2 rounded-lg bg-white/90 px-3 py-2 ring-1 ring-rose-100">
              <span className="w-5 text-rose-400">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-base font-extrabold">{d.player.name}</span>
              <span className="rounded-full px-2 py-0.5 text-xs font-extrabold text-white" style={{ background: TIERS[d.tier].color }}>{TIERS[d.tier].label}</span>
              <span className="max-w-[40%] truncate text-xs text-slate-500">{d.prize ?? 'ไข่เปล่า'}</span>
            </li>
          ))}
        </ul>
      )}

      {/* คนที่ยังไม่ได้รางวัล: ไข่เปล่า + ยังไม่ได้เปิด */}
      {waiting.length > 0 && opened.length > 0 && (
        <section className="mt-3 rounded-xl bg-white/70 p-3 ring-1 ring-slate-200" aria-label="คนที่ยังไม่ได้รางวัล">
          <h3 className="mb-1.5 text-sm font-extrabold text-slate-600">ยังไม่ได้รางวัล ({waiting.length})</h3>
          <ul className="flex flex-wrap gap-1.5">
            {waiting.map(({ p, empty }) => (
              <li key={p.id} className={`rounded-full px-3 py-0.5 text-sm font-semibold ${empty ? 'bg-slate-200 text-slate-600' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>
                {p.name} <span className="text-xs font-normal">{empty ? 'ไข่เปล่า' : 'ยังไม่เปิด'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ของรางวัลแต่ละระดับ: เพิ่ม/ลบเองได้ และจำไว้ในเครื่องนี้สำหรับครั้งหน้า */}
      <section className="mt-5 rounded-2xl bg-white/80 p-3 ring-1 ring-rose-100">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-extrabold text-rose-600">ของรางวัล</h3>
          <span className="text-xs text-emerald-600">บันทึกอัตโนมัติในเครื่องนี้ ✓</span>
        </div>
        <label className="mb-3 flex items-start gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" className="mt-1" checked={repeat} onChange={(e) => resetAll(mode, tiersOn, e.target.checked)} />
          <span>ให้รางวัลซ้ำกันได้ <span className="block text-xs font-normal text-slate-500">ปิดไว้ = รางวัลแต่ละอย่างแจกได้แค่ 1 คน ถ้ารางวัลน้อยกว่าคน คนที่เหลือจะได้ไข่เปล่า (เปลี่ยนแล้วเริ่มรอบใหม่)</span></span>
        </label>
        <fieldset className="mb-3">
          <legend className="mb-1 text-sm font-semibold text-slate-700">ระดับที่ใช้ <span className="text-xs font-normal text-slate-500">(เปลี่ยนแล้วเริ่มรอบใหม่ · ต้องเหลืออย่างน้อย 1 ระดับ)</span></legend>
          <div className="flex flex-wrap gap-2">
            {ORDER.map((k) => {
              const on = tiersOn.includes(k)
              return (
                <label key={k} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ring-1" style={{ color: TIERS[k].color, background: on ? TIERS[k].light : '#fff', '--tw-ring-color': TIERS[k].color }}>
                  <input type="checkbox" checked={on} disabled={on && tiersOn.length === 1}
                         onChange={() => resetAll(mode, ORDER.filter((x) => (x === k ? !on : tiersOn.includes(x))))} />
                  {TIERS[k].label}
                </label>
              )
            })}
          </div>
        </fieldset>
        {tiersOn.map((k) => {
          const t = TIERS[k]
          return (
            <div key={k} className="mb-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-extrabold" style={{ color: t.color }}>{t.label} <span className="text-xs font-normal text-slate-500">({prizes[k].length})</span></span>
                <button onClick={() => setPrizes({ ...prizes, [k]: [...prizes[k]].sort((a, b) => a.localeCompare(b, 'th')) })} className="text-xs text-slate-500 underline">เรียงตามชื่อ ก-ฮ</button>
              </div>
              <ul className="mb-1.5 flex flex-wrap gap-1.5">
                {prizes[k].map((text, i) => (
                  <li key={text} className="flex items-center gap-1 rounded-full py-0.5 pl-3 pr-1 text-sm font-semibold text-slate-700" style={{ background: t.light, boxShadow: `inset 0 0 0 1.5px ${t.color}` }}>
                    {text}
                    <button onClick={() => removePrize(k, i)} disabled={prizes[k].length < 2} aria-label={`ลบ ${text}`} className="grid h-5 w-5 place-items-center rounded-full text-slate-500 hover:bg-white disabled:opacity-30">×</button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-1.5">
                <input value={draft[k]} placeholder={`เพิ่มรางวัลระดับ${t.label} (หลายอย่างคั่นด้วย , ได้)`} aria-label={`เพิ่มรางวัลระดับ${t.label}`}
                       onPaste={(e) => { const tx = e.clipboardData?.getData('text') ?? ''; if (/[\n\r]/.test(tx)) { e.preventDefault(); addPrize(k, `${draft[k]},${tx}`) } }}
                       onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                       onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) addPrize(k) }}
                       className="min-w-0 flex-1 rounded-lg border-2 bg-white px-2 py-1.5 text-sm outline-none" style={{ borderColor: t.color }} />
                <button onClick={() => addPrize(k)} className="rounded-lg px-3 text-sm font-bold text-white" style={{ background: t.color }}>+ เพิ่ม</button>
              </div>
            </div>
          )
        })}
        <button onClick={() => setPrizes(DEFAULT_PRIZES)} className="text-xs text-slate-500 underline">คืนค่าเริ่มต้น</button>
        <p className="mt-1 text-xs text-slate-500">ถ้าเปิด "ซ้ำกันได้" ไข่แต่ละใบสุ่มรางวัลจากรายการของระดับนั้น (อาจได้เหมือนกัน) · ถ้าปิด ระบบสับรางวัลทุกอย่างแล้วแจกรางวัลละ 1 คน</p>
      </section>
    </Shell>
  )
}
