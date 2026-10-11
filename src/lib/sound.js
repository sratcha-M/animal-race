// เสียงสั้น ๆ ด้วย Web Audio (ไม่ต้องใช้ไฟล์เสียง)
let ctx
function ac() {
  try { ctx ??= new (window.AudioContext || window.webkitAudioContext)() } catch { return null }
  return ctx
}
export function beep(freq = 660, dur = 0.12, type = 'square', vol = 0.06) {
  const c = ac(); if (!c) return
  const o = c.createOscillator(); const g = c.createGain()
  o.type = type; o.frequency.value = freq
  g.gain.setValueAtTime(vol, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur)
  o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + dur)
}
export function fanfare() {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.18, 'triangle', 0.08), i * 140))
}

// เสียงระเบิด: noise ลดเสียงลง + เสียงทุ้ม
export function boom() {
  const c = ac(); if (!c) return
  const len = c.sampleRate * 1.4
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5)
  const src = c.createBufferSource(); src.buffer = buf
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900
  const g = c.createGain(); g.gain.value = 0.5
  src.connect(lp).connect(g).connect(c.destination); src.start()
  const o = c.createOscillator(); const og = c.createGain()
  o.type = 'sine'; o.frequency.setValueAtTime(120, c.currentTime); o.frequency.exponentialRampToValueAtTime(30, c.currentTime + 0.8)
  og.gain.setValueAtTime(0.5, c.currentTime); og.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.9)
  o.connect(og).connect(c.destination); o.start(); o.stop(c.currentTime + 0.9)
}
