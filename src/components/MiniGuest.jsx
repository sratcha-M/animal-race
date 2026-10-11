import { useEffect, useState } from 'react'
import Animal from './Animal'
import { beep } from '../lib/sound'

const shell = 'min-h-dvh bg-[radial-gradient(ellipse_at_top,#ffffff_0%,#fff4f8_50%,#ffe3ee_100%)] px-4 py-6 text-slate-900'

// หน้าจอมือถือของเพื่อนในเกมย่อยแต่ละเกม: กดสั่งเกมที่จอหลัก และดูผลของตัวเอง
export default function MiniGuest({ game, title, g, me, mine, players, send }) {
  const nameOf = (id) => players.find((p) => p.id === id)?.name ?? 'เพื่อน'
  const animalOf = (id) => players.find((p) => p.id === id)?.animal ?? mine.animal
  if (!g) return <Wait title={title} sub="รอจอหลักเริ่มเกม..." mine={mine} />

  const result = (label, winnerId) => (
    <Wait title={winnerId === me ? 'คุณโดนเลือก!' : `${nameOf(winnerId)} ${label}`} sub={winnerId === me ? '' : 'รอรอบต่อไป'} mine={{ ...mine, animal: animalOf(winnerId) }} />
  )

  switch (game) {
    case 'wheel':
      if (g.phase === 'spin') return <Wait title="วงล้อกำลังหมุน..." sub="ลุ้นว่าลูกศรจะชี้ใคร" mine={mine} spin />
      if (g.phase === 'done') return result('โดนเลือก', g.winnerId)
      return <Action title="วงล้อสุ่ม" label="หมุนวงล้อ!" onGo={() => send('wheel-spin')} mine={mine} />

    case 'claw':
      if (g.phase === 'play') return <Wait title="ก้ามปูกำลังคีบ..." sub={g.msg || ''} mine={mine} spin />
      if (g.phase === 'done') return result('ถูกคีบ', g.winnerId)
      return <Action title="ตู้คีบตุ๊กตา" label="คีบเลย!" onGo={() => send('claw-go')} mine={mine} />

    case 'dart':
      if (g.phase === 'busy') return <Wait title="ลูกดอกกำลังไป..." sub={g.msg || ''} mine={mine} spin />
      if (g.phase === 'done') return result('โดนลูกดอก', g.winnerId)
      return <Action title="ปาเป้า" label="ปา!" onGo={() => send('dart-throw')} mine={mine} />

    case 'slot':
      return <Action title="สล็อตแมชชีน" label={g.spinning ? 'กำลังหมุน...' : 'ดึงคันโยก!'} disabled={g.spinning} onGo={() => send('slot-pull')} mine={mine}
                     extra={g.result ? <p className="pop mt-2 text-2xl font-extrabold text-rose-600">{g.result}</p> : null} />

    case 'balloon': {
      if (g.phase === 'done') return result('รอดคนสุดท้าย', g.winnerId)
      if (g.phase === 'ready') return <Action title="ลูกโป่งแตก" label="ปล่อยลูกโป่ง!" onGo={() => send('balloon-start')} mine={mine} />
      const alive = (g.alive ?? [])
      if (g.mode === 'tap' && g.canTap) {
        return (
          <main className={shell}>
            <div className="mx-auto max-w-md text-center">
              <h1 className="text-2xl font-extrabold text-rose-500">แตะลูกโป่งให้แตก!</h1>
              <p className="text-sm text-slate-500">เหลือ {alive.length} ลูก{g.secLeft != null ? ` · ⏱ ${g.secLeft}` : ''}</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {alive.map((id) => (
                  <button key={id} onClick={() => { send('balloon-tap', { id }); beep(900, 0.05, 'sine') }} className="rounded-2xl bg-white p-2 shadow ring-2 ring-pink-200 active:scale-95">
                    <Animal animal={animalOf(id)} /><div className="truncate text-sm font-extrabold text-rose-500">{nameOf(id)}</div>
                  </button>
                ))}
              </div>
            </div>
          </main>
        )
      }
      return <Wait title={g.tense ? 'เหลือ 2 ลูกสุดท้าย... ลุ้นนน!' : 'ลูกโป่งกำลังแตก...'} sub={`เหลือ ${alive.length} ลูก${alive.includes(me) ? ' · ลูกของคุณยังรอดอยู่' : ' · ลูกของคุณแตกแล้ว'}`} mine={mine} spin />
    }

    case 'ladder': {
      const mineResult = g.results?.[me]
      return (
        <main className={`${shell} flex flex-col items-center text-center`}>
          <h1 className="text-3xl font-extrabold text-rose-500">บันไดงู</h1>
          <div className="float mx-auto mt-3 w-40"><Animal animal={mine.animal} number={mine.num} running /></div>
          {mineResult ? (
            <>
              <p className="mt-2 text-sm text-slate-500">ปลายทางของคุณคือ</p>
              <h2 className="pop text-4xl font-extrabold text-rose-600">{mineResult}</h2>
            </>
          ) : (
            <button onClick={() => { send('ladder-go'); beep(700, 0.06, 'triangle') }} className="mt-4 w-full max-w-xs rounded-3xl bg-amber-400 px-6 py-6 text-3xl font-extrabold text-amber-950 shadow-xl active:scale-95">ปล่อยเส้นของฉัน!</button>
          )}
          <ul className="mt-5 flex flex-wrap justify-center gap-1.5 text-sm">
            {(g.slots ?? []).map((t, i) => <li key={i} className="rounded-full bg-white px-3 py-1 font-semibold text-slate-600 ring-1 ring-rose-100">{t}</li>)}
          </ul>
          {(g.shown ?? []).filter((id) => id !== me).length > 0 && (
            <ul className="mt-4 w-full max-w-xs space-y-1 text-sm">
              {g.shown.filter((id) => id !== me).map((id) => (
                <li key={id} className="flex justify-between rounded-lg bg-white/80 px-3 py-1 ring-1 ring-rose-100"><b>{nameOf(id)}</b><span className="text-rose-600">{g.results?.[id]}</span></li>
              ))}
            </ul>
          )}
        </main>
      )
    }

    case 'cards': {
      const m = g.cards?.length ?? 0
      const bySlot = Object.fromEntries((g.cards ?? []).map((c) => [c.slot, c]))
      const hint = { show: 'จำตำแหน่งไพ่ไว้!', shuffle: 'กำลังสลับไพ่...', play: g.mode === 'pick' ? 'แตะไพ่ 1 ใบ' : `เปิดทีละ 2 ใบ · ครั้งที่ ${g.attempts ?? 0}`, ready: 'รอเริ่มเกมที่จอหลัก', done: g.winnerId ? `${nameOf(g.winnerId)} โดนเลือก!` : 'จับคู่ครบแล้ว!' }[g.phase] ?? ''
      return (
        <main className={shell}>
          <div className="mx-auto max-w-md text-center">
            <h1 className="text-2xl font-extrabold text-rose-500">ไพ่คว่ำ</h1>
            <p className="pop mb-3 text-lg font-bold text-slate-600" key={hint}>{hint}</p>
            {m > 0 && (
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${g.cols ?? 3}, minmax(0, 1fr))` }}>
                {Array.from({ length: m }, (_, s) => bySlot[s]).map((c, s) => c && (
                  <button key={c.id} disabled={g.phase !== 'play' || c.up} onClick={() => { send('cards-flip', { id: c.id }); beep(600, 0.05, 'square') }} aria-label={c.up ? c.name : `ไพ่ใบที่ ${s + 1}`}
                          className={`aspect-[3/4] overflow-hidden rounded-xl p-1 shadow ring-2 transition active:scale-95 ${c.up ? (c.matched ? 'bg-white ring-amber-400' : 'bg-white ring-rose-200') : 'bg-rose-400 ring-white'}`}>
                    {c.up ? <span className="flex h-full flex-col items-center justify-center"><span className="w-[80%]"><Animal animal={c.animal} /></span><span className="max-w-full truncate text-xs font-extrabold text-rose-700">{c.name}</span></span>
                      : <span className="grid h-full place-items-center text-2xl font-extrabold text-white/80">?</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </main>
      )
    }

    default:
      return <Wait title={`${title}กำลังเล่นอยู่`} sub="ดูผลที่จอหลักได้เลย" mine={mine} />
  }
}

function Wait({ title, sub, mine, spin }) {
  return (
    <main className={`${shell} flex flex-col items-center justify-center text-center`}>
      <div className="relative mx-auto w-48"><div className={spin ? 'balloon-bob' : 'float'}><Animal animal={mine.animal} number={mine.num} running={spin} /></div></div>
      <h1 className="pop mt-3 text-3xl font-extrabold text-rose-600" key={title}>{title}</h1>
      {sub && <p className="mt-2 max-w-xs text-rose-900/70">{sub}</p>}
    </main>
  )
}

function Action({ title, label, onGo, disabled, mine, extra }) {
  const [sent, setSent] = useState(false)
  useEffect(() => { if (sent) { const t = setTimeout(() => setSent(false), 900); return () => clearTimeout(t) } return undefined }, [sent])
  return (
    <main className={`${shell} flex flex-col items-center justify-center gap-4 text-center`}>
      <h1 className="text-3xl font-extrabold text-rose-500">{title}</h1>
      <div className="float w-44"><Animal animal={mine.animal} number={mine.num} /></div>
      <button disabled={disabled || sent} onClick={() => { setSent(true); onGo(); try { navigator.vibrate?.(60) } catch { /* ignore */ } beep(500, 0.08, 'triangle') }}
              className="w-full max-w-xs rounded-3xl bg-amber-400 px-6 py-8 text-4xl font-extrabold text-amber-950 shadow-xl active:scale-95 disabled:opacity-50">{label}</button>
      {extra}
      <p className="text-xs text-slate-500">กดแล้วผลจะขึ้นที่จอหลัก (และที่นี่)</p>
    </main>
  )
}
