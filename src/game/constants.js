// สัตว์ที่ให้เลือก (sound = เสียงร้อง, snack = ของกินที่ทำให้แวะ)
export const ANIMALS = [
  { id: 'cat',     name: 'แมว',      sound: 'เมี๊ยว',  snack: 'ปลาทู' },
  { id: 'dog',     name: 'หมา',      sound: 'โฮ่ง',    snack: 'กระดูก' },
  { id: 'rabbit',  name: 'กระต่าย',  sound: 'ฟุดฟิด',  snack: 'แครอท' },
  { id: 'pig',     name: 'หมู',      sound: 'อู๊ด',     snack: 'แอปเปิ้ล' },
  { id: 'frog',    name: 'กบ',       sound: 'อ๊บ',      snack: 'แมลงวัน' },
  { id: 'bear',    name: 'หมี',      sound: 'โฮก',     snack: 'น้ำผึ้ง' },
  { id: 'panda',   name: 'แพนด้า',   sound: 'งืออ',    snack: 'ใบไผ่' },
  { id: 'fox',     name: 'จิ้งจอก',  sound: 'แง้น',    snack: 'องุ่น' },
  { id: 'chick',   name: 'ลูกเจี๊ยบ', sound: 'เจี๊ยบ',  snack: 'ข้าวโพด' },
  { id: 'penguin', name: 'เพนกวิน',  sound: 'ก๊าบ',    snack: 'ปลาหมึก' },
]
export const animalById = (id) => ANIMALS.find((a) => a.id === id) ?? ANIMALS[0]

export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 8

// ความเร็ว: สัดส่วนของสนามต่อวินาที (0.05 ≈ วิ่งจบใน ~20 วินาที) — อยากให้นานขึ้นลดเลขนี้
export const BASE_SPEED_MIN = 0.05
export const BASE_SPEED_MAX = 0.056
export const SURGE_MIN = 0.7       // ตัวคูณความเร็วปกติต่ำสุด
export const SURGE_MAX = 1.3       // ตัวคูณความเร็วปกติสูงสุด
export const SURGE_EVERY_MIN = 0.4 // สุ่มความเร็วใหม่ทุก ๆ (วินาที)
export const SURGE_EVERY_MAX = 1.0

// เหตุการณ์สุ่มระหว่างวิ่ง (ทำให้ลุ้น): โอกาสเกิดต่อวินาที / ตัวคูณความเร็ว / ระยะเวลา
export const EVENTS = {
  turbo: { chance: 0.16, mult: 2.1,  dur: [0.8, 1.3], text: () => 'ปรี๊ดดด! เร่งสุดตัว' },
  tired: { chance: 0.12, mult: 0.35, dur: [0.8, 1.4], text: (a) => `เหนื่อยแล้ว ${a.sound}~` },
  trip:  { chance: 0.06, mult: 0.0,  dur: [0.5, 0.8], text: () => 'สะดุดล้ม!' },
  nap:   { chance: 0.04, mult: 0.0,  dur: [0.9, 1.4], text: () => 'ง่วง... หลับแป๊บ zZ' },
  snack: { chance: 0.05, mult: 0.0,  dur: [0.6, 1.0], text: (a) => `เจอ${a.snack}! แวะกินก่อน` },
}
export const RUBBER_BAND = 1.4      // ตัวที่ตามหลังจะเร่งไล่ (ยิ่งมาก ยิ่งสูสี)
export const FINAL_STRETCH = 0.78   // ทางตรงสุดท้าย (สัดส่วนของสนาม)
export const SLOWMO_ZONE = 0.93     // ใกล้เส้นชัย + สูสี = สโลว์โมชัน
export const SLOWMO_GAP = 0.05      // ห่างกันไม่เกินเท่านี้ถือว่าสูสี
export const SLOWMO_SCALE = 0.35
export const COUNTDOWN_FROM = 3
