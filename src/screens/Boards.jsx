import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import LookThumb from '../components/LookThumb.jsx'
import { IconPlus, IconSettings } from '../components/Icons.jsx'
import { useStore, tripSummary } from '../data/store.jsx'
import { SEASONS, SEASON_LABEL, NOTES } from '../data/samples.js'

const EMPTY = '#1C1C1E'

// 시안 cover(): 코디의 앞 두 조각만 크게 겹쳐 보여 줌
function Cover({ look, itemById, row, x, y, w }) {
  const pieces = look ? [...look.placed].sort((a, b) => a.z - b.z).slice(0, 2) : []
  return (
    <span style={{ position: 'relative', display: 'block', gridRow: row, overflow: 'hidden', background: look ? look.bg : EMPTY }}>
      {pieces.map((q, i) => itemById[q.id] && (
        <img key={i} src={itemById[q.id].src} alt=""
          style={{ position: 'absolute', left: (x + i * 42) + '%', top: (y + i * 6) + '%', width: w + '%', transform: `rotate(${q.r}deg)`, filter: 'drop-shadow(0 3px 3px rgba(0,0,0,.25))' }} />
      ))}
    </span>
  )
}

export function tripMeta(trip, sum) {
  const tags = [trip.season && SEASON_LABEL[trip.season], trip.note].filter(Boolean).join(' · ')
  return (tags ? tags + ' · ' : '') + `${sum.doneDays} / ${trip.days}일 완성` + (sum.order.length ? ` · 챙길 옷 ${sum.order.length}개` : '')
}

