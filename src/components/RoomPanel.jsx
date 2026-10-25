import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { ONLINE } from '../lib/net'

// กล่อง "ชวนเพื่อนเข้าห้อง": รหัสห้อง + QR + ลิงก์ ให้เพื่อนสแกนเข้ามาเล่นจากมือถือ
export default function RoomPanel({ room, guests, onOpen, onClose }) {
  const [qr, setQr] = useState('')
  const [copied, setCopied] = useState(false)
  const link = room ? `${window.location.origin}${window.location.pathname}?room=${room.code}` : ''

  useEffect(() => {
    if (!link) { setQr(''); return }
    QRCode.toDataURL(link, { margin: 1, width: 360, color: { dark: '#9f1239', light: '#ffffff' } }).then(setQr).catch(() => setQr(''))
  }, [link])

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* ignore */ }
  }

  // ในหน้าตัวอย่างบน claude.ai (อยู่ใน iframe และยังไม่ได้เชื่อม Supabase) ห้องออนไลน์ใช้ไม่ได้ จึงซ่อนไว้
  let framed = false
  try { framed = window.self !== window.top } catch { framed = true }
  if (!ONLINE && framed) return null
  if (!room) {
    return (
      <div className="mx-auto mb-4 flex w-full max-w-sm flex-col items-center gap-1">
        <button onClick={onOpen} className="w-full rounded-2xl border-[3px] border-[#24405a] bg-[#3ec1b0] px-4 py-2 font-bold text-white shadow-[0_4px_0_#24405a] hover:bg-[#52cfbf] active:translate-y-1 active:shadow-none">
          ชวนเพื่อนเข้าห้อง (เล่นจากมือถือ)
        </button>
        {!ONLINE && <p className="text-center text-xs text-[#4f6a82]">ยังไม่ได้เชื่อมห้องออนไลน์ · ตอนนี้เปิดเข้าได้เฉพาะแท็บอื่นในเครื่องนี้</p>}
      </div>
    )
  }
  return (
    <section className="pop mx-auto mb-5 w-full max-w-xl rounded-3xl bg-white p-4 shadow-sm ring-2 ring-sky-200">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        {qr && <img src={qr} alt={`QR สำหรับเข้าห้อง ${room.code}`} className="w-40 shrink-0 rounded-xl ring-1 ring-sky-100" />}
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="text-sm font-semibold text-sky-700">ให้เพื่อนสแกน QR หรือเปิดลิงก์ แล้วพิมพ์ชื่อเข้ามา</div>
          <div className="mt-1 text-sm text-slate-500">รหัสห้อง</div>
          <div className="text-4xl font-extrabold tracking-[.3em] text-sky-600">{room.code}</div>
          <div className="mt-2 flex items-center gap-2">
            <input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="ลิงก์เข้าห้อง"
                   className="min-w-0 flex-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-xs text-slate-600" />
            <button onClick={copy} className="shrink-0 rounded-lg bg-sky-500 px-3 py-1 text-sm font-semibold text-white hover:bg-sky-600">
              {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-sm">
            <span className="font-semibold text-slate-700">เพื่อนในห้อง {guests} คน</span>
            <button onClick={onClose} className="text-[#e0466e] underline underline-offset-2">ปิดห้อง</button>
          </div>
          {!ONLINE && <p className="mt-1 text-xs text-amber-700">โหมดทดสอบ: ยังไม่ได้เชื่อม Supabase จึงเข้าได้เฉพาะแท็บอื่นในเครื่องนี้</p>}
        </div>
      </div>
    </section>
  )
}
