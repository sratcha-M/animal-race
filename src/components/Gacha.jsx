import { useEffect, useMemo, useRef, useState } from 'react'
import { Shell, BigButton } from './MiniShell'
import Animal from './Animal'
import { shuffle, rand, pick } from '../lib/rand'
import { beep, fanfare } from '../lib/sound'
import { load, save } from '../lib/storage'

const TIERS = {
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

// ทอง 1 ใบ, เงินประมาณ 1 ใน 3, ที่เหลือทองแดง แล้วสลับไข่กับชื่อ
function deal(roster) {
  const n = roster.length
  const silver = n >= 3 ? Math.max(1, Math.round(n / 3)) : 0
  const tiers = shuffle(['gold', ...Array(silver).fill('silver'), ...Array(n - 1 - silver).fill('bronze')])
  return shuffle(roster).map((p, i) => ({ player: p, tier: tiers[i], shell: pick(PASTELS) }))
}

export default function Gacha({ players, onBack }) {
  const roster = useMemo(() => players.map((p, i) => ({ ...p, num: i + 1 })), [players])
  const [eggs, setEggs] = useState(() => deal(roster))
  const [drawn, setDrawn] = useState([])
  const [opened, setOpened] = useState([]) // ผลที่เปิดไข่แล้ว แสดงด้านล่างทันที
  const [phase, setPhase] = useState('ready') // ready | rolling | egg | open
  const [prizes, setPrizes] = useState(loadPrizes)
  const [draft, setDraft] = useState({ gold: '', silver: '', bronze: '' })
  const picker = useRef(prizePicker())
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => save(KEY, prizes), [prizes])

  const current = drawn[drawn.length - 1]
  const left = eggs.length - drawn.length

  const turn = () => {
    if (left < 1 || phase === 'rolling' || phase === 'egg' || phase === 'open') return
    setPhase('rolling')
    for (let k = 0; k < 6; k++) setTimeout(() => beep(300 + k * 40, 0.06, 'square', 0.05), k * 140)
    timer.current = setTimeout(() => { setDrawn((d) => [...d, eggs[d.length]]); setPhase('egg') }, 900)
  }
  const open = () => {
    const prize = picker.current(current.tier, prizes[current.tier])
    setOpened((o) => [...o, { ...current, prize }]); setPhase('open'); fanfare()
  }
  const addPrize = (k) => {
    const t = draft[k].trim()
    if (!t || prizes[k].includes(t)) return
    setPrizes({ ...prizes, [k]: [...prizes[k], t] }); setDraft({ ...draft, [k]: '' })
  }
  const removePrize = (k, i) => prizes[k].length > 1 && setPrizes({ ...prizes, [k]: prizes[k].filter((_, j) => j !== i) })
  const resetPrizes = () => setPrizes(DEFAULT_PRIZES)
  const next = () => setPhase('ready')
  const restart = () => { setEggs(deal(roster)); setDrawn([]); setOpened([]); setPhase('ready') }

  return (
    <Shell title="กาชาปอง" right={`เหลือ ${left} ไข่`} onBack={onBack}>
      {/* ตู้ */}
      <div className="relative mx-auto mt-1 w-full max-w-[20rem]">
        <svg viewBox="0 0 200 240" className="w-full" aria-hidden="true">
          <circle cx="100" cy="86" r="76" fill="#e0f2fe" stroke="#f472b6" strokeWidth="6" />
          {eggs.slice(drawn.length).map((e, i, a) => {
            const ang = (i / Math.max(a.length, 1)) * Math.PI * 2 + 0.6
            const rr = 22 + (i % 3) * 18
            return <circle key={i} cx={100 + Math.cos(ang) * rr} cy={96 + Math.sin(ang) * rr * 0.8} r="15" fill={e.shell} stroke="#fff" strokeWidth="3" />
          })}
          <path d="M104 20 A76 76 0 0 1 176 70" stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" opacity=".7" />
          <rect x="30" y="150" width="140" height="70" rx="16" fill="#f472b6" />
          <circle cx="100" cy="180" r="20" fill="#fff" />
          <g className={phase === 'rolling' ? 'cranking' : ''} style={{ transformOrigin: '100px 180px' }}>
            <rect x="94" y="163" width="12" height="34" rx="5" fill="#f43f5e" />
          </g>
          <rect x="130" y="196" width="34" height="24" rx="6" fill="#9d174d" />
        </svg>
      </div>

      {/* ถาดรับไข่ */}
      <div className="relative mx-auto -mt-1 grid h-52 w-full place-items-center">
        {phase === 'ready' && <p className="text-sm text-rose-900/60">{left > 0 ? 'กดหมุนตู้ ไข่จะกลิ้งออกมา' : 'ไข่หมดตู้แล้ว'}</p>}
        {phase === 'rolling' && <p className="text-sm font-bold text-rose-500">กำลังหมุน...</p>}
        {(phase === 'egg' || phase === 'open') && current && (
          <div className="relative flex flex-col items-center">
            {phase === 'open' && (
              <div className="pop absolute bottom-8 z-10 w-56 rounded-2xl p-3 text-center shadow-xl ring-4"
                   style={{ background: TIERS[current.tier].light, '--tw-ring-color': TIERS[current.tier].color, boxShadow: `0 0 28px ${TIERS[current.tier].color}` }}>
                <div className="text-sm font-extrabold" style={{ color: TIERS[current.tier].color }}>ระดับ {TIERS[current.tier].label}</div>
                <div className="mx-auto w-20"><Animal animal={current.player.animal} /></div>
                <div className="text-2xl font-extrabold text-slate-800">{current.player.name}</div>
                <div className="text-sm font-bold text-slate-700">{opened[opened.length - 1]?.prize}</div>
              </div>
            )}
            <div className={phase === 'egg' ? 'egg-out' : ''}>
              <svg viewBox="0 0 100 100" className="w-28 overflow-visible" aria-hidden="true">
                <path className={phase === 'open' ? 'cap-bot' : ''} d="M5 50 A45 45 0 0 0 95 50 Z" fill="#fff" stroke="#e5e7eb" strokeWidth="2" />
                <path className={phase === 'open' ? 'cap-top' : ''} d="M5 50 A45 45 0 0 1 95 50 Z" fill={current.shell} stroke="#fff" strokeWidth="2" />
              </svg>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {phase === 'egg' && <BigButton onClick={open}>เปิดไข่!</BigButton>}
        {phase === 'open' && left > 0 && <BigButton onClick={next}>เก็บไข่ต่อไป</BigButton>}
        {(phase === 'ready') && left > 0 && <BigButton onClick={turn}>หมุนตู้!</BigButton>}
        {(phase === 'ready' || phase === 'open') && left < 1 && <BigButton onClick={restart}>สับไข่ใหม่</BigButton>}
      </div>

      {opened.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm" aria-live="polite">
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
        {Object.entries(TIERS).map(([k, t]) => (
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
        ))}
        <button onClick={resetPrizes} className="text-xs text-slate-500 underline">คืนค่าเริ่มต้น</button>
        <p className="mt-1 text-xs text-slate-500">ไข่แต่ละใบสุ่มของรางวัลจากรายการของระดับนั้น ถ้ามีหลายอย่างจะไม่ซ้ำกันจนกว่าจะครบ</p>
      </section>
    </Shell>
  )
}
