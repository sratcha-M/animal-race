import { useMemo } from 'react'
import Animal from './Animal'
import { animalById } from '../game/constants'

const MEDAL = ['bg-amber-400 text-amber-950', 'bg-slate-300 text-slate-800', 'bg-orange-300 text-orange-950']

export default function Results({ results, wins, history = [], round = 1, onEliminate, onRematch, onRestartAll, onEdit }) {
  const winner = results[0]
  const confetti = useMemo(
    () => Array.from({ length: 60 }, (_, i) => ({
      left: Math.random() * 100, delay: Math.random() * 1.5, dur: 2.5 + Math.random() * 2,
      color: ['#ffd54d', '#ff8fb0', '#8fd3ff', '#a9e6cb', '#cbb0f2', '#f8a65a'][i % 6],
    })),
    [],
  )
  const remainingAfter = results.length - 1

  return (
    <div className="relative mx-auto w-full max-w-2xl overflow-hidden px-4 py-6">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        {confetti.map((c, i) => (
          <span key={i} className="confetti"
                style={{ left: `${c.left}%`, background: c.color, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s` }} />
        ))}
      </div>

      {/* ผู้ชนะ */}
      <section className="pop relative rounded-3xl bg-gradient-to-b from-amber-200 to-amber-50 p-6 text-center shadow-lg ring-4 ring-amber-300">
        <div className="text-lg font-semibold text-amber-800">{history.length ? `ผู้ชนะรอบที่ ${round}` : 'ผู้ชนะ'}</div>
        <svg viewBox="0 0 64 40" className="mx-auto mt-1 w-16" aria-hidden="true">
          <path d="M4 36 L8 8 L22 22 L32 4 L42 22 L56 8 L60 36 Z" fill="#f5c518" stroke="#a16207" strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="32" cy="4" r="3.5" fill="#e5484d" /><circle cx="8" cy="8" r="3" fill="#3e63dd" /><circle cx="56" cy="8" r="3" fill="#30a46c" />
        </svg>
        <div className="float mx-auto -mt-1 w-56 sm:w-64">
          <Animal animal={winner.animal} number={winner.num} running />
        </div>
        <h2 className="mt-2 break-words text-4xl font-extrabold text-amber-950 sm:text-5xl">{winner.name}</h2>
        <p className="mt-1 text-amber-900/80">
          {animalById(winner.animal).name} เบอร์ {winner.num} · เวลา {winner.time.toFixed(2)} วินาที
        </p>
        {results[1] && results[1].time - winner.time < 0.25 && (
          <div className="pop mt-3 inline-block rounded-full bg-rose-500 px-4 py-1 text-sm font-bold text-white shadow">
            เฉือนชนะแค่ {(results[1].time - winner.time).toFixed(2)} วินาที! ภาพถ่ายเส้นชัยตัดสิน
          </div>
        )}
      </section>

      {/* อันดับทั้งหมด */}
      <section className="relative mt-5 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-rose-100">
        <h3 className="mb-2 px-2 text-lg font-bold text-rose-600">ผลการแข่งขัน</h3>
        <ol className="divide-y divide-slate-100">
          {results.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-2 py-2">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-extrabold ${MEDAL[r.rank - 1] ?? 'bg-slate-100 text-slate-600'}`}>
                {r.rank}
              </span>
              <div className="w-16 shrink-0"><Animal animal={r.animal} number={r.num} /></div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{r.name}</div>
                <div className="text-xs text-slate-500">
                  {animalById(r.animal).name} · ชนะสะสม {wins[r.name] ?? 0} ครั้ง
                </div>
              </div>
              <div className="text-right tabular-nums text-slate-600">
                {r.time.toFixed(2)}s
                {r.rank > 1 && <div className="text-xs text-rose-500">+{(r.time - winner.time).toFixed(2)}</div>}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ผู้ชนะรอบก่อน ๆ ที่ถูกคัดออกแล้ว */}
      {history.length > 0 && (
        <section className="relative mt-5 rounded-3xl bg-white/80 p-4 shadow-sm ring-1 ring-rose-100">
          <h3 className="mb-2 px-2 text-lg font-bold text-rose-600">คัดออกแล้ว</h3>
          <ol className="flex flex-wrap gap-2 px-2">
            {history.map((h) => (
              <li key={h.player.id} className="flex items-center gap-1.5 rounded-full bg-rose-50 py-1 pl-1 pr-3 text-sm ring-1 ring-rose-100">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-rose-400 text-xs font-bold text-white">{h.round}</span>
                <span className="w-8"><Animal animal={h.player.animal} /></span>
                <span className="font-semibold">{h.player.name}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="relative mt-6 flex flex-col gap-3">
        {remainingAfter >= 1 && (
          <button onClick={onEliminate} className="rounded-2xl bg-amber-400 px-6 py-4 text-xl font-extrabold text-amber-950 shadow-lg hover:bg-amber-300 active:scale-95">
            {remainingAfter >= 2
              ? `คัด ${winner.name} ออก แล้วแข่งต่อ (เหลือ ${remainingAfter} คน)`
              : `คัด ${winner.name} ออก แล้วดูสรุปลำดับ`}
          </button>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={onRematch} className="flex-1 rounded-2xl bg-white px-6 py-3 text-lg font-semibold text-rose-600 shadow ring-1 ring-rose-200 hover:bg-rose-50 active:scale-95">
            แข่งรอบนี้ใหม่ (ไม่คัดออก)
          </button>
          {history.length > 0 && (
            <button onClick={onRestartAll} className="flex-1 rounded-2xl bg-white px-6 py-3 text-lg font-semibold text-rose-600 shadow ring-1 ring-rose-200 hover:bg-rose-50 active:scale-95">
              เริ่มใหม่ทุกคน
            </button>
          )}
          <button onClick={onEdit} className="flex-1 rounded-2xl bg-white px-6 py-3 text-lg font-semibold text-rose-600 shadow ring-1 ring-rose-200 hover:bg-rose-50 active:scale-95">
            แก้ไขผู้เล่น
          </button>
        </div>
      </div>
    </div>
  )
}
