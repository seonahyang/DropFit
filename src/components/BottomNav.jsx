import { Link } from 'react-router-dom'
import { IconHanger, IconPlus, IconBoards } from './Icons.jsx'

// 하단에 떠 있는 버튼 3개 (옷장, +, 코디) — 시안 값 그대로
const wrap = {
  position: 'absolute', left: 0, right: 0, bottom: 'calc(22px + var(--safe-b))', zIndex: 5,
  display: 'flex', justifyContent: 'center', gap: 10, pointerEvents: 'none',
}
const btn = (on) => ({
  width: 62, height: 62, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: on ? 'var(--nav-on)' : 'var(--nav-off)', borderRadius: 'var(--r-nav)', pointerEvents: 'auto',
})

export default function BottomNav({ current }) {
  return (
    <nav aria-label="앱 메뉴" style={wrap}>
      <Link to="/" aria-label="옷장" aria-current={current === 'closet' ? 'page' : undefined} style={btn(current === 'closet')}>
        <IconHanger on={current === 'closet'} />
      </Link>
      <Link to="/upload" aria-label="옷 추가" style={btn(false)}>
        <IconPlus />
      </Link>
      <Link to="/boards" aria-label="코디" aria-current={current === 'boards' ? 'page' : undefined} style={btn(current === 'boards')}>
        <IconBoards on={current === 'boards'} />
      </Link>
    </nav>
  )
}
