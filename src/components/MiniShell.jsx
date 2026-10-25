import Animal from './Animal'
import { animalById } from '../game/constants'

// โครงหน้าเกม: หัว (กลับ / ชื่อเกม / ป้ายจำนวน) + ตัวเกม และแผงข้าง (side) ที่จอกว้างวางคู่กัน จอแคบเรียงลงมา
export function Shell({ title, right, onBack, children, side = null, wide = false }) {
  return (
    <div className={`mx-auto flex min-h-dvh w-full flex-col px-4 py-4 ${side || wide ? 'max-w-2xl lg:max-w-6xl' : 'max-w-xl'}`}>
      <Header title={title} right={right} onBack={onBack} />
      <div className={side ? 'flex flex-1 flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-8' : 'flex flex-1 flex-col'}>
        <div className="flex min-w-0 flex-col">{children}</div>
        {side && <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4">{side}</aside>}
      </div>
    </div>
  )
}

export function Header({ title, right, onBack }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <button onClick={onBack} className="t-btn t-ghost shrink-0 px-3 py-1 text-sm">← กลับ</button>
      <h2 className="booth-title min-w-0 truncate text-2xl text-[#24405a] sm:text-3xl">{title}</h2>
      {right ? <span className="shrink-0 rounded-full border-[3px] border-[#24405a] bg-[#ffd166] px-3 py-0.5 text-sm font-bold text-[#24405a]">{right}</span> : <span className="w-16" />}
    </div>
  )
}

// การ์ดหัวสีมิ้นต์ ใช้ในแผงข้างของทุกเกม
export function Panel({ title, extra, children, className = '' }) {
  return (
    <section className={`t-card overflow-hidden ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-2 border-b-4 border-[#24405a] bg-[#3ec1b0] px-4 py-2">
          <h3 className="booth-title text-xl text-white [text-shadow:0_2px_0_#24405a]">{title}</h3>
          {extra != null && <span className="text-sm font-bold text-white">{extra}</span>}
        </div>
      )}
      <div className="p-3">{children}</div>
    </section>
  )
}

export const BigButton = ({ children, ...p }) => (
  <button {...p} className="t-btn t-pink booth-title w-full px-6 py-3 text-3xl">{children}</button>
)

// หน้าประกาศผู้ถูกเลือก (ใช้ร่วมกันหลายเกม)
export function ResultModal({ label = 'ผู้ถูกเลือก', winner, sub, n, againLabel = 'เล่นอีกรอบ', onAgain, onEliminate, onBack }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#24405a]/30 p-4">
      <div className="t-modal pop w-full max-w-sm p-6 text-center">
        <div className="text-lg font-semibold text-[#1f8f80]">{label}</div>
        <div className="float mx-auto w-44"><Animal animal={winner.animal} number={winner.num} running /></div>
        <h3 className="text-4xl font-extrabold text-[#24405a]">{winner.name}</h3>
        <p className="text-sm text-[#4f6a82]">{sub ?? animalById(winner.animal).name}</p>
        <div className="mt-4 flex flex-col gap-2">
          <button onClick={onAgain} className="t-btn t-yellow px-4 py-3 text-lg font-extrabold">{againLabel}</button>
          {onEliminate && n > 2 && (
            <button onClick={onEliminate} className="t-btn t-pink px-4 py-3 text-lg font-bold">เอา {winner.name} ออก แล้วเล่นต่อ (เหลือ {n - 1})</button>
          )}
          <button onClick={onBack} className="t-btn t-ghost px-4 py-2">แก้ไขผู้เล่น</button>
        </div>
      </div>
    </div>
  )
}

// ปุ่มเลือกตัวเลือก (โหมดเล่น / เวลา / ความยาวชนวน) หน้าตาเดียวกันทุกเกม
export function Choice({ label, options, value, onChange, disabled = false, cols }) {
  return (
    <div role="radiogroup" aria-label={label}>
      {label && <div className="mb-1.5 text-sm font-bold text-[#24405a]">{label}</div>}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols ?? options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <button key={o.k} type="button" role="radio" aria-checked={value === o.k} disabled={disabled || o.disabled}
                  onClick={() => onChange(o.k)}
                  className={`t-btn px-1.5 py-1.5 text-sm leading-tight shadow-[0_3px_0_#24405a] ${value === o.k ? 't-pink' : 't-ghost'}`}>
            {o.label}
            {o.desc && <div className="mt-0.5 text-[10px] font-normal leading-tight opacity-80 sm:text-[11px]">{o.desc}</div>}
          </button>
        ))}
      </div>
    </div>
  )
}
