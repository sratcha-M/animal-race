# สัตว์น้อยวิ่งแข่ง

React + Vite + Tailwind CSS

```bash
npm install
npm run dev          # เปิดเล่นที่ http://localhost:5173
npm run build        # สร้างไฟล์สำหรับขึ้นเว็บ (dist/)
```

## ใส่ภาพสัตว์จาก AI
```bash
export POLLINATIONS_KEY=sk_...   # คีย์จาก https://enter.pollinations.ai/keys
pip install pillow rembg requests
python3 scripts/gen_assets.py          # ถ้าแมวหันซ้าย เพิ่ม --flip
```
ภาพจะไปอยู่ที่ `src/assets/ai/` และเกมจะใช้อัตโนมัติ (ถ้าไม่มี จะใช้ภาพวาดด้วยโค้ด)
ใช้ภาพที่โหลดมาเอง: ตั้งชื่อไฟล์ cat, dog, rabbit, pig, frog, bear, panda, fox, chick, penguin, bg แล้วรัน `python3 scripts/gen_assets.py --from-folder <โฟลเดอร์>`

## ปรับความลุ้น
`src/game/constants.js` → `EVENTS` (เร่ง/เหนื่อย/สะดุด/หลับ/เจอของกิน), `RUBBER_BAND` (ความสูสี), `SLOWMO_*` (สโลว์โมชันตอนเข้าเส้นชัย)

## เล่นกับเพื่อนจากมือถือ (ห้องออนไลน์)
1. สมัคร https://supabase.com (ฟรี) → New project
2. Project Settings → API → คัดลอก **Project URL** และ **anon public key**
3. สร้างไฟล์ `.env.local` ตาม `.env.example` (หรือใส่เป็น Environment Variables ใน Vercel)
4. deploy ใหม่ → หน้าแรกกด "ชวนเพื่อนเข้าห้อง" → เพื่อนสแกน QR พิมพ์ชื่อ เลือกสัตว์ ก็เข้ามาเล่นได้
ไม่ต้องสร้างตาราง ใช้แค่ Realtime (Broadcast + Presence)
ถ้ายังไม่ใส่ค่า ปุ่มห้องจะทำงานแบบทดสอบ (เปิดได้เฉพาะแท็บอื่นในเครื่องเดียวกัน)
