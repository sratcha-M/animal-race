import Animal from './Animal'
import { animalById } from '../game/constants'

const MEDAL = ['bg-amber-400 text-[#24405a]', 'bg-slate-300 text-slate-800', 'bg-orange-300 text-orange-950']

// สรุปลำดับทั้งหมดของโหมดคัดออก (ชนะรอบแรก = อันดับ 1, คนสุดท้ายที่เหลือ = อันดับสุดท้าย)
export default function Summary({ history, onRestartAll, onEdit }) {
  const [first, ...rest] = history
  return (
    <div className="relative mx-auto w-full max-w-xl px-4 py-6 lg:max-w-5xl">
      <h1 className="mb-4 text-center booth-title text-3xl text-[#24405a] sm:text-4xl">สรุปลำดับทั้งหมด</h1>

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
      {first && (
        <section className="t-modal pop p-5 text-center">
          <div className="font-semibold text-[#1f8f80]">อันดับ 1</div>
          <div className="float mx-auto w-48"><Animal animal={first.player.animal} number={first.player.num} running /></div>
          <h2 className="text-3xl font-extrabold text-[#24405a]">{first.player.name}</h2>
          <p className="text-sm text-[#4f6a82]">{animalById(first.player.animal).name} · ชนะรอบที่ 1</p>
        </section>
      )}

      <ol className="t-card mt-5 divide-y-2 divide-dotted divide-[#cfe9e4] p-3 lg:mt-0">
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
      </div>

      <div className="mx-auto mt-6 flex max-w-2xl flex-col gap-3 sm:flex-row">
        <button onClick={onRestartAll} className="t-btn t-pink booth-title flex-1 px-6 py-3 text-2xl">
          เริ่มใหม่ทุกคน
        </button>
        <button onClick={onEdit} className="t-btn t-ghost flex-1 px-6 py-4 text-xl font-semibold">
          แก้ไขผู้เล่น
        </button>
      </div>
    </div>
  )
}
