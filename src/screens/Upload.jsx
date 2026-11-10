import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconClose, IconPhoto } from '../components/Icons.jsx'
import { useStore, uid } from '../data/store.jsx'
import { subscribe, addFiles, markAdded, clearAdded, setMeta } from '../lib/uploadQueue.js'
import { CATS, SEASONS } from '../data/samples.js'
import { subscribeModel, warmModel } from '../lib/modelWarm.js'

// 시안: AppUpload.dc.html — 사진 여러 장 → 장별 자동 배경 제거 → 완료/확인 필요 → 옷장에 넣기
const NEUTRAL = '#F2F2F3'

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
  // 화면에 들어오면 배경 제거 모델을 미리 준비(이미 받았으면 캐시에서 금방 끝남)
  const [model, setModel] = useState({ status: 'idle', pct: 0 })
  useEffect(() => subscribeModel(setModel), [])
  useEffect(() => { warmModel() }, [])

  const pickDest = (k) => { setDest(k); try { sessionStorage.setItem('uploadDest', k) } catch (e) { /* ignore */ } }

  const onPick = (e) => {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (files.length) addFiles(files)
  }

  const visible = cards.filter((c) => c.st !== 'added')
  const ready = visible.filter((c) => (c.st === 'done' || c.st === 'check') && c.result)
  const destLabel = dest === 'own' ? '가진 옷' : '살 옷'

  const [sheet, setSheet] = useState(null) // 정보 입력 중인 카드 key
  const defaultName = (c) => `새 옷 ${items.length + visible.indexOf(c) + 1}`
  const metaOf = (c) => ({ name: '', brand: '', cat: 'top', seasons: ['spring', 'summer', 'fall', 'winter'], price: 0, ...(c.meta || {}) })

  const toItem = (c) => {
    const r = c.result
    const m = metaOf(c)
    return {
      id: uid('item'), name: m.name.trim() || defaultName(c), brand: m.brand.trim(), cat: m.cat, own: dest === 'own', price: m.price || 0,
      seasons: m.seasons, tint: NEUTRAL, h: cardH(c),
      vw: r.vw, vh: r.vh, blob: r.blob, origBlob: r.origBlob, src: r.url, srcOrig: URL.createObjectURL(r.origBlob),
    }
  }

  const putAll = () => {
    if (!ready.length) return
    addItems(ready.map((c) => toItem(c)))
    markAdded(ready.map((c) => c.key))
    clearAdded()
    navigate('/', { state: { tab: dest } })
  }

  const fix = (c) => {
    // 옷장에 넣지 않고 이 카드의 컷만 고침 → 확정하면 이 화면으로 돌아와 카드가 바뀜
    setSheet(null)
    navigate(`/editor/upload/${c.key}`)
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
                <div role={hasCut ? 'button' : undefined} tabIndex={hasCut ? 0 : undefined} aria-label={hasCut ? '옷 정보 입력' : undefined}
                  onClick={() => hasCut && setSheet(c.key)}
                  style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: cardH(c), padding: 14, overflow: 'hidden', background: hasCut ? 'var(--card-bg)' : 'var(--surface-1)', borderRadius: 'var(--r-card)', cursor: hasCut ? 'pointer' : 'default' }}>
                  <img src={hasCut ? c.result.url : c.url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', opacity: hasCut ? 1 : c.st === 'working' ? 0.7 : 0.4 }} />
                  {c.st === 'working' && (
                    <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 6, background: 'rgba(0,0,0,.25)' }}><span style={{ display: 'block', width: c.pct + '%', height: '100%', background: '#FFFFFF', transition: 'width .25s' }} /></span>
                  )}
                </div>
                <div style={{ padding: '6px 10px 0', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {hasCut && (
                    <button type="button" onClick={() => setSheet(c.key)} style={{ display: 'block', minHeight: 28, padding: 0, background: 'none', border: 0, textAlign: 'left', fontSize: 13, color: c.meta && c.meta.name ? 'var(--caption)' : 'var(--muted-2)', cursor: 'pointer' }}>
                      {c.meta && c.meta.name ? [c.meta.brand, c.meta.name].filter(Boolean).join(' ') + ' · ' + CATS[metaOf(c).cat] : '눌러서 이름·종류 입력'}
                    </button>
                  )}
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
        <p style={{ margin: 0, fontSize: 12, textAlign: 'center', color: 'var(--muted-2)' }}>
          {model.status === 'loading' ? `배경 제거 준비 중 ${model.pct}% · ` : model.status === 'error' ? '배경 제거를 준비하지 못했어요(네트워크 확인) · ' : ''}사진은 이 기기 안에서만 처리돼요
        </p>
        <button type="button" className="btn-primary" disabled={ready.length === 0} onClick={putAll}>완료된 {ready.length}벌 {destLabel}에 넣기</button>
      </footer>

      {sheet && visible.find((c) => c.key === sheet) && (
        <MetaSheet key={sheet} card={visible.find((c) => c.key === sheet)} meta={metaOf(visible.find((c) => c.key === sheet))}
          placeholder={defaultName(visible.find((c) => c.key === sheet))}
          onChange={(m) => setMeta(sheet, m)} onClose={() => setSheet(null)} onFix={() => fix(visible.find((c) => c.key === sheet))} />
      )}
    </div>
  )
}

