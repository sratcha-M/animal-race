import { useEffect, useRef } from 'react'

// เกมย่อยคุยกับมือถือเพื่อน
//  state    = สถานะที่ส่งไปให้มือถือ (object ธรรมดา ส่งซ้ำเมื่อค่าเปลี่ยนเท่านั้น)
//  handlers = { 'ชื่อข้อความ': (fromId, data) => ... } ข้อความที่เพื่อนกดจากมือถือ
// รับ handlers ชุดล่าสุดทุกครั้งที่ render จึงอ่าน state ปัจจุบันของเกมได้เสมอ
export function useMiniNet({ onNet, registerHandler }, state, handlers) {
  const ref = useRef(handlers)
  ref.current = handlers
  useEffect(() => {
    const offs = Object.keys(ref.current).map((type) => registerHandler?.(type, (from, data) => ref.current[type]?.(from, data)))
    return () => offs.forEach((off) => off?.())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const key = JSON.stringify(state)
  useEffect(() => { onNet?.(state) }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => onNet?.(null), []) // eslint-disable-line react-hooks/exhaustive-deps
}
