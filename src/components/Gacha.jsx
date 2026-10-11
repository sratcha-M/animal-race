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
}
const PASTELS = ['#ff8fab', '#8ed1fc', '#a0e3b0', '#c3a6ff', '#ffd166', '#ffb38a']
const DEFAULT_PRIZES = {
  gold: ['รางวัลใหญ่'],
  silver: ['รางวัลรอง'],
  bronze: ['รางวัลปลอบใจ'],
}
const KEY = 'animal-race:gacha-prizes'
const BRONZE_KEY = 'animal-race:gacha-bronze'
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
const prizePicker = () => {
  const bag = {}
  return (tier, list) => {
    if (!bag[tier]?.length) bag[tier] = shuffle(list)
    return bag[tier].pop()
  }
}
// สัดส่วนระดับของไข่ทั้งหมด: 3 ระดับ = ทอง 1 / เงิน ~1 ใน 3 / ที่เหลือทองแดง
// 2 ระดับ (ปิดทองแดง) = ทองประมาณ 1 ใน 3 (อย่างน้อย 1) ที่เหลือเงิน
function tierBag(n, bronze) {
  if (n < 1) return []
  if (!bronze) {
    const gold = Math.min(n, Math.max(1, Math.round(n / 3)))
    return shuffle([...Array(gold).fill('gold'), ...Array(n - gold).fill('silver')])
  }
  const silver = n >= 3 ? Math.max(1, Math.round(n / 3)) : 0
  return shuffle(['gold', ...Array(silver).fill('silver'), ...Array(Math.max(0, n - 1 - silver)).fill('bronze')]).slice(0, n)
}
const deal = (roster, bronze) => {
  const tiers = tierBag(roster.length, bronze)
  return shuffle(roster).map((p, i) => ({ player: p, tier: tiers[i], shell: pick(PASTELS) }))
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
      <div className="text-sm font-extrabold" style={{ color: t.color }}>ระดับ {t.label}</div>
      <div className="mx-auto w-20"><Animal animal={e.player.animal} /></div>
      <div className="text-2xl font-extrabold text-slate-800">{e.player.name}</div>
      <div className="text-sm font-bold text-slate-700">{e.prize}</div>
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
  const [bronze, setBronze] = useState(() => load(BRONZE_KEY, true) !== false)
  const [draft, setDraft] = useState({ gold: '', silver: '', bronze: '' })
  const picker = useRef(prizePicker())
  const [opened, setOpened] = useState([])        // ผลที่เปิดแล้ว (ทุกโหมดใช้ร่วมกัน) แสดงด้านล่างทันที
  const [eggs, setEggs] = useState(() => deal(roster, bronze))
  // ทีละใบ
  const [drawn, setDrawn] = useState(0)
  const [phase, setPhase] = useState('ready')     // ready | rolling | egg | open
  // พร้อมกัน
  const [allPhase, setAllPhase] = useState('ready') // ready | rolling | out
  // มือถือ
  const [spun, setSpun] = useState([])            // id ผู้เล่นที่หมุนแล้ว
  const [stage, setStage] = useState(null)        // { e, phase: 'egg' | 'open' }
  const bag = useRef(tierBag(roster.length, bronze))
  const queue = useRef([])
  const pumping = useRef(false)
  const alive = useRef(true)
  const timers = useRef([])
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms))
  useEffect(() => { alive.current = true; return () => { alive.current = false; timers.current.forEach(clearTimeout) } }, [])
  useEffect(() => save(KEY, prizes), [prizes])
  useEffect(() => save(BRONZE_KEY, bronze), [bronze])

  const rosterRef = useRef(roster); rosterRef.current = roster
  const modeRef = useRef(mode); modeRef.current = mode
  const spunRef = useRef(spun); spunRef.current = spun
  const prizesRef = useRef(prizes); prizesRef.current = prizes
  const bronzeRef = useRef(bronze); bronzeRef.current = bronze
  const tiersOn = bronze ? ['gold', 'silver', 'bronze'] : ['gold', 'silver']

  const resetAll = (m = mode, br = bronze) => {
    timers.current.forEach(clearTimeout); timers.current = []
    queue.current = []; pumping.current = false
    bronzeRef.current = br
    bag.current = tierBag(rosterRef.current.length, br)
    setEggs(deal(rosterRef.current, br)); setOpened([]); setDrawn(0); setPhase('ready'); setAllPhase('ready'); setSpun([]); setStage(null); setMode(m); setBronze(br)
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
  const openEgg = (e) => {
    const entry = { ...e, prize: picker.current(e.tier, prizes[e.tier]) }
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
      const entry = { ...e, prize: picker.current(e.tier, prizesRef.current[e.tier]) }
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
    const tier = bag.current.pop() ?? (bronzeRef.current ? 'bronze' : 'silver')
    spunRef.current = [...spunRef.current, id]
    setSpun(spunRef.current)
    queue.current.push({ player: p, tier, shell: pick(PASTELS) })
    pump()
  }
  const spinForRef = useRef(spinFor); spinForRef.current = spinFor
  useEffect(() => registerHandler?.('gacha-spin', (from) => spinForRef.current(from)), []) // eslint-disable-line react-hooks/exhaustive-deps

  // ส่งสถานะไปให้มือถือเพื่อน
  const results = useMemo(() => Object.fromEntries(opened.map((o) => [o.player.id, { tier: o.tier, prize: o.prize }])), [opened])
  useEffect(() => { onNet?.({ mode, spun, results }) }, [mode, spun, results]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => onNet?.(null), []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- ของรางวัล ----------
  const addPrize = (k) => {
    const t = draft[k].trim()
    if (!t || prizes[k].includes(t)) return
    setPrizes({ ...prizes, [k]: [...prizes[k], t] }); setDraft({ ...draft, [k]: '' })
  }
  const removePrize = (k, i) => prizes[k].length > 1 && setPrizes({ ...prizes, [k]: prizes[k].filter((_, j) => j !== i) })

  const soloStage = (phase === 'egg' || phase === 'open') && current ? { e: phase === 'open' ? opened[opened.length - 1] ?? current : current, phase } : null
  const busy = phase !== 'ready' || stage
  const total = eggs.length

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
        <ul className="mt-4 space-y-1 text-sm" aria-live="polite" aria-label="ผลที่เปิดแล้ว">
          {opened.map((d, i) => (
            <li key={i} className="pop flex items-center gap-2 rounded-lg bg-white/90 px-3 py-2 ring-1 ring-rose-100">
              <span className="w-5 text-rose-400">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-base font-extrabold">{d.player.name}</span>
              <span className="rounded-full px-2 py-0.5 text-xs font-extrabold text-white" style={{ background: TIERS[d.tier].color }}>{TIERS[d.tier].label}</span>
              <span className="max-w-[40%] truncate text-xs text-slate-500">{d.prize}</span>
            </li>
          ))}
        </ul>
      )}

      {/* ของรางวัลแต่ละระดับ: เพิ่ม/ลบเองได้ และจำไว้ในเครื่องนี้สำหรับครั้งหน้า */}
      <section className="mt-5 rounded-2xl bg-white/80 p-3 ring-1 ring-rose-100">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-extrabold text-rose-600">ของรางวัล</h3>
          <span className="text-xs text-emerald-600">บันทึกอัตโนมัติในเครื่องนี้ ✓</span>
        </div>
        <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={bronze} onChange={(e) => resetAll(mode, e.target.checked)} />
          ใช้ระดับทองแดง <span className="text-xs font-normal text-slate-500">(ปิด = เหลือแค่ทองกับเงิน และเริ่มรอบใหม่)</span>
        </label>
        {tiersOn.map((k) => {
          const t = TIERS[k]
          return (
            <div key={k} className="mb-3">
              <div className="mb-1 text-sm font-extrabold" style={{ color: t.color }}>{t.label}</div>
              <ul className="mb-1.5 flex flex-wrap gap-1.5">
                {prizes[k].map((text, i) => (
                  <li key={text} className="flex items-center gap-1 rounded-full py-0.5 pl-3 pr-1 text-sm font-semibold text-slate-700" style={{ background: t.light, boxShadow: `inset 0 0 0 1.5px ${t.color}` }}>
                    {text}
                    <button onClick={() => removePrize(k, i)} disabled={prizes[k].length < 2} aria-label={`ลบ ${text}`} className="grid h-5 w-5 place-items-center rounded-full text-slate-500 hover:bg-white disabled:opacity-30">×</button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-1.5">
                <input value={draft[k]} maxLength={24} placeholder={`เพิ่มรางวัลระดับ${t.label}`} aria-label={`เพิ่มรางวัลระดับ${t.label}`}
                       onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                       onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) addPrize(k) }}
                       className="min-w-0 flex-1 rounded-lg border-2 bg-white px-2 py-1.5 text-sm outline-none" style={{ borderColor: t.color }} />
                <button onClick={() => addPrize(k)} className="rounded-lg px-3 text-sm font-bold text-white" style={{ background: t.color }}>+ เพิ่ม</button>
              </div>
            </div>
          )
        })}
        <button onClick={() => setPrizes(DEFAULT_PRIZES)} className="text-xs text-slate-500 underline">คืนค่าเริ่มต้น</button>
        <p className="mt-1 text-xs text-slate-500">ไข่แต่ละใบสุ่มของรางวัลจากรายการของระดับนั้น ถ้ามีหลายอย่างจะไม่ซ้ำกันจนกว่าจะครบ</p>
      </section>
    </Shell>
  )
}
