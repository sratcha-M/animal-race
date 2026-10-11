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
const DEFAULT_PRIZES = { gold: 'รางวัลใหญ่', silver: 'รางวัลรอง', bronze: 'รางวัลปลอบใจ' }

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
  const [phase, setPhase] = useState('ready') // ready | rolling | egg | open
  const [prizes, setPrizes] = useState(() => ({ ...DEFAULT_PRIZES, ...load('animal-race:gacha-prizes', {}) }))
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => save('animal-race:gacha-prizes', prizes), [prizes])

  const current = drawn[drawn.length - 1]
  const left = eggs.length - drawn.length

  const turn = () => {
    if (left < 1 || phase === 'rolling' || phase === 'egg' || phase === 'open') return
    setPhase('rolling')
    for (let k = 0; k < 6; k++) setTimeout(() => beep(300 + k * 40, 0.06, 'square', 0.05), k * 140)
    timer.current = setTimeout(() => { setDrawn((d) => [...d, eggs[d.length]]); setPhase('egg') }, 900)
  }
  const open = () => { setPhase('open'); fanfare() }
  const next = () => setPhase('ready')
  const restart = () => { setEggs(deal(roster)); setDrawn([]); setPhase('ready') }

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
                <div className="text-sm text-slate-600">{prizes[current.tier]}</div>
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

      {/* ของรางวัลแต่ละระดับ */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {Object.entries(TIERS).map(([k, t]) => (
          <label key={k} className="flex flex-col text-xs font-bold" style={{ color: t.color }}>
            {t.label}
            <input value={prizes[k]} maxLength={20} onChange={(e) => setPrizes({ ...prizes, [k]: e.target.value })}
                   className="mt-0.5 rounded-lg border-2 bg-white px-2 py-1.5 text-sm font-normal text-slate-700 outline-none" style={{ borderColor: t.color }} />
          </label>
        ))}
      </div>

      {drawn.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm">
          {drawn.map((d, i) => {
            const shown = !(i === drawn.length - 1 && phase !== 'open')
            return (
              <li key={i} className="flex items-center gap-2 rounded-lg bg-white/80 px-3 py-1.5 ring-1 ring-rose-100">
                <span className="w-5 text-rose-400">{i + 1}</span>
                {shown ? (
                  <>
                    <span className="min-w-0 flex-1 truncate font-bold">{d.player.name}</span>
                    <span className="rounded-full px-2 py-0.5 text-xs font-extrabold text-white" style={{ background: TIERS[d.tier].color }}>{TIERS[d.tier].label}</span>
                    <span className="max-w-[40%] truncate text-xs text-slate-500">{prizes[d.tier]}</span>
                  </>
                ) : <span className="text-slate-400">ยังไม่เปิดไข่...</span>}
              </li>
            )
          })}
        </ul>
      )}
    </Shell>
  )
}
