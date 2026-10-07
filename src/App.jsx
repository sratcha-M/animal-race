import { useEffect, useMemo, useState } from 'react'
import Setup from './components/Setup'
import Race from './components/Race'
import Results from './components/Results'
import Summary from './components/Summary'
import { load, save } from './lib/storage'
import { ANIMALS } from './game/constants'

const validPlayers = (ps) => (Array.isArray(ps) ? ps.filter((p) => p && p.name && ANIMALS.some((a) => a.id === p.animal)) : [])

export default function App() {
  const [screen, setScreen] = useState('setup') // setup | race | results | summary
  const [players, setPlayers] = useState(() => validPlayers(load('animal-race:players', [])))
  const [results, setResults] = useState([])
  const [wins, setWins] = useState(() => load('animal-race:wins', {}))
  const [raceKey, setRaceKey] = useState(0)
  // โหมดคัดออก: activeIds = คนที่ยังแข่งอยู่, history = ผู้ชนะที่ถูกคัดออกแต่ละรอบ
  const [activeIds, setActiveIds] = useState(null)
  const [history, setHistory] = useState([])

  useEffect(() => save('animal-race:players', players), [players])

  // ผู้เล่นที่ลงแข่งรอบนี้ (คงเบอร์เดิมตามลำดับในรายชื่อ)
  const racers = useMemo(
    () => players.map((p, i) => ({ ...p, num: i + 1 })).filter((p) => !activeIds || activeIds.includes(p.id)),
    [players, activeIds],
  )

  const go = () => { setRaceKey((k) => k + 1); setScreen('race') }
  const startFresh = () => {
    setPlayers((ps) => ps.map((p) => ({ ...p, name: p.name.trim() })))
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
      {screen === 'setup' && <Setup players={players} setPlayers={setPlayers} onStart={startFresh} />}
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
