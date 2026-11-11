import { createContext, useContext, useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { SAMPLE_ITEMS, SAMPLE_LOOKS } from './samples.js'
import { loadAll, writeAll, put, putMany, del } from './db.js'

// 옷(items) · 코디(looks) · 여행(trips) 한곳에서 관리
//
// item  { id, name, brand, cat, own, price, seasons[], tint, h, vw, vh, src }
// look  { id, name, ratio, bg, placed[{ id(itemId), x, y, w, r, z }], tripId, day, updatedAt }
// trip  { id, name, days, season, note, startDate, packed{ itemId: true } }

const now = () => Date.now()
export const uid = (p) => p + '_' + Math.random().toString(36).slice(2, 9)

export function seed() {
  const items = SAMPLE_ITEMS.map((x, i) => ({ ...x, createdAt: 1000 - i }))
  const trips = [
    { id: 'jp', name: '일본 3박 4일', days: 4, season: 'winter', note: '', startDate: '2026-12-18', packed: {}, createdAt: 2 },
    { id: 'je', name: '제주 2박 3일', days: 3, season: 'spring', note: '', startDate: '2026-04-10', packed: {}, createdAt: 1 },
  ]
  const L = (id, name, bg, key, tripId, day, t) => ({ id, name, ratio: '4:5', bg, placed: SAMPLE_LOOKS[key].map((q) => ({ ...q })), tripId, day, updatedAt: t })
  const looks = [
    L('jp1', '일본 3박 4일 · 1일차', '#FFFFFF', 'jp1', 'jp', 1, 6),
    L('weekend', '주말 약속', '#F4C9D2', 'weekend', null, null, 5),
    L('jp2', '일본 3박 4일 · 2일차', '#C9D8E8', 'jp2', 'jp', 2, 4),
    L('je1', '제주 2박 3일 · 1일차', '#F3E6D6', 'je1', 'je', 1, 3),
    L('jp4', '일본 3박 4일 · 4일차', '#F4C9D2', 'jp4', 'jp', 4, 2),
    L('je2', '제주 2박 3일 · 2일차', '#FFFFFF', 'je2', 'je', 2, 1),
  ]
  return { items, looks, trips }
}

const Ctx = createContext(null)

// 화면은 메모리 상태로 바로 바뀌고, 같은 변경을 IndexedDB에 바로 씀 (새로고침 후에도 유지)
export function StoreProvider({ children }) {
  const [db, setDbState] = useState(null)
  const [error, setError] = useState('')
  const ref = useRef(null)
  const setDb = (next) => { ref.current = next; setDbState(next) }
  const save = (p) => p.catch((e) => console.error('저장 실패', e))

  useEffect(() => {
    let alive = true
    loadAll(seed)
      .then((d) => { if (alive) setDb(d) })
      .catch((e) => {
        console.error(e)
        // 사생활 보호 모드 등 IndexedDB를 못 쓰면 메모리로라도 동작
        if (alive) { setError('이 브라우저에서는 저장이 안 돼요. 새로고침하면 처음 상태로 돌아가요.'); setDb(seed()) }
      })
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {})
    return () => { alive = false }
  }, [])

  const updateItem = useCallback((id, change) => {
    const d = ref.current
    const items = d.items.map((x) => (x.id === id ? { ...x, ...change } : x))
    setDb({ ...d, items })
    save(put('items', items.find((x) => x.id === id)))
  }, [])

  const addItems = useCallback((list) => {
    const d = ref.current
    const t = now()
    const added = list.map((x, i) => ({ createdAt: t + list.length - i, ...x }))
    setDb({ ...d, items: [...added, ...d.items] })
    save(putMany('items', added))
  }, [])

  const deleteItem = useCallback((id) => {
    const d = ref.current
    const x = d.items.find((i) => i.id === id)
    if (x && x.blob && x.src) URL.revokeObjectURL(x.src)
    // 이 옷을 쓴 코디에서도 빼기
    const looks = d.looks.map((l) => (l.placed.some((p) => p.id === id) ? { ...l, placed: l.placed.filter((p) => p.id !== id) } : l))
    const changed = looks.filter((l, i) => l !== d.looks[i])
    setDb({ ...d, items: d.items.filter((i) => i.id !== id), looks })
    save(del('items', id))
    if (changed.length) save(putMany('looks', changed))
  }, [])

  // 코디 저장: 같은 여행 일차에 다른 코디가 있으면 그 코디는 여행에서 빼고(모든 코디에는 남김) 새 코디를 넣음
  const saveLook = useCallback((look) => {
    const d = ref.current
    const id = look.id || uid('look')
    const next = { ...look, id, updatedAt: now() }
    const moved = []
    const others = d.looks
      .filter((l) => l.id !== id)
      .map((l) => {
        if (next.tripId && l.tripId === next.tripId && l.day === next.day) {
          const m = { ...l, tripId: null, day: null }
          moved.push(m)
          return m
        }
        return l
      })
    setDb({ ...d, looks: [next, ...others] })
    save(putMany('looks', [next, ...moved]))
    return id
  }, [])

  const deleteLook = useCallback((id) => {
    const d = ref.current
    setDb({ ...d, looks: d.looks.filter((l) => l.id !== id) })
    save(del('looks', id))
  }, [])

  const addTrip = useCallback((trip) => {
    const d = ref.current
    const t = { id: uid('trip'), packed: {}, startDate: '', createdAt: now(), ...trip }
    setDb({ ...d, trips: [t, ...d.trips] })
    save(put('trips', t))
    return t.id
  }, [])

  // 여행 삭제: 그 여행의 코디는 지우지 않고 "모든 코디"에 남김
  const deleteTrip = useCallback((tripId) => {
    const d = ref.current
    const freed = d.looks.filter((l) => l.tripId === tripId).map((l) => ({ ...l, tripId: null, day: null }))
    const looks = d.looks.map((l) => freed.find((f) => f.id === l.id) || l)
    setDb({ ...d, trips: d.trips.filter((t) => t.id !== tripId), looks })
    save(del('trips', tripId))
    if (freed.length) save(putMany('looks', freed))
  }, [])

  const togglePacked = useCallback((tripId, itemId) => {
    const d = ref.current
    const trips = d.trips.map((t) => (t.id === tripId ? { ...t, packed: { ...t.packed, [itemId]: !t.packed[itemId] } } : t))
    setDb({ ...d, trips })
    save(put('trips', trips.find((t) => t.id === tripId)))
  }, [])

  // 발표 전에 샘플 상태로 되돌리기
  const resetToSample = useCallback(async () => {
    const s0 = seed()
    await writeAll(s0)
    setDb(await loadAll(seed))
  }, [])

  const value = useMemo(() => {
    if (!db) return null
    const itemById = Object.fromEntries(db.items.map((x) => [x.id, x]))
    const looksSorted = [...db.looks].sort((a, b) => b.updatedAt - a.updatedAt)
    return { ...db, looks: looksSorted, itemById, error, updateItem, addItems, deleteItem, saveLook, deleteLook, addTrip, deleteTrip, togglePacked, resetToSample }
  }, [db, error, updateItem, addItems, deleteItem, saveLook, deleteLook, addTrip, deleteTrip, togglePacked, resetToSample])

  if (!value) return <div className="app" aria-busy="true" />
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)

// 여행 하나의 일차별 코디 · 챙길 옷 계산 (시안 AppTrip 로직)
export function tripSummary(trip, looks, itemById) {
  const days = Array.from({ length: trip.days }, (_, i) => {
    const day = i + 1
    return { day, look: looks.find((l) => l.tripId === trip.id && l.day === day) || null }
  })
  const counts = {}
  const order = []
  days.forEach((d) => {
    if (!d.look) return
    d.look.placed.forEach((q) => {
      if (!itemById[q.id]) return
      if (!counts[q.id]) { counts[q.id] = 0; order.push(q.id) }
      counts[q.id] += 1
    })
  })
  order.sort((a, b) => counts[b] - counts[a])
  const doneDays = days.filter((d) => d.look && d.look.placed.length > 0).length
  const buyTotal = order.reduce((a, k) => a + (itemById[k].own ? 0 : itemById[k].price || 0), 0)
  return { days, counts, order, doneDays, buyTotal }
}

export function dayDate(trip, day) {
  if (!trip.startDate) return ''
  const d = new Date(trip.startDate + 'T00:00:00')
  d.setDate(d.getDate() + day - 1)
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}
