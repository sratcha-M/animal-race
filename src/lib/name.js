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
