import Animal from './Animal'
import { animalById } from '../game/constants'

const MEDAL = ['bg-amber-400 text-amber-950', 'bg-slate-300 text-slate-800', 'bg-orange-300 text-orange-950']

// สรุปลำดับทั้งหมดของโหมดคัดออก (ชนะรอบแรก = อันดับ 1, คนสุดท้ายที่เหลือ = อันดับสุดท้าย)
export default function Summary({ history, onRestartAll, onEdit }) {
  const [first, ...rest] = history
  return (
    <div className="relative mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-center text-3xl font-extrabold text-rose-500 sm:text-4xl">สรุปลำดับทั้งหมด</h1>

      {first && (
        <section className="pop rounded-3xl bg-gradient-to-b from-amber-200 to-amber-50 p-5 text-center shadow-lg ring-4 ring-amber-300">
          <div className="font-semibold text-amber-800">อันดับ 1</div>
          <div className="float mx-auto w-48"><Animal animal={first.player.animal} number={first.player.num} running /></div>
          <h2 className="text-3xl font-extrabold text-amber-950">{first.player.name}</h2>
          <p className="text-sm text-amber-900/80">{animalById(first.player.animal).name} · ชนะรอบที่ 1</p>
        </section>
      )}

      <ol className="mt-5 divide-y divide-slate-100 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-rose-100">
        {rest.map((h, i) => {
          const rank = i + 2
          return (
            <li key={h.player.id} className="pop flex items-center gap-3 px-2 py-2" style={{ animationDelay: `${i * 0.12}s` }}>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-extrabold ${MEDAL[rank - 1] ?? 'bg-slate-100 text-slate-600'}`}>{rank}</span>
              <div className="w-16 shrink-0"><Animal animal={h.player.animal} number={h.player.num} /></div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{h.player.name}</div>
                <div className="text-xs text-slate-500">
                  {animalById(h.player.animal).name} · {h.last ? 'เหลือเป็นคนสุดท้าย' : `ชนะรอบที่ ${h.round}`}
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button onClick={onRestartAll} className="flex-1 rounded-2xl bg-amber-400 px-6 py-4 text-xl font-extrabold text-amber-950 shadow-lg hover:bg-amber-300 active:scale-95">
          เริ่มใหม่ทุกคน
        </button>
        <button onClick={onEdit} className="flex-1 rounded-2xl bg-white px-6 py-4 text-xl font-semibold text-rose-600 shadow ring-1 ring-rose-200 hover:bg-rose-50 active:scale-95">
          แก้ไขผู้เล่น
        </button>
      </div>
    </div>
  )
}
