import { useState } from 'react'

// ภาพสัตว์จาก AI (ถ้ารัน scripts/gen_assets.py แล้ว ไฟล์จะอยู่ที่ src/assets/ai/animals/<ชื่อสัตว์>.webp)
const AI_ART = Object.fromEntries(
  Object.entries(import.meta.glob('../assets/ai/animals/*.{webp,png}', { eager: true, import: 'default' }))
    .map(([path, url]) => [path.split('/').pop().replace(/\.(webp|png)$/, ''), url]),
)

// ภาพที่กว้างกว่าปกติ (เช่น จิ้งจอกหางยาว) ขยายเพิ่มให้ตัวดูเท่าตัวอื่น
const IMG_SCALE = { fox: 1.2 }

export default function Animal({ animal, number, running = false, className = '' }) {
  const [imgFailed, setImgFailed] = useState(false)
  const ai = AI_ART[animal]
  if (ai && !imgFailed) {
    return (
      <div className={`critter critter-img relative aspect-[124/90] ${running ? 'running' : ''} ${className}`}>
        <span className="absolute bottom-[1%] left-[18%] h-[8%] w-[64%] rounded-[50%] bg-[#5a4646]/15" />
        <div className="critter-hop absolute inset-0">
          <img src={ai} alt="" draggable="false" onError={() => setImgFailed(true)}
               className="absolute inset-0 h-full w-full origin-bottom select-none object-contain object-bottom"
               style={IMG_SCALE[animal] ? { scale: IMG_SCALE[animal] } : undefined} />
          {number != null && (
            <span className="absolute bottom-[4%] left-[22%] grid aspect-square w-[17%] place-items-center rounded-full bg-[#ffd54d] text-[clamp(8px,1.3vw,14px)] font-extrabold text-[#5a4646] shadow ring-2 ring-white">
              {number}
            </span>
          )}
        </div>
      </div>
    )
  }
  return <AnimalSvg animal={animal} number={number} running={running} className={className} />
}

const LINE = '#5a4646'
const PINK = '#ffb3c8'

// สี + ชิ้นส่วนของสัตว์แต่ละตัว (วาดด้วย SVG หันขวา)
const LOOKS = {
  cat:     { body: '#f8a65a', dark: '#dd7b2c', belly: '#fff3e3' },
  dog:     { body: '#e3b27c', dark: '#9a6438', belly: '#fff3e3' },
  rabbit:  { body: '#fffaf6', dark: '#e9dcd2', belly: '#ffffff' },
  pig:     { body: '#ffbfcd', dark: '#f08ea7', belly: '#ffe3ea' },
  frog:    { body: '#93d66e', dark: '#5aa83c', belly: '#e8f8cf' },
  bear:    { body: '#b07c55', dark: '#6e4a30', belly: '#ecd2b5' },
  panda:   { body: '#ffffff', dark: '#2f2f38', belly: '#ffffff', legs: '#2f2f38' },
  fox:     { body: '#f48a3e', dark: '#c4561a', belly: '#fff6ec' },
  chick:   { body: '#ffe066', dark: '#f2b705', belly: '#fff3b0', twoLegs: true },
  penguin: { body: '#3e4d70', dark: '#26314a', belly: '#ffffff', twoLegs: true },
}

