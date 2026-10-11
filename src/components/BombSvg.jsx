// ระเบิดน่ารักวาดด้วย SVG
export default function BombSvg({ className = '', scared = false }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path d="M62 22 q10 -14 22 -10" stroke="#8a6a4a" strokeWidth="4" fill="none" strokeLinecap="round" className="fuse" />
      <g className="spark" style={{ transformOrigin: '86px 11px' }}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((r) => (
          <path key={r} d="M86 11 l0 -8" stroke={r % 90 ? '#ffd54d' : '#ff6b3d'} strokeWidth="3" strokeLinecap="round" transform={`rotate(${r} 86 11)`} />
        ))}
        <circle cx="86" cy="11" r="3.5" fill="#fff6c9" />
      </g>
      <rect x="50" y="18" width="16" height="12" rx="3" transform="rotate(35 58 24)" fill="#6b6f8f" stroke="#2d2f45" strokeWidth="2.5" />
      <circle cx="46" cy="58" r="34" fill="#3d4166" stroke="#22243a" strokeWidth="3" />
      <ellipse cx="34" cy="44" rx="9" ry="6" fill="#fff" opacity=".25" transform="rotate(-30 34 44)" />
      {scared ? (
        <>
          <path d="M30 56 l8 4 M38 56 l-8 4 M54 56 l8 4 M62 56 l-8 4" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="46" cy="72" rx="5" ry="6" fill="#22243a" />
        </>
      ) : (
        <>
          <ellipse cx="35" cy="58" rx="4" ry="5" fill="#fff" /><ellipse cx="57" cy="58" rx="4" ry="5" fill="#fff" />
          <circle cx="36" cy="59" r="2.2" fill="#22243a" /><circle cx="58" cy="59" r="2.2" fill="#22243a" />
          <path d="M40 70 q6 5 12 0" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      )}
      <ellipse cx="26" cy="68" rx="5" ry="3" fill="#ff8fb0" opacity=".7" /><ellipse cx="66" cy="68" rx="5" ry="3" fill="#ff8fb0" opacity=".7" />
    </svg>
  )
}
