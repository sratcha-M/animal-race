import Animal from './Animal'
import { animalById } from '../game/constants'

export function Shell({ title, right, onBack, children }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-4">
      <div className="mb-2 flex items-center justify-between">
        <button onClick={onBack} className="rounded-lg px-3 py-1.5 text-rose-700 hover:bg-white/70">← กลับ</button>
        <h2 className="text-xl font-extrabold text-rose-500">{title}</h2>
        <span className="w-16 text-right text-xs text-rose-900/60">{right}</span>
      </div>
      {children}
    </div>
  )
}

export const BigButton = ({ children, ...p }) => (
  <button {...p} className="rounded-2xl bg-amber-400 px-6 py-4 text-2xl font-extrabold text-amber-950 shadow-lg shadow-amber-500/30 hover:bg-amber-300 active:scale-95 disabled:opacity-40">{children}</button>
)

// หน้าประกาศผู้ถูกเลือก (ใช้ร่วมกันหลายเกม)
export function ResultModal({ label = 'ผู้ถูกเลือก', winner, sub, n, againLabel = 'เล่นอีกรอบ', onAgain, onEliminate, onBack }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-rose-950/30 p-4">
      <div className="pop w-full max-w-sm rounded-3xl bg-gradient-to-b from-amber-200 to-amber-50 p-6 text-center shadow-2xl ring-4 ring-amber-300">
        <div className="text-lg font-semibold text-amber-800">{label}</div>
        <div className="float mx-auto w-44"><Animal animal={winner.animal} number={winner.num} running /></div>
        <h3 className="text-4xl font-extrabold text-amber-950">{winner.name}</h3>
        <p className="text-sm text-amber-900/70">{sub ?? animalById(winner.animal).name}</p>
        <div className="mt-4 flex flex-col gap-2">
          <button onClick={onAgain} className="rounded-xl bg-amber-400 px-4 py-3 text-lg font-extrabold text-amber-950 hover:bg-amber-300">{againLabel}</button>
          {onEliminate && n > 2 && (
            <button onClick={onEliminate} className="rounded-xl bg-rose-500 px-4 py-3 text-lg font-bold text-white hover:bg-rose-600">เอา {winner.name} ออก แล้วเล่นต่อ (เหลือ {n - 1})</button>
          )}
          <button onClick={onBack} className="rounded-xl px-4 py-2 text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50">แก้ไขผู้เล่น</button>
        </div>
      </div>
    </div>
  )
}
