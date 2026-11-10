// 저장된 코디를 썸네일로 그리기 — 캔버스와 같은 퍼센트 좌표(x, y, w, r)를 그대로 씀
export const RATIO_CSS = { '1:1': '1 / 1', '4:5': '4 / 5', '9:16': '9 / 16' }

export function Pieces({ placed, itemById, shadow = '0 4px 4px rgba(0,0,0,.22)' }) {
  return [...placed]
    .sort((a, b) => a.z - b.z)
    .map((p, i) => {
      const it = itemById[p.id]
      if (!it) return null
      return (
        <img
          key={p.id + i}
          src={it.src}
          alt=""
          style={{
            position: 'absolute', left: p.x + '%', top: p.y + '%', width: p.w + '%',
            transform: `rotate(${p.r}deg)`, filter: `drop-shadow(${shadow})`, pointerEvents: 'none',
          }}
        />
      )
    })
}

export default function LookThumb({ look, itemById, style, children }) {
  return (
    <span
      style={{
        position: 'relative', display: 'block', overflow: 'hidden', background: 'var(--board-bg)',
        borderRadius: 'var(--r-card)', aspectRatio: RATIO_CSS[look.ratio] || '4 / 5', ...style,
      }}
    >
      <Pieces placed={look.placed} itemById={itemById} />
      {children}
    </span>
  )
}
