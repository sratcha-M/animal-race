// ภาพฉากหลังจาก AI (ถ้ามี) — สร้างด้วย scripts/gen_assets.py
const bg = Object.values(import.meta.glob('../assets/ai/bg.{webp,png,jpg}', { eager: true, import: 'default' }))
export const AI_BG = bg[0] ?? null
