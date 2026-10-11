export const rand = (a, b) => a + Math.random() * (b - a)
export const randInt = (n) => Math.floor(Math.random() * n)
export const pick = (arr) => arr[randInt(arr.length)]
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1); [a[i], a[j]] = [a[j], a[i]] }
  return a
}