// 시안: AppBoards.dc.html
export default function Boards() {
  const { trips, looks, itemById, addTrip } = useStore()
  const navigate = useNavigate()
  const [tab, setTab] = useState(() => sessionStorage.getItem('boardsTab') || 'trips')
  const [sheet, setSheet] = useState(false)
  const [form, setForm] = useState({ name: '', days: 4, season: '', note: '' })

  const pickTab = (k) => { setTab(k); try { sessionStorage.setItem('boardsTab', k) } catch (e) { /* ignore */ } }

  const createTrip = () => {
    const id = addTrip({ name: form.name.trim() || '새 여행', days: form.days, season: form.season, note: form.note })
    setSheet(false)
    navigate(`/trip/${id}`)
  }

  return (
    <div className="app">
      <main className="scroll" style={{ padding: '0 0 104px' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'calc(22px + var(--safe-t)) 8px 8px 16px' }}>
          <Link to="/" style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em' }}>DropFit</Link>
          <Link to="/settings" aria-label="설정" className="icon-btn" style={{ color: 'var(--muted-2)' }}><IconSettings /></Link>
        </header>

        <div className="tabs" role="group" aria-label="코디 보기" style={{ position: 'sticky', top: 0, zIndex: 4, background: 'var(--bg)' }}>
          <h1 className="sr-only">내 코디</h1>
          {[['trips', '여행'], ['all', '모든 코디']].map(([k, label]) => (
            <button key={k} type="button" className="tab" aria-pressed={tab === k} onClick={() => pickTab(k)}>{label}</button>
          ))}
        </div>

        <div style={{ padding: '10px 4px 0' }}>
          {tab === 'trips' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {trips.map((t) => {
                const sum = tripSummary(t, looks, itemById)
                const firstLooks = sum.days.map((d) => d.look).filter(Boolean)
                return (
                  <Link key={t.id} to={`/trip/${t.id}`} style={{ display: 'block' }}>
                    <span style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gridTemplateRows: 'repeat(2, 124px)', gap: 3, overflow: 'hidden', borderRadius: 'var(--r-card)' }}>
                      <Cover look={firstLooks[0]} itemById={itemById} row="span 2" x={4} y={8} w={50} />
                      <Cover look={firstLooks[1]} itemById={itemById} row="auto" x={4} y={6} w={44} />
                      <Cover look={firstLooks[2]} itemById={itemById} row="auto" x={4} y={6} w={44} />
                    </span>
                    <span style={{ display: 'block', padding: '8px 10px 0', fontSize: 16, fontWeight: 700 }}>{t.name}</span>
                    <span style={{ display: 'block', padding: '2px 10px 0', fontSize: 13, color: 'var(--muted-2)' }}>{tripMeta(t, sum)}</span>
                  </Link>
                )
              })}
              <button type="button" onClick={() => { setForm({ name: '', days: 4, season: '', note: '' }); setSheet(true) }}
                style={{ minHeight: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--surface-1)', border: 0, borderRadius: 'var(--r-card)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                <IconPlus size={22} w={2.2} />
                새 여행 만들기
              </button>
            </div>
          )}

          {tab === 'all' && (
            <div className="pins">
              <Link to="/board/new" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, height: 170, margin: '0 0 10px', background: 'var(--surface-1)', borderRadius: 'var(--r-card)', fontSize: 14, fontWeight: 700 }}>
                <IconPlus size={28} w={2.2} />
                새 코디 짜기
              </Link>
              {looks.map((l) => {
                const trip = trips.find((t) => t.id === l.tripId)
                return (
                  <Link key={l.id} to={`/board/${l.id}`} style={{ display: 'block', margin: '0 0 10px' }}>
                    <LookThumb look={l} itemById={itemById} />
                    <span style={{ display: 'block', padding: '7px 10px 0', fontSize: 13, color: 'var(--caption)' }}>{l.name}</span>
                    <span style={{ display: 'block', padding: '1px 10px 0', fontSize: 12, color: 'var(--muted-2)' }}>{trip ? trip.name : '여행 없음'}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <BottomNav current="boards" />

      {sheet && (
        <div className="sheet-wrap">
          <button type="button" className="sheet-scrim" aria-label="닫기" onClick={() => setSheet(false)} />
          <section className="sheet" aria-label="새 여행" style={{ paddingBottom: 'calc(24px + var(--safe-b))' }}>
            <span className="grabber" aria-hidden="true" />
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, letterSpacing: '-0.03em' }}>새 여행</h2>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 500 }}>여행 이름
              <input type="text" className="field" value={form.name} placeholder="오사카 3박 4일" onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ minHeight: 48 }} />
            </label>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>며칠 동안</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button type="button" aria-label="하루 줄이기" onClick={() => setForm({ ...form, days: Math.max(1, form.days - 1) })} style={roundBtn}>−</button>
                <span style={{ minWidth: 36, textAlign: 'center', fontSize: 16, fontWeight: 700 }}>{form.days}일</span>
                <button type="button" aria-label="하루 늘리기" onClick={() => setForm({ ...form, days: Math.min(14, form.days + 1) })} style={roundBtn}>+</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>계절</span>
              <div role="group" aria-label="여행 계절" style={grid4}>
                {SEASONS.map(([k, n]) => (
                  <button key={k} type="button" className="chip" aria-pressed={form.season === k} style={{ padding: 0 }}
                    onClick={() => setForm({ ...form, season: form.season === k ? '' : k })}>{n}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>비고 <span style={{ fontWeight: 400, color: 'var(--muted)' }}>특수 지역이면 선택</span></span>
              <div role="group" aria-label="특수 지역" style={grid4}>
                {NOTES.map((n) => (
                  <button key={n} type="button" className="chip" aria-pressed={form.note === n} style={{ padding: 0 }}
                    onClick={() => setForm({ ...form, note: form.note === n ? '' : n })}>{n}</button>
                ))}
              </div>
            </div>
            <button type="button" className="btn-primary" onClick={createTrip}>여행 만들기</button>
          </section>
        </div>
      )}
    </div>
  )
}

const roundBtn = { width: 44, height: 44, background: 'var(--surface-2)', border: 0, borderRadius: '50%', color: '#FFFFFF', fontSize: 20, cursor: 'pointer' }
const grid4 = { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }
