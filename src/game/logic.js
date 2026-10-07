import {
  BASE_SPEED_MIN, BASE_SPEED_MAX, SURGE_MIN, SURGE_MAX, SURGE_EVERY_MIN, SURGE_EVERY_MAX,
  EVENTS, RUBBER_BAND, animalById, FINAL_STRETCH, SLOWMO_ZONE, SLOWMO_GAP, SLOWMO_SCALE,
} from './constants.js'

const rand = (a, b) => a + Math.random() * (b - a)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

export function initRace(players) {
  return {
    elapsed: 0,
    order: [],          // index ของสัตว์ตามลำดับเข้าเส้นชัย
    stage: 'start',     // start | final | photo
    timeScale: 1,       // < 1 = สโลว์โมชัน
    comebackDone: false,
    announce: null,     // ข้อความประกาศกลางจอ { text, t }
    cats: players.map((p) => {
      const base = rand(BASE_SPEED_MIN, BASE_SPEED_MAX)
      return {
        ...p, pos: 0, base, speed: base * 0.4, target: base, timer: 0,
        event: null, eventT: 0, bubble: '', finished: false, time: null, events: 0,
      }
    }),
  }
}

function startEvent(c, type, dur) {
  const e = EVENTS[type]
  c.event = type
  c.eventT = dur ?? rand(e.dur[0], e.dur[1])
  c.bubble = e.text(animalById(c.animal))
  c.events++
}

// อัปเดตการแข่ง 1 เฟรม คืนค่า index สัตว์ที่เพิ่งเข้าเส้นชัยในเฟรมนี้
export function stepRace(race, realDt) {
  const running = race.cats.filter((c) => !c.finished)
  const sorted = [...running].sort((a, b) => b.pos - a.pos)
  const leadPos = sorted[0]?.pos ?? 1
  const secondPos = sorted[1]?.pos ?? 0

  // สโลว์โมชันตอนใกล้เส้นชัยและสูสี
  const close = race.order.length === 0 && leadPos > SLOWMO_ZONE && leadPos - secondPos < SLOWMO_GAP
  race.timeScale += ((close ? SLOWMO_SCALE : 1) - race.timeScale) * Math.min(1, realDt * 8)
  if (close && race.stage !== 'photo') { race.stage = 'photo'; race.announce = { text: 'สูสีมาก!! ลุ้นนน', t: 1.6 } }
  const dt = realDt * race.timeScale
  race.elapsed += dt

  // ครึ่งทาง: ประกาศ + สลับตัวนำ (ตัวนำเหนื่อย ตัวรั้งท้ายเร่ง)
  if (race.stage === 'start' && !race.halfDone && leadPos > 0.5) {
    race.halfDone = true
    race.announce = { text: 'ครึ่งทางแล้ว! ใครจะแซง?', t: 1.4 }
    if (sorted.length > 2) {
      if (!sorted[0].event) startEvent(sorted[0], 'tired', 1.3)
      const last = sorted[sorted.length - 1]
      startEvent(last, 'turbo', 1.6)
      last.bubble = 'ยังไม่ยอมแพ้!'
    }
  }
  // ทางตรงสุดท้าย: สัตว์ที่ตามหลังได้ "ไฟลุก" แซงกลับ
  if (race.stage === 'start' && leadPos > FINAL_STRETCH) {
    race.stage = 'final'
    race.announce = { text: 'ทางตรงสุดท้าย!', t: 1.4 }
    if (!race.comebackDone && sorted.length > 2) {
      race.comebackDone = true
      const back = pick(sorted.slice(Math.ceil(sorted.length / 2)))
      startEvent(back, 'turbo', 2.2)
      back.bubble = 'ไฟลุก! แซงทางโค้งสุดท้าย'
    }
  }
  if (race.announce) { race.announce.t -= realDt; if (race.announce.t <= 0) race.announce = null }

  const justFinished = []
  race.cats.forEach((c, i) => {
    if (c.finished) return

    // เหตุการณ์สุ่ม
    if (c.event) {
      c.eventT -= dt
      if (c.eventT <= 0) { c.event = null; c.bubble = '' }
    } else if (c.pos > 0.06 && c.pos < 0.97) {
      for (const [type, e] of Object.entries(EVENTS)) {
        let chance = e.chance
        if (type !== 'turbo' && c.pos > FINAL_STRETCH) chance *= 0.5 // ช่วงท้ายสะดุดน้อยลง
        if (type === 'turbo' && c.pos < leadPos - 0.08) chance *= 1.8  // ตัวที่ตามหลังมีโอกาสเร่ง
        if (Math.random() < chance * dt) { startEvent(c, type); break }
      }
    }

    // ความเร็วปกติแบบสุ่ม
    c.timer -= dt
    if (c.timer <= 0) {
      c.target = c.base * rand(SURGE_MIN, SURGE_MAX)
      c.timer = rand(SURGE_EVERY_MIN, SURGE_EVERY_MAX)
    }
    // ยางยืด: ตามหลังมากเร่งขึ้น นำมากช้าลงนิดหน่อย (ให้สูสี)
    const behind = leadPos - c.pos
    const band = c.pos < 0.95 ? 1 + behind * RUBBER_BAND * 3 - (c.pos === leadPos ? 0.05 : 0) : 1
    const mult = c.event ? EVENTS[c.event].mult : 1
    const goal = c.target * band * mult
    const accel = c.event === 'trip' || c.event === 'nap' || c.event === 'snack' ? 10 : 3
    c.speed += (goal - c.speed) * Math.min(1, dt * accel)
    c.pos += c.speed * dt

    if (c.pos >= 1) {
      const over = (c.pos - 1) / Math.max(c.speed, 1e-6)
      c.pos = 1
      c.finished = true
      c.time = race.elapsed - over
      c.event = null
      c.bubble = ''
      justFinished.push(i)
    }
  })
  justFinished.sort((a, b) => race.cats[a].time - race.cats[b].time)
  race.order.push(...justFinished)
  if (race.order.length) race.timeScale = Math.max(race.timeScale, 0.6)
  return justFinished
}

export const isRaceOver = (race) => race.cats.every((c) => c.finished)

export function results(race) {
  return race.order.map((i, rank) => ({ ...race.cats[i], rank: rank + 1 }))
}
