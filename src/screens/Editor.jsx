import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { IconBack, IconUndo } from '../components/Icons.jsx'
import { useStore } from '../data/store.jsx'

// 시안: AppEditor.dc.html
// 2단계: 화면·도구 상태 이식. 실제 지우개/복원(알파 마스크)은 5단계에서 연결.
const CHECKER = 'repeating-conic-gradient(#D9DADD 0 25%, #FFFFFF 0 50%)'
const BG_MAP = { checker: CHECKER, white: '#FFFFFF', black: '#2C2C2E', cobalt: '#1F3BE0', pink: '#F4B9C6' }
const BG_LABEL = { checker: '체커보드', white: '흰색', black: '검정', cobalt: '코발트', pink: '분홍' }

export default function Editor() {
  const { itemId } = useParams()
  const navigate = useNavigate()
  const { itemById } = useStore()
  const item = itemById[itemId]
  const [tool, setTool] = useState('erase')
  const [size, setSize] = useState(40)
  const [compare, setCompare] = useState(0)
  const [bg, setBg] = useState('checker')
  if (!item) return <Navigate to="/" replace />

  const orig = item.srcOrig || item.src
  const back = () => navigate(-1)

  return (
    <div className="app">
      <header style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, padding: 'calc(10px + var(--safe-t)) 12px 8px 8px' }}>
        <button type="button" className="icon-btn" aria-label="뒤로" onClick={back}><IconBack /></button>
        <h1 style={{ margin: 0, flexGrow: 1, fontSize: 16, fontWeight: 700 }}>{item.name}</h1>
        <button type="button" className="icon-btn" aria-label="실행 취소" disabled><IconUndo w={2} /></button>
        <button type="button" onClick={back} style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 18px', background: '#FFFFFF', color: '#000000', border: 0, borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>확정</button>
      </header>

      <main style={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'relative', flexGrow: 1, minHeight: 0, margin: '0 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14, overflow: 'hidden', borderRadius: 'var(--r-sheet)', background: BG_MAP[bg], backgroundSize: '22px 22px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 340, maxHeight: '100%', aspectRatio: `${item.vw} / ${item.vh}` }}>
            <img src={item.src} alt={`배경을 지운 ${item.name}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: '#B8A48C', clipPath: `inset(0 ${100 - compare}% 0 0)` }}>
              <img src={orig} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            {compare > 0 && <div aria-hidden="true" style={{ position: 'absolute', top: -6, bottom: -6, left: compare + '%', width: 2, background: 'var(--accent)' }} />}
          </div>
        </div>

        <section aria-label="편집 도구" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 16px calc(20px + var(--safe-b))' }}>
          <div role="group" aria-label="브러시" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            {[['erase', '지우개'], ['restore', '복원']].map(([k, label]) => (
              <button key={k} type="button" className="chip" aria-pressed={tool === k} onClick={() => setTool(k)} style={{ minHeight: 48, fontSize: 15 }}>{label}</button>
            ))}
          </div>
          <label style={rowLabel}><span style={{ flex: '0 0 64px' }}>크기</span>
            <input type="range" min="16" max="84" value={size} onChange={(e) => setSize(Number(e.target.value))} style={range} />
          </label>
          <label style={rowLabel}><span style={{ flex: '0 0 64px' }}>원본 비교</span>
            <input type="range" min="0" max="100" value={compare} onChange={(e) => setCompare(Number(e.target.value))} style={range} />
          </label>
          <div role="group" aria-label="미리보기 배경" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>배경</span>
            {Object.keys(BG_MAP).map((k) => (
              <button key={k} type="button" onClick={() => setBg(k)} aria-label={BG_LABEL[k] + ' 배경'} aria-pressed={bg === k}
                style={{ width: 44, height: 44, padding: 0, background: BG_MAP[k], backgroundSize: '12px 12px', border: bg === k ? '3px solid #FFFFFF' : '1.5px solid #6E6E73', borderRadius: '50%', cursor: 'pointer' }} />
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

const rowLabel = { display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 500 }
const range = { accentColor: '#FFFFFF', width: '100%', height: 32, margin: 0 }
