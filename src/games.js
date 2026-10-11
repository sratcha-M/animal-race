import Wheel from './components/Wheel'
import Claw from './components/Claw'
import Gacha from './components/Gacha'
import Balloon from './components/Balloon'
import Ladder from './components/Ladder'
import Cards from './components/Cards'
import Dart from './components/Dart'
import Slot from './components/Slot'

// เกมสุ่มเลือกคน/จับคู่ (แท็บถัดจากแข่งวิ่ง/ระเบิดเวลา) — เพิ่มเกมใหม่ที่นี่ที่เดียว
export const MINI = [
  { id: 'wheel', label: 'วงล้อ', title: 'วงล้อสุ่ม', subtitle: 'ชื่อทุกคนอยู่บนวงล้อ หมุนแล้วลูกศรชี้ใคร คนนั้นโดน!', startLabel: 'ไปที่วงล้อ!', Comp: Wheel },
  { id: 'claw', label: 'ตู้คีบ', title: 'ตู้คีบตุ๊กตา', subtitle: 'ชื่อทุกคนอยู่บนตุ๊กตา ก้ามปูสุ่มคีบ ใครถูกคีบคนนั้นโดน!', startLabel: 'ไปที่ตู้คีบ!', Comp: Claw },
  { id: 'gacha', label: 'กาชาปอง', title: 'กาชาปอง', subtitle: 'หมุนตู้ ไข่กลิ้งออกมา เปิดดูชื่อข้างใน พร้อมระดับ ทอง เงิน ทองแดง', startLabel: 'ไปที่ตู้กาชาปอง!', Comp: Gacha },
  { id: 'balloon', label: 'ลูกโป่ง', title: 'ลูกโป่งแตก', subtitle: 'ลูกโป่งชื่อทุกคนลอยขึ้น แตกทีละลูก ลูกสุดท้ายคือผู้ถูกเลือก', startLabel: 'ไปปล่อยลูกโป่ง!', Comp: Balloon },
  { id: 'ladder', label: 'บันไดงู', title: 'บันไดงู', subtitle: 'ลากเส้นจากชื่อลงไปหาปลายทาง เหมาะกับจับคู่คนกับหน้าที่', startLabel: 'ไปที่บันไดงู!', Comp: Ladder },
  { id: 'cards', label: 'ไพ่คว่ำ', title: 'ไพ่คว่ำ', subtitle: 'ไพ่ชื่อทุกคนถูกคว่ำและสลับ เลือกเปิดสุ่ม หรือเล่นจับคู่ฝึกความจำ', startLabel: 'ไปที่โต๊ะไพ่!', Comp: Cards },
  { id: 'dart', label: 'ปาเป้า', title: 'ปาเป้า', subtitle: 'เป้าแบ่งเป็นช่องชื่อแต่ละคน ลูกดอกส่ายนิดหน่อยให้ผลสุ่ม', startLabel: 'ไปที่เป้า!', Comp: Dart },
  { id: 'slot', label: 'สล็อต', title: 'สล็อตแมชชีน', subtitle: 'ดึงคันโยก 3 รีล ได้ประโยคตลก ๆ เช่น มิ้นท์ – ร้องเพลง – 1 นาที', startLabel: 'ไปที่ตู้สล็อต!', Comp: Slot },
]
export const MINI_BY_ID = Object.fromEntries(MINI.map((m) => [m.id, m]))