function Ears({ id, c }) {
  const s = { stroke: LINE, strokeWidth: 1.6, strokeLinejoin: 'round' }
  switch (id) {
    case 'cat':
      return (<>
        <path d="M70 26 L72 6 L86 18 Z" fill={c.body} {...s} /><path d="M73 21 L74 11 L81 18 Z" fill={PINK} />
        <path d="M94 17 L106 4 L109 24 Z" fill={c.body} {...s} /><path d="M98 17 L105 9 L106 20 Z" fill={PINK} />
      </>)
    case 'fox':
      return (<>
        <path d="M70 28 L70 0 L88 18 Z" fill={c.body} {...s} /><path d="M70 8 L70 0 L76 6 Z" fill={c.dark} />
        <path d="M96 16 L112 -2 L111 26 Z" fill={c.body} {...s} /><path d="M108 2 L112 -2 L112 6 Z" fill={c.dark} />
        <path d="M73 21 L73 9 L81 17 Z" fill="#fff" /><path d="M101 16 L109 7 L109 20 Z" fill="#fff" />
      </>)
    case 'rabbit':
      return (<>
        <ellipse cx="80" cy="6" rx="6" ry="18" transform="rotate(-12 80 6)" fill={c.body} {...s} />
        <ellipse cx="80" cy="7" rx="2.8" ry="12" transform="rotate(-12 80 6)" fill={PINK} />
        <ellipse cx="98" cy="4" rx="6" ry="18" transform="rotate(14 98 4)" fill={c.body} {...s} />
        <ellipse cx="98" cy="5" rx="2.8" ry="12" transform="rotate(14 98 4)" fill={PINK} />
      </>)
    case 'bear': case 'panda': {
      const fill = id === 'panda' ? c.dark : c.body
      return (<>
        <circle cx="72" cy="20" r="8" fill={fill} {...s} /><circle cx="106" cy="18" r="8" fill={fill} {...s} />
        {id === 'bear' && (<><circle cx="72" cy="20" r="4" fill={c.belly} /><circle cx="106" cy="18" r="4" fill={c.belly} /></>)}
      </>)
    }
    case 'dog':
      return <ellipse cx="108" cy="22" rx="6.5" ry="12" transform="rotate(35 108 22)" fill={c.dark} {...s} />
    case 'pig':
      return (<>
        <path d="M72 24 L74 10 L86 18 Z" fill={c.body} {...s} /><path d="M96 16 L106 6 L108 22 Z" fill={c.body} {...s} />
      </>)
    case 'chick':
      return <path d="M88 17 q-2 -9 3 -12 q0 6 3 5 q1 -6 6 -6 q-4 6 -3 13" fill={c.body} {...s} />
    default:
      return null
  }
}

function Tail({ id, c }) {
  const s = { stroke: LINE, strokeWidth: 1.6, strokeLinejoin: 'round', strokeLinecap: 'round' }
  switch (id) {
    case 'cat':
      return (<g className="tail">
        <path d="M28 56 C14 54 10 40 16 28 C18 24 23 25 22 30 C18 40 22 48 32 49" fill={c.body} {...s} />
        <path d="M16 30 C17 27 20 26 21 29" stroke={c.dark} strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>)
    case 'dog':
      return <g className="tail"><path d="M28 50 C20 44 18 34 22 28 C25 30 26 40 32 46" fill={c.body} {...s} /></g>
    case 'fox':
      return (<g className="tail">
        <path d="M30 52 C10 56 2 40 8 26 C16 30 22 40 32 44 Z" fill={c.body} {...s} />
        <path d="M8 26 C6 32 6 36 8 40 C12 36 12 30 8 26 Z" fill="#fff" />
      </g>)
    case 'pig':
      return <g className="tail"><path d="M27 52 c-6 0 -8 -6 -4 -8 c4 -2 6 3 2 5 c-3 1 -4 -2 -2 -3" fill="none" stroke={c.dark} strokeWidth="2.4" strokeLinecap="round" /></g>
    case 'rabbit':
      return <g className="tail"><circle cx="26" cy="50" r="7" fill="#fff" {...s} /></g>
    case 'bear': case 'panda':
      return <g className="tail"><circle cx="26" cy="52" r="5" fill={id === 'panda' ? c.dark : c.body} {...s} /></g>
    case 'chick':
      return <g className="tail"><path d="M28 50 L18 42 L22 52 L16 56 L28 56 Z" fill={c.body} {...s} /></g>
    case 'penguin':
      return <g className="tail"><path d="M28 60 L18 66 L30 66 Z" fill={c.dark} {...s} /></g>
    default:
      return null
  }
}

