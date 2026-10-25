import { useState } from 'react'
import Animal from './Animal'
import { ANIMALS, MAX_PLAYERS, MIN_PLAYERS, animalById } from '../game/constants'
import { cleanName, nameTaken } from '../lib/name'

let nextId = Date.now()

export default function Setup({ players, setPlayers, onStart, onRemove, tabs = null, title = 'สัตว์น้อยวิ่งแข่ง', subtitle = 'เพิ่มผู้เล่น เลือกสัตว์ที่ชอบ แล้วลุ้นว่าใครเข้าเส้นชัยก่อน', startLabel = 'เริ่มแข่ง!', poster = null }) {
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
  // วางหลายชื่อทีเดียว (ก๊อปจาก Excel: คั่นด้วยขึ้นบรรทัดใหม่หรือแท็บ) — ข้ามชื่อว่าง/ซ้ำ และหยุดเมื่อครบจำนวน
  const [pasteInfo, setPasteInfo] = useState('')
  const onPaste = (e) => {
    const text = e.clipboardData.getData('text')
    if (!/[\r\n\t]/.test(text.trim())) return
    e.preventDefault()
    const list = [...players]
    let skipped = 0
    for (const raw of text.split(/[\r\n\t]+/)) {
      const n = cleanName(raw).trim()
      if (!n) continue
      if (nameTaken(n, list) || list.length >= MAX_PLAYERS) { skipped++; continue }
      const animal = ANIMALS.find((a) => !list.some((p) => p.animal === a.id))?.id
      list.push({ id: nextId++, name: n, animal })
    }
    const added = list.length - players.length
    setPlayers(list)
    setName(''); setNameHint(false); setDupHint(false)
    setPasteInfo(`เพิ่ม ${added} คน${skipped ? ` (ข้าม ${skipped} ชื่อที่ซ้ำหรือเกิน ${MAX_PLAYERS} คน)` : ''}`)
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

  // ธีมตู้ตั๋วพาสเทล: พื้นมิ้นต์ + วงล้อหมุนช้า ๆ / โปสเตอร์หัวโค้ง / การ์ดตู้ขายตั๋ว / ผู้เล่นเป็นตั๋วบนถาดชมพู
  return (
    <div className={`booth relative isolate mx-auto w-full px-4 py-6 ${poster ? 'max-w-6xl' : 'max-w-3xl'}`}>
      <div aria-hidden className="booth-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="booth-wheel absolute -left-24 top-[22%] aspect-square w-[min(640px,90vw)] rounded-full border-[10px] border-[#24405a] opacity-90">
          <span className="absolute left-1/2 top-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#24405a]" />
        </div>
      </div>
      {tabs}
      <div className={poster ? 'lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-10' : ''}>
      {poster && (
        <div className="mx-auto mb-8 w-fit max-w-full lg:sticky lg:top-6 lg:mb-0 lg:mt-4">
          <img src={poster} alt={title}
               className="block h-auto max-h-[34rem] w-auto max-w-full rounded-t-[999px] rounded-b-3xl border-[6px] border-[#24405a] shadow-[0_10px_0_#24405a] lg:max-h-[calc(100dvh-16rem)]" />
        </div>
      )}
      <div>
      <section className="overflow-hidden rounded-[28px] border-4 border-[#24405a] bg-white shadow-[0_10px_0_#24405a]">
        <div className="flex items-center justify-between gap-3 border-b-4 border-[#24405a] bg-[#3ec1b0] px-4 py-3 sm:px-6">
          <h1 className="booth-title min-w-0 text-2xl text-white [text-shadow:0_3px_0_#24405a] sm:text-4xl">{title}</h1>
          <span className="shrink-0 rounded-full border-[3px] border-[#24405a] bg-[#ffd166] px-3 py-0.5 font-bold text-[#24405a]">{players.length} / {MAX_PLAYERS} ใบ</span>
        </div>
        <div className="flex flex-col gap-3 p-4 sm:p-6">
          <p className="font-bold text-[#24405a]/80">{subtitle}</p>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => { const v = cleanName(e.target.value); setNameHint(v !== e.target.value); setDupHint(false); setPasteInfo(''); setName(v) }}
              onPaste={onPaste}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) add() }}
              placeholder={players.length >= MAX_PLAYERS ? `ครบ ${MAX_PLAYERS} คนแล้ว` : 'พิมพ์ชื่อ หรือวางจาก Excel'}
              aria-label="ชื่อผู้เล่น"
              disabled={players.length >= MAX_PLAYERS}
              maxLength={16}
              className="min-w-0 flex-1 rounded-2xl border-[3px] border-[#24405a] bg-[#f2fbf9] px-4 py-2.5 text-lg text-[#24405a] outline-none placeholder:text-[#24405a]/45 focus:bg-white disabled:opacity-60"
            />
            <button
              type="button"
              onClick={add}
              disabled={players.length >= MAX_PLAYERS}
              className="shrink-0 rounded-2xl border-[3px] border-[#24405a] bg-[#ffd166] px-4 text-lg font-bold text-[#24405a] shadow-[0_4px_0_#24405a] hover:bg-[#ffdb85] active:translate-y-1 active:shadow-none disabled:opacity-40"
            >
              + ออกตั๋ว
            </button>
          </div>

          <p className={`-mt-1 px-1 text-sm ${nameHint || dupHint ? 'font-bold text-[#e0466e]' : pasteInfo ? 'font-bold text-[#1f8f80]' : 'text-[#4f6a82]'}`}>
            {dupHint ? 'ชื่อนี้มีคนใช้แล้ว กรุณาใช้ชื่ออื่น' : pasteInfo || 'ชื่อใช้ได้เฉพาะตัวอักษร (ไทยหรืออังกฤษ) ไม่รับตัวเลข สัญลักษณ์ หรืออีโมจิ และห้ามซ้ำกัน · วางหลายชื่อจาก Excel ได้ทีเดียว'}
          </p>

          <div className="rounded-[18px] bg-[#ffe1e9] p-3">
            {players.length === 0 && (
              <div className="rounded-2xl border-[3px] border-dashed border-[#ff6f91] p-8 text-center text-[#24405a]">
                ยังไม่มีใครซื้อตั๋ว
                <button onClick={addDemo} className="ml-2 font-bold text-[#e0466e] underline underline-offset-4">
                  เพิ่มตัวอย่าง 4 คน
                </button>
              </div>
            )}
            <ul className="grid gap-3 sm:grid-cols-2">
              {players.map((p, i) => (
                <li key={p.id} className="pop booth-ticket px-5 py-3 drop-shadow-[0_3px_0_#24405a]">
                  <div className="flex items-center gap-2">
                    <div className="w-16 shrink-0"><Animal animal={p.animal} /></div>
                    <div className="min-w-0 flex-1 border-l-[3px] border-dotted border-[#ff6f91] pl-3">
                      <input
                        value={p.name}
                        readOnly={p.remote}
                        onChange={(e) => { const v = cleanName(e.target.value); if (!nameTaken(v, players, p.id)) update(p.id, { name: v }) }}
                        aria-label={`ชื่อผู้เล่น ${i + 1}`}
                        className="w-full rounded-md border border-transparent bg-transparent px-1 text-lg font-bold text-[#24405a] hover:border-[#cfe9e4] focus:border-[#3ec1b0] focus:outline-none"
                      />
                      <div className="px-1 text-xs text-[#4f6a82]">
                        No.{String(i + 1).padStart(3, '0')} · {animalById(p.animal).name}
                        {p.remote && <span className="ml-2 inline-block whitespace-nowrap rounded-full bg-sky-100 px-2 py-0.5 font-semibold text-sky-700">มือถือ</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => remove(p.id)}
                      aria-label={`ลบ ${p.name}`}
                      className="rounded-full px-2 text-2xl leading-none text-[#4f6a82]/60 hover:bg-[#ff6f91]/10 hover:text-[#e0466e]"
                    >
                      ×
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-5 gap-1 border-t-2 border-dotted border-[#cfe9e4] pt-2">
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
                          className={`flex flex-col items-center overflow-hidden rounded-lg px-0.5 pb-0.5 pt-1 transition ${
                            selected ? 'bg-[#bdeee6] ring-2 ring-[#24405a]' : 'hover:bg-[#f2fbf9]'
                          } ${owner ? 'cursor-not-allowed opacity-35' : 'hover:scale-105'}`}
                        >
                          <Animal animal={a.id} className="w-full" />
                          <span className="max-w-full truncate text-[10px] leading-tight text-[#4f6a82] sm:text-xs">{owner ? owner.name : a.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="sticky bottom-0 z-10 mt-6 pb-4">
        <div className="mx-auto flex max-w-md flex-col items-center gap-2">
          <button
            onClick={onStart}
            disabled={!ready}
            className="booth-title w-full rounded-[20px] border-4 border-[#24405a] bg-[#ff6f91] px-6 py-3 text-3xl text-white shadow-[0_8px_0_#24405a] transition hover:bg-[#ff829f] active:translate-y-2 active:shadow-none disabled:cursor-not-allowed disabled:bg-[#c9cfd6] sm:text-4xl"
          >
            {startLabel}
          </button>
          {players.length < MIN_PLAYERS && (
            <p className="rounded-full border-[3px] border-[#24405a] bg-white px-3 py-0.5 text-sm font-bold text-[#24405a]">ต้องมีผู้เล่นอย่างน้อย {MIN_PLAYERS} คน</p>
          )}
        </div>
      </div>
      </div>
      </div>
    </div>
  )
}
