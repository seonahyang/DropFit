import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconClose, IconPhoto } from '../components/Icons.jsx'

// 시안: AppUpload.dc.html
// 2단계: 사진 고르기·카드 표시까지. 배경 제거 처리(지우는 중 %, 확인 필요)는 4단계에서 연결.
const HEIGHTS = [280, 230, 250, 190, 170, 210]

export default function Upload() {
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const [dest, setDest] = useState('own')
  const [cards, setCards] = useState([]) // { key, url, st: 'waiting'|'working'|'done'|'check', pct, h }

  useEffect(() => () => cards.forEach((c) => URL.revokeObjectURL(c.url)), []) // eslint-disable-line react-hooks/exhaustive-deps

  const onPick = (e) => {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (!files.length) return
    setCards((prev) => prev.concat(files.map((f, i) => ({
      key: f.name + f.size + Math.random(), url: URL.createObjectURL(f), file: f, st: 'waiting', pct: 0, h: HEIGHTS[(prev.length + i) % HEIGHTS.length],
    }))))
  }

  const doneCount = cards.filter((c) => c.st === 'done' || c.st === 'check').length
  const destLabel = dest === 'own' ? '가진 옷' : '살 옷'

  return (
    <div className="app">
      <header style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: 'calc(10px + var(--safe-t)) 8px 4px' }}>
        <button type="button" className="icon-btn" aria-label="닫기" onClick={() => navigate('/')}><IconClose /></button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, letterSpacing: '-0.03em' }}>옷 추가</h1>
      </header>

      <div className="tabs" role="group" aria-label="넣을 곳" style={{ flexShrink: 0 }}>
        {[['own', '가진 옷으로'], ['buy', '살 옷으로']].map(([k, label]) => (
          <button key={k} type="button" className="tab" aria-pressed={dest === k} onClick={() => setDest(k)}>{label}</button>
        ))}
      </div>

      <main className="scroll" style={{ padding: '10px 4px 12px' }}>
        <div className="pins">
          <button type="button" onClick={() => fileRef.current && fileRef.current.click()}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: 190, margin: '0 0 10px', padding: 0, background: '#FFFFFF', color: '#000000', border: 0, borderRadius: 'var(--r-card)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            <IconPhoto size={30} />
            사진 앱에서 고르기
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={onPick} hidden />
          {cards.map((c) => (
            <div key={c.key} style={{ margin: '0 0 10px' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: c.h, padding: 14, overflow: 'hidden', background: c.st === 'waiting' ? 'var(--surface-1)' : '#FFFFFF', borderRadius: 'var(--r-card)' }}>
                <img src={c.url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', opacity: c.st === 'waiting' ? 0.45 : 1 }} />
                {c.st === 'working' && (
                  <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 6, background: 'rgba(0,0,0,.25)' }}><span style={{ display: 'block', width: c.pct + '%', height: '100%', background: '#FFFFFF' }} /></span>
                )}
              </div>
              <div style={{ padding: '6px 10px 0', fontSize: 13 }}>
                {c.st === 'done' && <span style={{ color: 'var(--muted-2)' }}>완료</span>}
                {c.st === 'check' && <span style={{ display: 'inline-flex', alignItems: 'center', minHeight: 32, fontWeight: 700, color: 'var(--warn)' }}>확인 필요 · 고치기</span>}
                {c.st === 'working' && <span>지우는 중 {c.pct}%</span>}
                {c.st === 'waiting' && <span style={{ color: 'var(--muted-2)' }}>대기 중</span>}
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 16px calc(20px + var(--safe-b))', background: '#000000' }}>
        <p style={{ margin: 0, fontSize: 12, textAlign: 'center', color: 'var(--muted-2)' }}>사진은 이 기기 안에서만 처리돼요</p>
        <button type="button" className="btn-primary" disabled={doneCount === 0}>완료된 {doneCount}벌 {destLabel}에 넣기</button>
      </footer>
    </div>
  )
}
