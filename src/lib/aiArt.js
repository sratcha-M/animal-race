// ภาพฉากหลังจาก AI (ถ้ามี) — สร้างด้วย scripts/gen_assets.py
const bg = Object.values(import.meta.glob('../assets/ai/bg.{webp,png,jpg}', { eager: true, import: 'default' }))
export const AI_BG = bg[0] ?? null

// โปสเตอร์ของแต่ละเกม (ไฟล์ชื่อเดียวกับ id ของแท็บ เช่น race, bomb, wheel) แสดงที่หน้าตั้งค่าผู้เล่น
export const POSTERS = Object.fromEntries(
  Object.entries(import.meta.glob('../assets/ai/posters/*.{webp,png,jpg}', { eager: true, import: 'default' }))
    .map(([path, url]) => [path.split('/').pop().replace(/\.\w+$/, ''), url]),
)
