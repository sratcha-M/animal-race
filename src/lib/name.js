// ชื่อผู้เล่น: ใช้ได้เฉพาะตัวอักษร (ไทย/อังกฤษ/ภาษาอื่น) และช่องว่าง — ไม่รับตัวเลข สัญลักษณ์ หรืออีโมจิ
export const NAME_MAX = 16
export function cleanName(s) {
  return String(s ?? '')
    .replace(/[^\p{L}\p{M} ]/gu, '')
    .replace(/ {2,}/g, ' ')
    .replace(/^ +/, '')
    .slice(0, NAME_MAX)
}
export const isValidName = (s) => cleanName(s).trim().length > 0
// ชื่อซ้ำ: เทียบแบบไม่สนตัวพิมพ์เล็ก/ใหญ่ และไม่นับช่องว่างหัวท้าย
const key = (s) => cleanName(s).trim().toLowerCase()
export const nameTaken = (name, players, exceptId) => {
  const k = key(name)
  return !!k && players.some((p) => p.id !== exceptId && key(p.name) === k)
}
