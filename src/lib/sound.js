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