// 옷장에 넣기 전 정보 입력 (옷장 상세 시트와 같은 모양)
function MetaSheet({ card, meta, placeholder, onChange, onClose, onFix }) {
  const [priceText, setPriceText] = useState(meta.price ? meta.price.toLocaleString('ko-KR') : '')
  const label = { display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 500 }
  return (
    <div className="sheet-wrap">
      <button type="button" className="sheet-scrim" aria-label="닫기" onClick={onClose} />
      <section className="sheet" aria-label="옷 정보">
        <span className="grabber" aria-hidden="true" />
        <div style={{ position: 'relative', height: 180, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'var(--card-bg)', borderRadius: 'var(--r-card)' }}>
          <img src={card.result.url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          <button type="button" onClick={onFix}
            style={{ position: 'absolute', right: 8, bottom: 8, display: 'inline-flex', alignItems: 'center', minHeight: 36, padding: '0 12px', background: 'rgba(0,0,0,.78)', color: '#FFFFFF', border: 0, borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            컷아웃 고치기
          </button>
        </div>
        <label style={label}><span style={{ flex: '0 0 44px' }}>이름</span>
          <input type="text" className="field" defaultValue={meta.name} placeholder={placeholder} onChange={(e) => onChange({ name: e.target.value })} style={{ flexGrow: 1, minWidth: 0, fontWeight: 700 }} />
        </label>
        <label style={label}><span style={{ flex: '0 0 44px' }}>브랜드</span>
          <input type="text" className="field" defaultValue={meta.brand} placeholder="브랜드 입력" onChange={(e) => onChange({ brand: e.target.value })} style={{ flexGrow: 1, minWidth: 0 }} />
        </label>
        <div role="group" aria-label="종류" style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', margin: '0 -16px', padding: '0 16px', scrollbarWidth: 'none' }}>
          <span style={{ flex: '0 0 44px', fontSize: 14, fontWeight: 500 }}>종류</span>
          {Object.entries(CATS).filter(([k]) => k !== 'all').map(([k, n]) => (
            <button key={k} type="button" className="chip" aria-pressed={meta.cat === k} style={{ flexShrink: 0, padding: '0 14px' }} onClick={() => onChange({ cat: k })}>{n}</button>
          ))}
        </div>
        <div role="group" aria-label="입는 계절" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ flexGrow: 1, fontSize: 14, fontWeight: 500 }}>계절</span>
          {SEASONS.map(([k, n]) => {
            const on = meta.seasons.includes(k)
            return <button key={k} type="button" className="chip" aria-pressed={on} style={{ minWidth: 54 }}
              onClick={() => onChange({ seasons: on ? meta.seasons.filter((x) => x !== k) : [...meta.seasons, k] })}>{n}</button>
          })}
        </div>
        <label style={{ ...label, justifyContent: 'space-between' }}>가격
          <input type="text" inputMode="numeric" className="field" value={priceText} placeholder="0"
            onChange={(e) => { const n = Number(e.target.value.replace(/[^0-9]/g, '')) || 0; setPriceText(n ? n.toLocaleString('ko-KR') : ''); onChange({ price: n }) }}
            style={{ width: 150, textAlign: 'right' }} />
        </label>
        <button type="button" className="btn-primary" onClick={onClose}>입력 완료</button>
      </section>
    </div>
  )
}
