import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconClose, IconPhoto } from '../components/Icons.jsx'
import { useStore, uid } from '../data/store.jsx'
import { subscribe, addFiles, markAdded, clearAdded } from '../lib/uploadQueue.js'

// 시안: AppUpload.dc.html — 사진 여러 장 → 장별 자동 배경 제거 → 완료/확인 필요 → 옷장에 넣기
const TINTS = ['#F3E6D6', '#C9D8E8', '#E4EEE3', '#FBF0DC', '#F6E8EA', '#FFFFFF', '#BFC0C9']

const cardH = (c) => {
  if (!c.result) return 190
  return Math.round(Math.min(330, Math.max(150, 188 * (c.result.vh / c.result.vw) * 0.82 + 28)))
}

export default function Upload() {
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const { items, addItems } = useStore()
  const [dest, setDest] = useState(() => sessionStorage.getItem('uploadDest') || 'own')
  const [cards, setCards] = useState([])
  useEffect(() => subscribe(setCards), [])

  const pickDest = (k) => { setDest(k); try { sessionStorage.setItem('uploadDest', k) } catch (e) { /* ignore */ } }

  const onPick = (e) => {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (files.length) addFiles(files)
  }

  const visible = cards.filter((c) => c.st !== 'added')
  const ready = visible.filter((c) => (c.st === 'done' || c.st === 'check') && c.result)
  const destLabel = dest === 'own' ? '가진 옷' : '살 옷'

  const toItem = (c, i) => {
    const r = c.result
    return {
      id: uid('item'), name: `새 옷 ${items.length + i + 1}`, brand: '', cat: 'top', own: dest === 'own', price: 0,
      seasons: ['spring', 'summer', 'fall', 'winter'], tint: TINTS[(items.length + i) % TINTS.length], h: cardH(c),
      vw: r.vw, vh: r.vh, blob: r.blob, origBlob: r.origBlob, src: r.url, srcOrig: URL.createObjectURL(r.origBlob),
    }
  }

  const putAll = () => {
    if (!ready.length) return
    addItems(ready.map(toItem))
    markAdded(ready.map((c) => c.key))
    clearAdded()
    navigate('/', { state: { tab: dest } })
  }

  const fix = (c) => {
    const it = toItem(c, 0)
    addItems([it])
    markAdded([c.key])
    navigate(`/editor/${it.id}`, { state: { from: 'upload' } })
  }

  return (
    <div className="app">
      <header style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: 'calc(10px + var(--safe-t)) 8px 4px' }}>
        <button type="button" className="icon-btn" aria-label="닫기" onClick={() => navigate('/')}><IconClose /></button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, letterSpacing: '-0.03em' }}>옷 추가</h1>
      </header>

      <div className="tabs" role="group" aria-label="넣을 곳" style={{ flexShrink: 0 }}>
        {[['own', '가진 옷으로'], ['buy', '살 옷으로']].map(([k, label]) => (
          <button key={k} type="button" className="tab" aria-pressed={dest === k} onClick={() => pickDest(k)}>{label}</button>
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
          {visible.map((c, i) => {
            const hasCut = (c.st === 'done' || c.st === 'check') && c.result
            return (
              <div key={c.key} style={{ margin: '0 0 10px' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: cardH(c), padding: 14, overflow: 'hidden', background: hasCut ? TINTS[i % TINTS.length] : 'var(--surface-1)', borderRadius: 'var(--r-card)' }}>
                  <img src={hasCut ? c.result.url : c.url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', opacity: hasCut ? 1 : c.st === 'working' ? 0.7 : 0.4 }} />
                  {c.st === 'working' && (
                    <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 6, background: 'rgba(0,0,0,.25)' }}><span style={{ display: 'block', width: c.pct + '%', height: '100%', background: '#FFFFFF', transition: 'width .25s' }} /></span>
                  )}
                </div>
                <div style={{ padding: '6px 10px 0', fontSize: 13 }}>
                  {c.st === 'done' && <span style={{ color: 'var(--muted-2)' }}>완료</span>}
                  {c.st === 'check' && (
                    <button type="button" onClick={() => c.result && fix(c)} style={{ display: 'inline-flex', alignItems: 'center', minHeight: 32, padding: 0, background: 'none', border: 0, fontSize: 13, fontWeight: 700, color: 'var(--warn)', cursor: 'pointer' }}>
                      {c.result && c.result.failed ? '자동 제거 실패 · 직접 지우기' : '확인 필요 · 고치기'}
                    </button>
                  )}
                  {c.st === 'working' && <span>{c.phase === 'model' ? `처음 한 번 모델 받는 중 ${c.pct}%` : `지우는 중 ${c.pct}%`}</span>}
                  {c.st === 'waiting' && <span style={{ color: 'var(--muted-2)' }}>대기 중</span>}
                </div>
              </div>
            )
          })}
        </div>
      </main>

      <footer style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 16px calc(20px + var(--safe-b))', background: '#000000' }}>
        <p style={{ margin: 0, fontSize: 12, textAlign: 'center', color: 'var(--muted-2)' }}>사진은 이 기기 안에서만 처리돼요</p>
        <button type="button" className="btn-primary" disabled={ready.length === 0} onClick={putAll}>완료된 {ready.length}벌 {destLabel}에 넣기</button>
      </footer>
    </div>
  )
}
