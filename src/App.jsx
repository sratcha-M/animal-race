import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Setup from './components/Setup'
import Race from './components/Race'
import Results from './components/Results'
import Summary from './components/Summary'
import Bomb from './components/Bomb'
import { MINI, MINI_BY_ID } from './games'
import RoomPanel from './components/RoomPanel'
import GuestApp from './components/GuestApp'
import { load, save } from './lib/storage'
import { ANIMALS, MAX_PLAYERS } from './game/constants'
import { openRoom, newId, newRoomCode, normCode } from './lib/net'
import { cleanName, nameTaken } from './lib/name'

const validPlayers = (ps) =>
  Array.isArray(ps) ? ps.filter((p) => p && p.name && !p.remote && ANIMALS.some((a) => a.id === p.animal)) : []

// เปิดลิงก์ที่มี ?room=CODE = เพื่อนที่เข้ามาเล่นจากมือถือ
export default function App() {
  const code = useMemo(() => normCode(new URLSearchParams(window.location.search).get('room')), [])
  return code.length === 4 ? <GuestApp code={code} /> : <HostApp />
}

function HostApp() {
  const [screen, setScreen] = useState('setup') // setup | race | results | summary | bomb
  const [tab, setTab] = useState(() => load('animal-race:tab', 'race')) // race | bomb | claw | wheel
  const [players, setPlayers] = useState(() => validPlayers(load('animal-race:players', [])))
  const [results, setResults] = useState([])
  const [wins, setWins] = useState(() => load('animal-race:wins', {}))
  const [raceKey, setRaceKey] = useState(0)
  // โหมดคัดออก: activeIds = คนที่ยังแข่งอยู่, history = ผู้ชนะที่ถูกคัดออกแต่ละรอบ
  const [activeIds, setActiveIds] = useState(null)
  const [history, setHistory] = useState([])

  useEffect(() => save('animal-race:players', players.filter((p) => !p.remote)), [players])
  useEffect(() => save('animal-race:tab', tab), [tab])

  // ---------- ห้องออนไลน์ ----------
  const [room, setRoom] = useState(null) // { code }
  const [guests, setGuests] = useState([])
  const [bombNet, setBombNet] = useState(null)
  const net = useRef(null)
  const hostId = useRef(newId())
  const kicked = useRef(new Set())
  const passHandler = useRef(null)

  const openHostRoom = () => {
    const code = newRoomCode()
    net.current = openRoom(code, hostId.current, {
      onMessage: (m) => { if (m.type === 'pass') passHandler.current?.(m.from) },
      onPeers: (ps) => setGuests(ps.filter((p) => p.role === 'guest' && p.id !== hostId.current)),
    })
    net.current.track({ role: 'host' })
    setRoom({ code })
  }
  const closeHostRoom = () => {
    net.current?.send('closed', {})
    net.current?.close(); net.current = null
    setRoom(null); setGuests([])
    setPlayers((ps) => ps.filter((p) => !p.remote))
  }
  useEffect(() => () => net.current?.close(), [])

  // เพื่อนที่เข้าห้อง -> เพิ่มเป็นผู้เล่นอัตโนมัติ (สัตว์ซ้ำจะได้ตัวที่ว่างแทน)
  useEffect(() => {
    if (!room) return
    setPlayers((ps) => {
      let next = ps.filter((p) => !p.remote || guests.some((g) => g.id === p.id))
      for (const g of guests) {
        if (kicked.current.has(g.id)) continue
        const name = cleanName(g.name).trim() || 'เพื่อน'
        if (nameTaken(name, next, g.id)) continue
        const free = (id, self) => ANIMALS.some((a) => a.id === id) && !next.some((p) => p.animal === id && p.id !== self)
        const i = next.findIndex((p) => p.id === g.id)
        if (i >= 0) {
          const cur = next[i]
          const animal = g.animal !== cur.animal && free(g.animal, g.id) ? g.animal : cur.animal
          if (cur.name !== name || cur.animal !== animal) next = next.map((p, k) => (k === i ? { ...p, name, animal } : p))
        } else if (next.length < MAX_PLAYERS) {
          const animal = free(g.animal, g.id) ? g.animal : ANIMALS.find((a) => free(a.id, g.id))?.id
          if (animal) next = [...next, { id: g.id, name, animal, remote: true }]
        }
      }
      const same = next.length === ps.length && next.every((p, i) => p === ps[i])
      return same ? ps : next
    })
  }, [guests, room])

  const removePlayer = useCallback((p) => {
    if (p.remote) { kicked.current.add(p.id); net.current?.send('kick', { id: p.id }) }
  }, [])

  // ผู้เล่นที่ลงแข่งรอบนี้ (คงเบอร์เดิมตามลำดับในรายชื่อ)
  const racers = useMemo(
    () => players.map((p, i) => ({ ...p, num: i + 1 })).filter((p) => !activeIds || activeIds.includes(p.id)),
    [players, activeIds],
  )

  // ส่งสถานะเกมให้มือถือเพื่อนทุกครั้งที่เปลี่ยน + ทุก 2 วินาที (เผื่อคนเข้ามาทีหลัง)
  const stateRef = useRef(null)
  useEffect(() => {
    if (!room) return
    const s = {
      screen, tab,
      players: players.map((p, i) => ({ id: p.id, name: p.name, animal: p.animal, num: i + 1 })),
      racers: screen === 'race' ? racers.map((p) => p.id) : null,
      race: screen === 'results' ? { ranking: results.map((r) => r.id), times: results.map((r) => Number(r.time.toFixed(2))) } : null,
      summary: screen === 'summary' ? history.map((h) => h.player.id) : null,
      bomb: screen === 'bomb' ? bombNet : null,
    }
    stateRef.current = s
    net.current?.send('state', s)
  }, [room, screen, tab, players, racers, results, history, bombNet])
  useEffect(() => {
    if (!room) return
    const t = setInterval(() => stateRef.current && net.current?.send('state', stateRef.current), 2000)
    return () => clearInterval(t)
  }, [room])

  const go = () => { setRaceKey((k) => k + 1); setScreen('race') }
  const trimNames = () => setPlayers((ps) => ps.map((p) => ({ ...p, name: p.name.trim() })))
  const startFresh = () => {
    trimNames()
    setActiveIds(null)
    setHistory([])
    go()
  }
  const finish = (res) => {
    const w = { ...wins, [res[0].name]: (wins[res[0].name] ?? 0) + 1 }
    setWins(w); save('animal-race:wins', w)
    setResults(res)
    setScreen('results')
  }
  // คัดผู้ชนะออก แล้วให้ที่เหลือแข่งต่อ
  const eliminateWinner = () => {
    const winner = results[0]
    const nextHistory = [...history, { round: history.length + 1, player: winner, time: winner.time }]
    const remaining = racers.filter((p) => p.id !== winner.id)
    if (remaining.length <= 1) {
      if (remaining[0]) nextHistory.push({ round: null, player: remaining[0], last: true })
      setHistory(nextHistory)
      setActiveIds(null)
      setScreen('summary')
      return
    }
    setHistory(nextHistory)
    setActiveIds(remaining.map((p) => p.id))
    go()
  }

  return (
    <main className="min-h-full bg-[radial-gradient(ellipse_at_top,#ffffff_0%,#fff4f8_50%,#ffe3ee_100%)] text-slate-900">
      {screen === 'setup' && (
        <Setup
          players={players} setPlayers={setPlayers} onRemove={removePlayer}
          tabs={<>
            <GameTabs tab={tab} setTab={setTab} />
            <RoomPanel room={room} guests={guests.length} onOpen={openHostRoom} onClose={closeHostRoom} />
          </>}
          {...(tab === 'bomb'
            ? { title: 'ระเบิดเวลา', subtitle: 'ส่งระเบิดต่อกันไปเรื่อย ๆ ระเบิดอยู่ในมือใครตอนตูม คนนั้นโดน!', startLabel: 'ไปเล่นระเบิดเวลา!',
                onStart: () => { trimNames(); setBombNet(null); setScreen('bomb') } }
            : MINI_BY_ID[tab]
              ? { title: MINI_BY_ID[tab].title, subtitle: MINI_BY_ID[tab].subtitle, startLabel: MINI_BY_ID[tab].startLabel,
                  onStart: () => { trimNames(); setScreen(tab) } }
              : { onStart: startFresh })}
        />
      )}
      {screen === 'bomb' && (
        <div className="min-h-dvh">
          <Bomb players={players} onBack={() => setScreen('setup')}
                onNet={room ? setBombNet : undefined}
                registerPass={(fn) => { passHandler.current = fn; return () => { passHandler.current = null } }} />
        </div>
      )}
      {MINI_BY_ID[screen] && (() => { const { Comp } = MINI_BY_ID[screen]; return <Comp key={screen} players={players} onBack={() => setScreen('setup')} /> })()}
      {screen === 'race' && (
        <div className="h-dvh">
          <Race key={raceKey} players={racers} round={history.length + 1} eliminating={history.length > 0}
                onFinish={finish} onQuit={() => setScreen('setup')} />
        </div>
      )}
      {screen === 'results' && (
        <Results
          results={results} wins={wins} history={history} round={history.length + 1}
          onEliminate={eliminateWinner} onRematch={go} onRestartAll={startFresh} onEdit={() => setScreen('setup')}
        />
      )}
      {screen === 'summary' && (
        <Summary history={history} onRestartAll={startFresh} onEdit={() => setScreen('setup')} />
      )}
    </main>
  )
}

function GameTabs({ tab, setTab }) {
  const tabs = [
    { id: 'race', label: 'แข่งวิ่ง' },
    { id: 'bomb', label: 'ระเบิดเวลา' },
    ...MINI.map(({ id, label }) => ({ id, label })),
  ]
  return (
    <div role="tablist" aria-label="เลือกเกม" className="mx-auto mb-4 flex w-full max-w-md flex-wrap justify-center gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-rose-100">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                className={`rounded-xl px-3 py-1.5 text-sm font-bold sm:text-base transition ${tab === t.id ? 'bg-rose-500 text-white shadow' : 'text-rose-600 hover:bg-rose-50'}`}>
          {t.label}
        </button>
      ))}
    </div>
  )
}
