import { useEffect, useMemo, useRef, useState } from 'react'
import Animal from './Animal'
import BombSvg from './BombSvg'
import { ANIMALS, animalById } from '../game/constants'
import { openRoom, newId } from '../lib/net'
import { cleanName, nameTaken } from '../lib/name'
import { load, save } from '../lib/storage'
import { beep } from '../lib/sound'

const shell = 'min-h-dvh bg-[radial-gradient(ellipse_at_top,#ffffff_0%,#fff4f8_50%,#ffe3ee_100%)] px-4 py-6 text-slate-900'

// หน้าจอของเพื่อนที่เข้ามาเล่นจากมือถือ: พิมพ์ชื่อ เลือกสัตว์ แล้วรอเล่นตามจอหลัก
export default function GuestApp({ code }) {
  const me = useMemo(() => {
    let id = null
    try { id = sessionStorage.getItem('animal-race:guest-id') } catch { /* ignore */ }
    if (!id) { id = newId(); try { sessionStorage.setItem('animal-race:guest-id', id) } catch { /* ignore */ } }
    return id
  }, [])
  const [name, setName] = useState(() => cleanName(load('animal-race:guest-name', '')))
  const [animal, setAnimal] = useState(null)
  const [joined, setJoined] = useState(false)
  const [state, setState] = useState(null)
  const [hostSeen, setHostSeen] = useState(0)
  const [kicked, setKicked] = useState(false)
  const [closed, setClosed] = useState(false)
  const [now, setNow] = useState(Date.now())
  const net = useRef(null)

  useEffect(() => {
    net.current = openRoom(code, me, {
      onMessage: (m) => {
        if (m.type === 'state') { setState(m.data); setHostSeen(Date.now()); setClosed(false) }
        if (m.type === 'kick' && m.data?.id === me) setKicked(true)
        if (m.type === 'closed') setClosed(true)
      },
      onPeers: (ps) => { if (ps.some((p) => p.role === 'host')) setHostSeen(Date.now()) },
    })
    net.current.track({ role: 'watcher' })
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => { clearInterval(t); net.current?.close() }
  }, [code, me])

  const takenBy = (id) => state?.players?.find((p) => p.animal === id && p.id !== me)
  const mine = state?.players?.find((p) => p.id === me)

  // เลือกสัตว์ตัวแรกที่ว่างให้อัตโนมัติ
  useEffect(() => {
    if (!animal && state) setAnimal(ANIMALS.find((a) => !takenBy(a.id))?.id ?? null)
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  const join = () => {
    const n = cleanName(name).trim()
    if (!n || !animal) return
    save('animal-race:guest-name', n)
    net.current.track({ role: 'guest', name: n, animal })
    setJoined(true)
  }
  const changeAnimal = (id) => {
    setAnimal(id)
    if (joined) net.current.track({ role: 'guest', name: cleanName(name).trim(), animal: id })
  }

  const hostAlive = now - hostSeen < 7000

  if (kicked) return <Center title="เจ้าของห้องนำคุณออกจากห้องแล้ว" />
  if (closed) return <Center title="ห้องนี้ปิดแล้ว" sub="ขอบคุณที่มาเล่นด้วยกัน" />

  // ---------- หน้าเข้าห้อง ----------
  if (!joined || !mine) {
    const nameOk = cleanName(name).trim().length > 0
    const dupe = nameOk && nameTaken(name, state?.players ?? [], me)
    const full = state && state.players.length >= 8 && !mine
    return (
      <main className={shell}>
        <div className="mx-auto max-w-md">
          <div className="text-center">
            <div className="text-sm font-semibold text-sky-700">ห้อง {code}</div>
            <h1 className="text-3xl font-extrabold text-rose-500">เข้าห้องเล่นกับเพื่อน</h1>
            <p className="mt-1 text-sm text-rose-900/60">{hostAlive ? 'เจอห้องแล้ว! พิมพ์ชื่อแล้วเลือกสัตว์ได้เลย' : 'กำลังหาห้อง... ให้เจ้าของห้องเปิดหน้าเกมค้างไว้'}</p>
          </div>
          <label className="mt-5 block text-sm font-semibold text-slate-700" htmlFor="guest-name">ชื่อของคุณ</label>
          <input id="guest-name" value={name} maxLength={16} autoComplete="nickname"
                 onChange={(e) => setName(cleanName(e.target.value))}
                 onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) join() }}
                 placeholder="พิมพ์ชื่อ"
                 className="mt-1 w-full rounded-xl border-2 border-rose-200 bg-white px-4 py-3 text-lg outline-none focus:border-rose-400" />
          <p className={`mt-1 text-xs ${dupe ? 'text-rose-600' : 'text-rose-900/50'}`}>{dupe ? 'ชื่อนี้มีคนใช้แล้ว กรุณาใช้ชื่ออื่น' : 'ใช้ได้เฉพาะตัวอักษร ไม่รับตัวเลข สัญลักษณ์ หรืออีโมจิ และห้ามซ้ำกัน'}</p>

          <div className="mt-4 text-sm font-semibold text-slate-700">เลือกสัตว์</div>
          <div className="mt-1 grid grid-cols-5 gap-1.5">
            {ANIMALS.map((a) => {
              const owner = takenBy(a.id)
              return (
                <button key={a.id} type="button" disabled={!!owner} onClick={() => changeAnimal(a.id)} aria-pressed={animal === a.id} aria-label={a.name}
                        className={`flex flex-col items-center overflow-hidden rounded-xl px-0.5 pb-0.5 pt-1 ${animal === a.id ? 'bg-rose-100 ring-2 ring-rose-400' : 'bg-white'} ${owner ? 'opacity-40' : ''}`}>
                  <Animal animal={a.id} className="w-full" />
                  <span className="max-w-full truncate text-[10px] text-slate-600">{owner ? owner.name : a.name}</span>
                </button>
              )
            })}
          </div>
          <button onClick={join} disabled={!nameOk || dupe || !animal || full}
                  className="mt-5 w-full rounded-2xl bg-amber-400 px-6 py-4 text-2xl font-extrabold text-amber-950 shadow-lg hover:bg-amber-300 active:scale-95 disabled:opacity-40">
            {full ? 'ห้องเต็มแล้ว (8 คน)' : joined && !mine ? 'กำลังเข้าห้อง...' : 'เข้าห้อง!'}
          </button>
        </div>
      </main>
    )
  }

  // ---------- เข้าห้องแล้ว ----------
  const s = state
  const nameOf = (id) => s.players.find((p) => p.id === id)?.name ?? 'เพื่อน'
  const animalOf = (id) => s.players.find((p) => p.id === id)?.animal
  const b = s.bomb

  if (!hostAlive) return <Center title="ขาดการเชื่อมต่อกับจอหลัก" sub="กำลังเชื่อมต่อใหม่..." me={mine} />

  // ระเบิดเวลา
  if (s.screen === 'bomb' && b) {
    if (b.phase === 'live') {
      if (b.holderId === me) return <HoldingBomb auto={b.auto} onPass={() => { net.current.send('pass', {}); beep(800, 0.05, 'triangle') }} />
      return <Center title={`ระเบิดอยู่ที่ ${nameOf(b.holderId)}`} sub="เตรียมรับ! ถ้ามาถึงคุณ ให้รีบกดส่งต่อ" me={mine} bomb />
    }
    if (b.phase === 'boom') {
      return b.loserId === me
        ? <Center title="ตูม!! คุณโดน" sub={`บทลงโทษ: ${b.penalty}`} me={mine} boom />
        : <Center title={`ตูม!! ${nameOf(b.loserId)} โดน`} sub="รอดไปอีกรอบ เฮ้อ" me={{ ...mine, animal: animalOf(b.loserId) ?? mine.animal }} />
    }
    if (b.phase === 'winner') {
      const w = b.activeIds?.[0]
      return <Center title={w === me ? 'คุณคือผู้รอดคนสุดท้าย!' : `${nameOf(w)} รอดคนสุดท้าย`} me={{ ...mine, animal: animalOf(w) ?? mine.animal }} />
    }
    const out = b.activeIds && !b.activeIds.includes(me)
    return <Center title={out ? 'รอบนี้คุณดูเชียร์' : 'รอจุดชนวน...'} sub="ระเบิดจะเริ่มที่ใครก็ได้ ดูมือถือไว้ให้ดี" me={mine} bomb />
  }
  // แข่งวิ่ง
  if (s.screen === 'race') {
    const inRace = s.racers?.includes(me)
    return <Center title={inRace ? 'แข่งกันอยู่! ลุ้นที่จอหลัก' : 'รอบนี้คุณดูเชียร์'} sub={inRace ? 'สัตว์ของคุณกำลังวิ่งสุดแรง' : ''} me={mine} running={inRace} />
  }
  if (s.screen === 'results' && s.race) {
    const rank = s.race.ranking.indexOf(me) + 1
    const winner = s.race.ranking[0]
    return <Center
      title={rank === 1 ? 'คุณชนะ!' : rank > 0 ? `คุณได้อันดับ ${rank}` : `${nameOf(winner)} ชนะ`}
      sub={rank > 1 ? `${nameOf(winner)} เข้าเส้นชัยเป็นคนแรก` : ''}
      me={rank === 1 ? mine : { ...mine, animal: animalOf(winner) ?? mine.animal }} running={rank === 1} />
  }
  if (s.screen === 'summary' && s.summary) {
    const r = s.summary.indexOf(me) + 1
    return <Center title={r > 0 ? `สรุป: คุณได้อันดับ ${r}` : 'จบเกมแล้ว'} sub={`อันดับ 1 คือ ${nameOf(s.summary[0])}`} me={mine} />
  }
  // ห้องรอ
  return (
    <main className={shell}>
      <div className="mx-auto max-w-md text-center">
        <div className="text-sm font-semibold text-sky-700">ห้อง {code} · {{ bomb: 'ระเบิดเวลา', claw: 'ตู้คีบตุ๊กตา', wheel: 'วงล้อสุ่ม' }[s.tab] ?? 'แข่งวิ่ง'}</div>
        <div className="float mx-auto mt-3 w-44"><Animal animal={mine.animal} number={mine.num} running /></div>
        <h1 className="text-3xl font-extrabold text-rose-500">{mine.name}</h1>
        <p className="mt-1 text-rose-900/70">เข้าห้องแล้ว! รอเจ้าของห้องเริ่มเกม</p>
        <div className="mt-4 grid grid-cols-5 gap-1.5">
          {ANIMALS.map((a) => {
            const owner = takenBy(a.id)
            return (
              <button key={a.id} type="button" disabled={!!owner} onClick={() => changeAnimal(a.id)} aria-label={`เปลี่ยนเป็น${a.name}`}
                      className={`overflow-hidden rounded-xl p-0.5 ${mine.animal === a.id ? 'bg-rose-100 ring-2 ring-rose-400' : 'bg-white'} ${owner ? 'opacity-30' : ''}`}>
                <Animal animal={a.id} className="w-full" />
              </button>
            )
          })}
        </div>
        <p className="mt-1 text-xs text-rose-900/50">แตะเพื่อเปลี่ยนสัตว์</p>
        <ul className="mt-5 flex flex-wrap justify-center gap-2">
          {s.players.map((p) => (
            <li key={p.id} className={`flex items-center gap-1 rounded-full py-1 pl-1 pr-3 text-sm ring-1 ${p.id === me ? 'bg-rose-100 ring-rose-300' : 'bg-white ring-rose-100'}`}>
              <span className="w-8"><Animal animal={p.animal} /></span>
              <span className="font-semibold">{p.name}{p.id === me && ' (คุณ)'}</span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}

function Center({ title, sub, me, running, bomb, boom }) {
  return (
    <main className={`${shell} flex flex-col items-center justify-center text-center ${boom ? 'boom-shake' : ''}`}>
      {boom && <div className="boom-flash pointer-events-none fixed inset-0" />}
      {me && (
        <div className="relative mx-auto w-48">
          <div className={boom ? 'sooty' : 'float'}><Animal animal={me.animal} number={me.num} running={running} /></div>
          {bomb && <BombSvg className="absolute -right-8 -top-4 w-16" />}
        </div>
      )}
      <h1 className="pop mt-3 text-3xl font-extrabold text-rose-600" key={title}>{title}</h1>
      {sub && <p className="mt-2 max-w-xs text-rose-900/70">{sub}</p>}
    </main>
  )
}

// ระเบิดอยู่ในมือเรา: จอแดงทั้งจอ ปุ่มใหญ่ ๆ
function HoldingBomb({ onPass, auto }) {
  const [sent, setSent] = useState(false)
  useEffect(() => {
    try { navigator.vibrate?.([120, 60, 120]) } catch { /* ignore */ }
    const t = setInterval(() => beep(1300, 0.03, 'square', 0.03), 450)
    return () => clearInterval(t)
  }, [])
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-gradient-to-b from-rose-500 to-orange-500 px-4 text-center text-white">
      <div className="bomb w-48" style={{ position: 'static' }}><BombSvg className="w-full drop-shadow-2xl" /></div>
      <h1 className="text-4xl font-extrabold drop-shadow">ระเบิดอยู่ที่คุณ!</h1>
      {auto ? <p className="text-xl font-bold">ระเบิดวนเอง... ลุ้นให้มันไปต่อ!</p> : <button onClick={() => { if (!sent) { setSent(true); onPass(); setTimeout(() => setSent(false), 1200) } }}
              className="w-full max-w-xs rounded-3xl bg-white px-6 py-8 text-4xl font-extrabold text-rose-600 shadow-2xl active:scale-95">
        {sent ? 'กำลังส่ง...' : 'ส่งต่อ! ➜'}
      </button>}
    </main>
  )
}
