import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { IconMore, IconSettings } from '../components/Icons.jsx'
import { useStore } from '../data/store.jsx'
import { CATS, SEASONS, won } from '../data/samples.js'

// 시안: AppCloset.dc.html
export default function Closet() {
  const { items, updateItem, deleteItem } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [tab, setTab] = useState((location.state && location.state.tab) || 'own')
  const [cat, setCat] = useState('all')
  const [sheet, setSheet] = useState(null)

  const buyList = items.filter((x) => !x.own)
  const buyTotal = buyList.reduce((a, x) => a + (x.price || 0), 0)
  const list = items.filter((x) => (tab === 'own') === x.own && (cat === 'all' || x.cat === cat))
  const sel = items.find((x) => x.id === sheet)

  return (
    <div className="app">
      <main className="scroll" style={{ padding: '0 0 104px' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'calc(22px + var(--safe-t)) 8px 8px 16px' }}>
          <Link to="/" style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em' }}>DropFit</Link>
          <Link to="/settings" aria-label="설정" className="icon-btn" style={{ color: 'var(--muted-2)' }}><IconSettings /></Link>
        </header>

        <div style={{ position: 'sticky', top: 0, zIndex: 4, background: 'var(--bg)' }}>
          <div className="tabs" role="group" aria-label="옷장 구분">
            {[['own', '가진 옷'], ['buy', '살 옷']].map(([k, label]) => (
              <button key={k} type="button" className="tab" aria-pressed={tab === k} onClick={() => { setTab(k); setCat('all') }}>{label}</button>
            ))}
          </div>
          <div role="group" aria-label="카테고리" className="scroll-x" style={{ display: 'flex', gap: 16, overflowX: 'auto', padding: '2px 16px 4px', scrollbarWidth: 'none' }}>
            {Object.entries(CATS).map(([k, label]) => {
              const on = cat === k
              return (
                <button key={k} type="button" aria-pressed={on} onClick={() => setCat(k)}
                  style={{ flexShrink: 0, minHeight: 36, padding: 0, background: 'none', border: 0, color: on ? '#FFFFFF' : 'var(--muted-2)', fontSize: 14, fontWeight: on ? 700 : 500, cursor: 'pointer' }}>
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ padding: '6px 4px 0' }}>
          <h1 className="sr-only">{tab === 'own' ? '가진 옷' : '살 옷'}</h1>
          {tab === 'buy' && buyList.length > 0 && (
            <p style={{ margin: '0 12px 10px', fontSize: 14, color: 'var(--muted)' }}>다 사면 <b style={{ color: '#FFFFFF' }}>{won(buyTotal)}</b></p>
          )}
          {list.length === 0 && (
            <div style={{ padding: '90px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>여기엔 아직 옷이 없어요</p>
              <Link to="/upload" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 20px', background: '#FFFFFF', color: '#000000', borderRadius: 999, fontSize: 14, fontWeight: 700 }}>사진 올리기</Link>
            </div>
          )}
          <div className="pins">
            {list.map((x) => (
              <article key={x.id} style={{ margin: '0 0 8px' }}>
                <button type="button" onClick={() => setSheet(x.id)} aria-label={`${x.name} 자세히 보기`}
                  style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: x.h, padding: 14, background: 'var(--card-bg)', border: 0, borderRadius: 'var(--r-card)', cursor: 'pointer' }}>
                  <img src={x.src} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  {tab === 'buy' && (
                    <span style={{ position: 'absolute', left: 10, bottom: 10, padding: '5px 10px', background: 'rgba(0,0,0,.72)', color: '#FFFFFF', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>{won(x.price)}</span>
                  )}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 36, paddingLeft: 10 }}>
                  <span style={{ fontSize: 13, color: 'var(--caption)' }}>{x.brand ? x.brand + ' ' + x.name : x.name}</span>
                  <button type="button" className="icon-btn" onClick={() => setSheet(x.id)} aria-label={`${x.name} 메뉴`} style={{ height: 36 }}>
                    <IconMore />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>

      <BottomNav current="closet" />

      {sel && <ItemSheet key={sel.id} sel={sel} onClose={() => setSheet(null)} updateItem={updateItem}
        onDelete={() => { setSheet(null); deleteItem(sel.id) }}
        onBoard={() => navigate(`/board/new?item=${sel.id}`)}
        onEdit={() => navigate(`/editor/${sel.id}`)} />}
    </div>
  )
}

function ItemSheet({ sel, onClose, updateItem, onBoard, onEdit, onDelete }) {
  const [confirmDel, setConfirmDel] = useState(false)
  const [priceText, setPriceText] = useState((sel.price || 0).toLocaleString('ko-KR'))
  const label = { display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 500 }

  return (
    <div className="sheet-wrap">
      <button type="button" className="sheet-scrim" aria-label="닫기" onClick={onClose} />
      <section className="sheet" aria-label="옷 상세">
        <span className="grabber" aria-hidden="true" />
        <div style={{ position: 'relative', height: 200, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'var(--card-bg)', borderRadius: 'var(--r-card)' }}>
          <img src={sel.src} alt={sel.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          <button type="button" onClick={onEdit}
            style={{ position: 'absolute', right: 8, bottom: 8, display: 'inline-flex', alignItems: 'center', minHeight: 36, padding: '0 12px', background: 'rgba(0,0,0,.78)', color: '#FFFFFF', border: 0, borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            컷아웃 고치기
          </button>
        </div>
        <label style={label}><span style={{ flex: '0 0 44px' }}>이름</span>
          <input type="text" className="field" defaultValue={sel.name} placeholder="옷 이름" onChange={(e) => updateItem(sel.id, { name: e.target.value })}
            style={{ flexGrow: 1, minWidth: 0, fontWeight: 700 }} />
        </label>
        <label style={label}><span style={{ flex: '0 0 44px' }}>브랜드</span>
          <input type="text" className="field" defaultValue={sel.brand} placeholder="브랜드 입력" onChange={(e) => updateItem(sel.id, { brand: e.target.value })}
            style={{ flexGrow: 1, minWidth: 0 }} />
        </label>
        <div role="group" aria-label="카테고리" style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', margin: '0 -16px', padding: '0 16px', scrollbarWidth: 'none' }}>
          <span style={{ flex: '0 0 44px', fontSize: 14, fontWeight: 500 }}>종류</span>
          {Object.entries(CATS).filter(([k]) => k !== 'all').map(([k, n]) => (
            <button key={k} type="button" className="chip" aria-pressed={sel.cat === k} style={{ flexShrink: 0, padding: '0 14px' }}
              onClick={() => updateItem(sel.id, { cat: k })}>{n}</button>
          ))}
        </div>
        <div role="group" aria-label="입는 계절" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ flexGrow: 1, fontSize: 14, fontWeight: 500 }}>계절</span>
          {SEASONS.map(([k, n]) => {
            const on = sel.seasons.includes(k)
            return (
              <button key={k} type="button" className="chip" aria-pressed={on} style={{ minWidth: 54 }}
                onClick={() => updateItem(sel.id, { seasons: on ? sel.seasons.filter((x) => x !== k) : [...sel.seasons, k] })}>{n}</button>
            )
          })}
        </div>
        <label style={{ ...label, justifyContent: 'space-between' }}>가격
          <input type="text" inputMode="numeric" className="field" value={priceText}
            onChange={(e) => {
              const n = Number(e.target.value.replace(/[^0-9]/g, '')) || 0
              setPriceText(n ? n.toLocaleString('ko-KR') : '')
              updateItem(sel.id, { price: n })
            }}
            style={{ width: 150, textAlign: 'right' }} />
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type="button" className="btn-primary" onClick={onBoard}>이 옷으로 코디 짜기</button>
          {!sel.own && (
            <button type="button" className="btn-secondary" onClick={() => { updateItem(sel.id, { own: true }); onClose() }}>샀어요, 가진 옷으로 옮기기</button>
          )}
          <button type="button" onClick={() => (confirmDel ? onDelete() : setConfirmDel(true))}
            style={{ minHeight: 44, background: 'none', border: 0, color: confirmDel ? '#FF453A' : 'var(--muted-2)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {confirmDel ? '한 번 더 누르면 옷장과 코디에서 빠져요' : '옷장에서 삭제'}
          </button>
        </div>
      </section>
    </div>
  )
}