function Face({ id, c }) {
  const eyes = (lx, ly, rx, ry) => (
    <g className="eyes">
      <ellipse cx={lx} cy={ly} rx="4.3" ry="5.2" fill="#2d2330" /><ellipse cx={rx} cy={ry} rx="4.3" ry="5.2" fill="#2d2330" />
      <circle cx={lx + 1.5} cy={ly - 2} r="1.8" fill="#fff" /><circle cx={lx - 1.2} cy={ly + 2.4} r=".9" fill="#fff" />
      <circle cx={rx + 1.5} cy={ry - 2} r="1.8" fill="#fff" /><circle cx={rx - 1.2} cy={ry + 2.4} r=".9" fill="#fff" />
    </g>
  )
  const cheeks = <><ellipse cx="79" cy="46" rx="5" ry="3" fill="#ff8fb0" opacity=".55" /><ellipse cx="108" cy="46" rx="4.5" ry="3" fill="#ff8fb0" opacity=".55" /></>
  const smile = <path d="M89 47 q4 4 8 0" stroke={LINE} strokeWidth="1.4" fill="none" strokeLinecap="round" />
  const catMouth = <><path d="M92 43 l3 0 l-1.5 2 z" fill="#ff7a9c" stroke="#ff7a9c" strokeWidth="1" strokeLinejoin="round" />
    <path d="M90.5 46.5 q2 2.4 3 0 q1 2.4 3 0" stroke={LINE} strokeWidth="1.3" fill="none" strokeLinecap="round" /></>
  const whiskers = <path d="M74 43 l-9 -2 M74 46 l-9 1 M111 43 l8 -2 M111 46 l8 1" stroke={LINE} strokeWidth="1" opacity=".6" strokeLinecap="round" />
  const beak = <path d="M108 38 L121 42 L108 46 Z" fill="#ff9f43" stroke={LINE} strokeWidth="1.3" strokeLinejoin="round" />

  switch (id) {
    case 'cat':
      return (<>
        <path d="M84 17 q1 5 -1 8 M91 16 q1 5 0 8 M98 17 q0 5 -2 8" stroke={c.dark} strokeWidth="2.6" fill="none" strokeLinecap="round" />
        {eyes(85, 37, 102, 37)}{cheeks}{catMouth}{whiskers}
      </>)
    case 'dog':
      return (<>
        <ellipse cx="70" cy="32" rx="7" ry="14" transform="rotate(18 70 32)" fill={c.dark} stroke={LINE} strokeWidth="1.6" />
        <ellipse cx="102" cy="35" rx="8" ry="8" fill={c.dark} opacity=".35" />
        {eyes(85, 36, 102, 36)}{cheeks}
        <ellipse cx="95" cy="44" rx="3.5" ry="2.5" fill="#2d2330" />
        <path d="M91 48 q4 3 8 0" stroke={LINE} strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <path d="M94 49 q1.5 6 4 0" fill="#ff7a9c" stroke={LINE} strokeWidth="1" />
      </>)
    case 'rabbit':
      return (<>{eyes(85, 37, 102, 37)}{cheeks}
        <path d="M93 43 l3 0 l-1.5 2 z" fill="#ff7a9c" />
        <path d="M91 46.5 q2 2.4 3.5 0 q1.5 2.4 3.5 0" stroke={LINE} strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <rect x="93" y="48" width="3.5" height="3.5" rx=".8" fill="#fff" stroke={LINE} strokeWidth=".8" />
      </>)
    case 'pig':
      return (<>{eyes(83, 34, 100, 34)}{cheeks}
        <ellipse cx="104" cy="44" rx="8" ry="6" fill="#ffa3b8" stroke={LINE} strokeWidth="1.3" />
        <ellipse cx="101.5" cy="44" rx="1.4" ry="2" fill={LINE} /><ellipse cx="106.5" cy="44" rx="1.4" ry="2" fill={LINE} />
      </>)
    case 'frog':
      return (<>
        <circle cx="80" cy="20" r="9" fill={c.body} stroke={LINE} strokeWidth="1.6" />
        <circle cx="100" cy="18" r="9" fill={c.body} stroke={LINE} strokeWidth="1.6" />
        <circle cx="80" cy="20" r="6" fill="#fff" /><circle cx="100" cy="18" r="6" fill="#fff" />
        {eyes(81, 20, 101, 18)}
        {cheeks}
        <path d="M80 44 q14 10 30 0" stroke={LINE} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </>)
    case 'bear':
      return (<>{eyes(84, 34, 100, 34)}{cheeks}
        <ellipse cx="98" cy="45" rx="9" ry="7" fill={c.belly} stroke={LINE} strokeWidth="1.2" />
        <ellipse cx="99" cy="42" rx="3.5" ry="2.5" fill="#2d2330" />
        <path d="M95 47 q2.5 2.5 4 0 q1.5 2.5 4 0" stroke={LINE} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </>)
    case 'panda':
      return (<>
        <ellipse cx="84" cy="37" rx="6.5" ry="8" transform="rotate(25 84 37)" fill={c.dark} />
        <ellipse cx="102" cy="37" rx="6.5" ry="8" transform="rotate(-25 102 37)" fill={c.dark} />
        <g className="eyes">
          <circle cx="85" cy="36" r="3" fill="#fff" /><circle cx="101" cy="36" r="3" fill="#fff" />
          <circle cx="85.5" cy="36.5" r="1.8" fill="#2d2330" /><circle cx="101.5" cy="36.5" r="1.8" fill="#2d2330" />
        </g>
        {cheeks}
        <ellipse cx="94" cy="44" rx="3.5" ry="2.4" fill="#2d2330" />{smile}
      </>)
    case 'fox':
      return (<>
        <path d="M70 40 q12 18 40 8 q-6 12 -20 12 q-14 0 -20 -20 Z" fill="#fff" />
        {eyes(85, 35, 102, 35)}{cheeks}
        <ellipse cx="111" cy="43" rx="3" ry="2.3" fill="#2d2330" />
        <path d="M95 47 q4 3 8 0" stroke={LINE} strokeWidth="1.3" fill="none" strokeLinecap="round" />
      </>)
    case 'chick':
      return (<>{eyes(87, 33, 102, 33)}{cheeks}{beak}</>)
    case 'penguin':
      return (<>
        <path d="M76 30 q8 -10 16 0 q8 -10 16 0 q4 14 -4 24 q-12 6 -24 0 q-8 -10 -4 -24 Z" fill="#fff" />
        {eyes(86, 34, 101, 34)}{cheeks}{beak}
      </>)
    default:
      return null
  }
}

