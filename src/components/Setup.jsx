import { useState } from 'react'
import Animal from './Animal'
import { AI_BG } from '../lib/aiArt'
import { ANIMALS, MAX_PLAYERS, MIN_PLAYERS, animalById } from '../game/constants'
import { cleanName, nameTaken } from '../lib/name'

let nextId = Date.now()

export default function Setup({ players, setPlayers, onStart, onRemove, tabs = null, title = 'สัตว์น้อยวิ่งแข่ง', subtitle = 'เพิ่มผู้เล่น เลือกสัตว์ที่ชอบ แล้วลุ้นว่าใครเข้าเส้นชัยก่อน', startLabel = 'เริ่มแข่ง!' }) {
  const [name, setName] = useState('')
  const taken = (animalId, exceptId) => players.find((p) => p.animal === animalId && p.id !== exceptId)
  const firstFree = () => ANIMALS.find((a) => !taken(a.id))?.id

  const [nameHint, setNameHint] = useState(false)
  const [dupHint, setDupHint] = useState(false)
  const add = () => {
    const n = cleanName(name).trim()
    if (!n) { setNameHint(true); return }
    if (nameTaken(n, players)) { setDupHint(true); return }
    if (players.length >= MAX_PLAYERS) return
    setPlayers([...players, { id: nextId++, name: n.slice(0, 16), animal: firstFree() }])
    setName('')
  }
  const update = (id, patch) => setPlayers(players.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  const remove = (id) => { const p = players.find((x) => x.id === id); if (p) onRemove?.(p); setPlayers(players.filter((x) => x.id !== id)) }
  const addDemo = () => {
    const names = ['สมชาย', 'สมหญิง', 'มานี', 'ปิติ']
    const list = []
    names.forEach((n, i) => list.push({ id: nextId++, name: n, animal: ANIMALS[i].id }))
    setPlayers(list)
  }

  const ready = players.length >= MIN_PLAYERS && players.every((p) => p.name.trim())

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      {tabs}
      <header className="relative isolate mb-6 overflow-hidden rounded-3xl pb-4 pt-2 text-center">
        {AI_BG && (
          <img src={AI_BG} alt="" className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover object-[center_60%] opacity-70 [mask-image:linear-gradient(to_bottom,#000_55%,transparent)]" />
        )}
        <div className="float mx-auto mb-1 w-80 max-w-full">
          <div className="flex items-end justify-center gap-1"><div className="w-24"><Animal animal="rabbit" running /></div><div className="w-28"><Animal animal="cat" number="★" running /></div><div className="w-24"><Animal animal="pig" running /></div></div>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-rose-500 sm:text-5xl">{title}</h1>
        <p className="mt-1 text-rose-900/70">{subtitle}</p>
      </header>

      <div className="mb-5 flex gap-2">
        <input
          value={name}
          onChange={(e) => { const v = cleanName(e.target.value); setNameHint(v !== e.target.value); setDupHint(false); setName(v) }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) add() }}
          placeholder={players.length >= MAX_PLAYERS ? `ครบ ${MAX_PLAYERS} คนแล้ว` : 'พิมพ์ชื่อผู้เล่น แล้วกดเพิ่ม'}
          disabled={players.length >= MAX_PLAYERS}
          maxLength={16}
          className="min-w-0 flex-1 rounded-xl border-2 border-rose-200 bg-white px-4 py-3 text-lg outline-none focus:border-rose-400 disabled:bg-slate-100"
        />
        <button
          type="button"
          onClick={add}
          disabled={players.length >= MAX_PLAYERS}
          className="rounded-xl bg-rose-500 px-5 py-3 text-lg font-semibold text-white shadow hover:bg-rose-600 active:scale-95 disabled:opacity-40"
        >
          + เพิ่ม
        </button>
      </div>

      <p className={`-mt-3 mb-4 px-1 text-sm ${nameHint || dupHint ? 'text-rose-600' : 'text-rose-900/50'}`}>
        {dupHint ? 'ชื่อนี้มีคนใช้แล้ว กรุณาใช้ชื่ออื่น' : 'ชื่อใช้ได้เฉพาะตัวอักษร (ไทยหรืออังกฤษ) ไม่รับตัวเลข สัญลักษณ์ หรืออีโมจิ และห้ามซ้ำกัน'}
      </p>

      {players.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-rose-300 bg-white/60 p-8 text-center text-rose-800">
          ยังไม่มีผู้เล่น
          <button onClick={addDemo} className="ml-2 font-semibold text-rose-500 underline underline-offset-4">
            เพิ่มตัวอย่าง 4 คน
          </button>
        </div>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {players.map((p, i) => (
          <li key={p.id} className="pop rounded-2xl bg-white p-4 shadow-sm ring-1 ring-rose-100">
            <div className="flex items-center gap-3">
              <div className="w-20 shrink-0"><Animal animal={p.animal} number={i + 1} /></div>
              <div className="min-w-0 flex-1">
                <input
                  value={p.name}
                  readOnly={p.remote}
                  onChange={(e) => { const v = cleanName(e.target.value); if (!nameTaken(v, players, p.id)) update(p.id, { name: v }) }}
                  aria-label={`ชื่อผู้เล่น ${i + 1}`}
                  className="w-full rounded-lg border border-transparent px-2 py-1 text-lg font-semibold hover:border-slate-200 focus:border-rose-300 focus:outline-none"
                />
                <div className="px-2 text-sm text-slate-500">
                  {animalById(p.animal).name} · เบอร์ {i + 1}
                  {p.remote && <span className="ml-2 inline-block whitespace-nowrap rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">มือถือ</span>}
                </div>
              </div>
              <button
                onClick={() => remove(p.id)}
                aria-label={`ลบ ${p.name}`}
                className="rounded-full px-2 text-2xl leading-none text-slate-400 hover:bg-rose-50 hover:text-rose-500"
              >
                ×
              </button>
            </div>
            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {ANIMALS.map((a) => {
                const owner = taken(a.id, p.id)
                const selected = p.animal === a.id
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => update(p.id, { animal: a.id })}
                    disabled={!!owner || p.remote}
                    title={owner ? `${a.name} — ${owner.name} เลือกแล้ว` : a.name}
                    aria-label={a.name}
                    aria-pressed={selected}
                    className={`flex flex-col items-center overflow-hidden rounded-xl px-0.5 pb-0.5 pt-1 transition ${
                      selected ? 'bg-rose-100 ring-2 ring-rose-400' : 'bg-slate-50 hover:bg-rose-50'
                    } ${owner ? 'cursor-not-allowed opacity-45' : 'hover:scale-105'}`}
                  >
                    <Animal animal={a.id} className="w-full" />
                    <span className="max-w-full truncate text-[10px] leading-tight text-slate-600 sm:text-xs">{owner ? owner.name : a.name}</span>
                  </button>
                )
              })}
            </div>
          </li>
        ))}
      </ul>

      <div className="sticky bottom-0 mt-6 flex flex-col items-center gap-2 bg-gradient-to-t from-[#fff4f8] via-[#fff4f8] to-transparent pb-4 pt-6">
        <button
          onClick={onStart}
          disabled={!ready}
          className="w-full max-w-sm rounded-2xl bg-amber-400 px-8 py-4 text-2xl font-extrabold text-amber-950 shadow-lg shadow-amber-500/30 hover:bg-amber-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {startLabel}
        </button>
        <p className="text-sm text-rose-900/60">
          {players.length < MIN_PLAYERS ? `ต้องมีผู้เล่นอย่างน้อย ${MIN_PLAYERS} คน` : `${players.length} / ${MAX_PLAYERS} คน`}
        </p>
      </div>
    </div>
  )
}
