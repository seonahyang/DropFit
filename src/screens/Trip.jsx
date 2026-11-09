import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import LookThumb from '../components/LookThumb.jsx'
import { IconBack, IconPlus, IconCheck } from '../components/Icons.jsx'
import { useStore, tripSummary, dayDate } from '../data/store.jsx'
import { won } from '../data/samples.js'
import { tripMeta } from './Boards.jsx'

// 시안: AppTrip.dc.html
export default function Trip() {
  const { tripId } = useParams()
  const { trips, looks, itemById, togglePacked } = useStore()
  const [view, setView] = useState('days')
  const trip = trips.find((t) => t.id === tripId)
  if (!trip) return <Navigate to="/boards" replace />

  const sum = tripSummary(trip, looks, itemById)
  const packedCount = sum.order.filter((k) => trip.packed[k]).length

  return (
    <div className="app">
      <header style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2, padding: 'calc(10px + var(--safe-t)) 16px 0 8px' }}>
        <Link to="/boards" aria-label="코디 모음으로" className="icon-btn"><IconBack /></Link>
        <div style={{ paddingLeft: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em' }}>{trip.name}</h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--muted-2)' }}>{tripMeta(trip, sum)}</p>
        </div>
        <div className="tabs" role="group" aria-label="보기" style={{ marginTop: 6, padding: '0 0 0 8px' }}>
          {[['days', '일차별 코디'], ['pack', '챙길 옷']].map(([k, label]) => (
            <button key={k} type="button" className="tab" aria-pressed={view === k} onClick={() => setView(k)}>{label}</button>
          ))}
        </div>
      </header>

      <main className="scroll" style={{ padding: '10px 4px calc(24px + var(--safe-b))' }}>
        {view === 'days' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px 6px', alignItems: 'start' }}>
            {sum.days.map(({ day, look }) => (
              <Link key={day} to={look ? `/board/${look.id}` : `/board/new?trip=${trip.id}&day=${day}`} style={{ display: 'block', minWidth: 0 }}>
                {look ? (
                  <LookThumb look={look} itemById={itemById} />
                ) : (
                  <span style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, aspectRatio: '4 / 5', background: 'var(--surface-1)', borderRadius: 'var(--r-card)', fontSize: 14, fontWeight: 700 }}>
                    <IconPlus size={28} w={2.2} />
                    코디 짜기
                  </span>
                )}
                <span style={{ display: 'block', padding: '7px 10px 0', fontSize: 14, fontWeight: 700 }}>{day}일차</span>
                <span style={{ display: 'block', padding: '1px 10px 0', fontSize: 12, color: 'var(--muted-2)' }}>{dayDate(trip, day) || (look ? look.name : '아직 비어 있어요')}</span>
              </Link>
            ))}
          </div>
        )}

        {view === 'pack' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sum.order.length === 0 ? (
              <p style={{ margin: '40px 12px', fontSize: 14, color: 'var(--muted-2)', textAlign: 'center' }}>코디를 짜면 쓴 옷이 여기 모여요</p>
            ) : (
              <>
                <p style={{ margin: '0 12px 4px', fontSize: 14, color: 'var(--muted-2)' }}>코디에 쓴 옷만 모았어요. 챙긴 옷 {packedCount} / {sum.order.length}</p>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {sum.order.map((k) => {
                    const it = itemById[k]
                    const on = !!trip.packed[k]
                    return (
                      <li key={k}>
                        <button type="button" aria-pressed={on} onClick={() => togglePacked(trip.id, k)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '6px 12px 6px 6px', background: 'var(--surface-1)', border: 0, borderRadius: 22, textAlign: 'left', cursor: 'pointer' }}>
                          <span style={{ flexShrink: 0, width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, background: it.tint, borderRadius: 18, opacity: on ? 0.5 : 1 }}>
                            <img src={it.src} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                          </span>
                          <span style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, textDecoration: on ? 'line-through' : 'none' }}>{it.name}</span>
                            <span style={{ fontSize: 13, color: 'var(--muted-2)' }}>{sum.counts[k]}번 입어요</span>
                          </span>
                          <span aria-hidden="true" style={{ flexShrink: 0, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? '#FFFFFF' : 'transparent', border: `2px solid ${on ? '#FFFFFF' : '#8E8E93'}`, borderRadius: '50%' }}>
                            <IconCheck color={on ? '#000000' : 'transparent'} />
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <p style={{ margin: '6px 12px', fontSize: 14 }}>아직 안 산 옷 <b>{won(sum.buyTotal)}</b></p>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