function AnimalSvg({ animal, number, running, className }) {
  const c = LOOKS[animal] ?? LOOKS.cat
  const legColor = c.legs ?? c.body
  const Leg = ({ x, cls, near }) => (
    <g className={`leg ${cls}`} style={{ transformOrigin: `${x + 4}px 62px` }}>
      <rect x={x} y={58} width={8} height={16} rx={4} fill={near ? legColor : (c.legs ?? c.dark)} stroke={LINE} strokeWidth={1.4} />
      <ellipse cx={x + 4} cy={73} rx={4.6} ry={2.6} fill={c.legs ? '#2f2f38' : '#fff'} opacity={near ? 0.9 : 0.5} />
    </g>
  )
  const BirdLeg = ({ x, cls }) => (
    <g className={`leg ${cls}`} style={{ transformOrigin: `${x}px 64px` }}>
      <path d={`M${x} 64 L${x} 74 M${x} 74 l-4 2 M${x} 74 l5 1`} stroke="#ff9f43" strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>
  )
  return (
    <svg viewBox="0 -4 124 90" className={`critter ${running ? 'running' : ''} ${className}`} aria-hidden="true">
      <ellipse cx="62" cy="80" rx="34" ry="4" fill="#5a4646" opacity=".12" />
      {!c.twoLegs && (<><Leg x={30} cls="leg-b" /><Leg x={66} cls="leg-a" /></>)}
      {c.twoLegs && <BirdLeg x={58} cls="leg-b" />}
      <g className="critter-body">
        <Tail id={animal} c={c} />
        {/* ลำตัว */}
        <ellipse cx="52" cy="56" rx="27" ry="17" fill={c.body} stroke={LINE} strokeWidth="1.6" />
        <ellipse cx="60" cy="63" rx="14" ry="8" fill={c.belly} opacity=".85" />
        {animal === 'cat' && <path d="M40 41 q3 6 0 12 M50 39 q3 6 0 13" stroke={c.dark} strokeWidth="3.2" fill="none" strokeLinecap="round" />}
        {animal === 'panda' && <path d="M64 41 q6 8 4 28 q-10 2 -14 -2 q2 -16 -2 -24 Z" fill={c.dark} />}
        {(animal === 'chick' || animal === 'penguin') && (
          <ellipse cx="46" cy="54" rx="13" ry="8" transform="rotate(-15 46 54)" fill={c.dark} stroke={LINE} strokeWidth="1.3" className="wing" />
        )}
        <Ears id={animal} c={c} />
        {/* หัว */}
        <ellipse cx="90" cy="37" rx="24" ry="21" fill={c.body} stroke={LINE} strokeWidth="1.6" />
        <Face id={animal} c={c} />
        {/* ปลอกคอ + ป้ายเบอร์ */}
        <path d="M72 55 q16 8 34 0" stroke="#ff6b8b" strokeWidth="4.5" fill="none" strokeLinecap="round" />
        <circle cx="88" cy="63" r="7.5" fill="#ffd54d" stroke={LINE} strokeWidth="1.3" />
        {number != null && (
          <text x="88" y="66.6" textAnchor="middle" fontSize="10" fontWeight="800" fill={LINE} fontFamily="Kanit, sans-serif">{number}</text>
        )}
      </g>
      {!c.twoLegs && (<><Leg x={38} cls="leg-a" near /><Leg x={74} cls="leg-b" near /></>)}
      {c.twoLegs && <BirdLeg x={46} cls="leg-a" />}
    </svg>
  )
}
