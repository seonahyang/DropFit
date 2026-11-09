import { Link } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { SAMPLE_ITEMS } from '../data/samples.js'

// 1단계 뼈대: 라우트·토큰·샘플 이미지가 연결됐는지 확인용. 2단계에서 화면별로 교체.
export default function Placeholder({ title, nav, links = [] }) {
  return (
    <div className="app">
      <main className="scroll" style={{ padding: '0 0 104px' }}>
        <header style={{ padding: '22px 16px 8px' }}>
          <Link to="/" style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em' }}>DropFit</Link>
        </header>
        <h1 style={{ margin: '8px 16px 4px', fontSize: 20, fontWeight: 900 }}>{title}</h1>
        <p style={{ margin: '0 16px 14px', fontSize: 14, color: 'var(--muted-2)' }}>2단계에서 시안 화면으로 바뀌어요</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 16px 16px' }}>
          {links.map(([to, label]) => (
            <Link key={to} to={to} className="chip" style={{ display: 'inline-flex', alignItems: 'center', padding: '0 14px' }}>{label}</Link>
          ))}
        </div>
        <div className="pins" style={{ padding: '0 4px' }}>
          {SAMPLE_ITEMS.map((x) => (
            <div key={x.id} style={{ marginBottom: 8 }}>
              <div style={{ height: x.h, padding: 14, background: x.tint, borderRadius: 'var(--r-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={x.src} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ minHeight: 36, padding: '8px 10px', fontSize: 13, color: 'var(--caption)' }}>{x.name}</div>
            </div>
          ))}
        </div>
      </main>
      {nav && <BottomNav current={nav} />}
    </div>
  )
}
