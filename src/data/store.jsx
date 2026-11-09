import { createContext, useContext, useMemo, useState, useCallback } from 'react'
import { SAMPLE_ITEMS, SAMPLE_LOOKS } from './samples.js'

// 옷(items) · 코디(looks) · 여행(trips) 한곳에서 관리
// 2단계: 메모리 저장 / 3단계: 같은 액션을 IndexedDB에 쓰도록 연결
//
// item  { id, name, brand, cat, own, price, seasons[], tint, h, vw, vh, src }
// look  { id, name, ratio, bg, placed[{ id(itemId), x, y, w, r, z }], tripId, day, updatedAt }
// trip  { id, name, days, season, note, startDate, packed{ itemId: true } }

const now = () => Date.now()
export const uid = (p) => p + '_' + Math.random().toString(36).slice(2, 9)

function seed() {
  const items = SAMPLE_ITEMS.map((x) => ({ ...x }))
  const trips = [
    { id: 'jp', name: '일본 3박 4일', days: 4, season: 'winter', note: '', startDate: '2026-12-18', packed: {} },
    { id: 'je', name: '제주 2박 3일', days: 3, season: 'spring', note: '', startDate: '2026-04-10', packed: {} },
  ]
  const L = (id, name, bg, key, tripId, day, t) => ({ id, name, ratio: '4:5', bg, placed: SAMPLE_LOOKS[key].map((q) => ({ ...q })), tripId, day, updatedAt: t })
  const looks = [
    L('jp1', '일본 1일차', '#FFFFFF', 'jp1', 'jp', 1, 6),
    L('weekend', '주말 약속', '#F4C9D2', 'weekend', null, null, 5),
    L('jp2', '일본 2일차', '#C9D8E8', 'jp2', 'jp', 2, 4),
    L('je1', '제주 1일차', '#F3E6D6', 'je1', 'je', 1, 3),
    L('jp4', '일본 4일차', '#F4C9D2', 'jp4', 'jp', 4, 2),
    L('je2', '제주 2일차', '#FFFFFF', 'je2', 'je', 2, 1),
  ]
  return { items, looks, trips }
}

const Ctx = createContext(null)

export function StoreProvider({ children }) {
  const [db, setDb] = useState(seed)

  const updateItem = useCallback((id, change) => {
    setDb((d) => ({ ...d, items: d.items.map((x) => (x.id === id ? { ...x, ...change } : x)) }))
  }, [])

  const addItems = useCallback((list) => {
    setDb((d) => ({ ...d, items: [...list, ...d.items] }))
  }, [])

  // 코디 저장: 같은 여행 일차에 다른 코디가 있으면 그 코디는 여행에서 빼고(모든 코디에는 남김) 새 코디를 넣음
  const saveLook = useCallback((look) => {
    const id = look.id || uid('look')
    const next = { ...look, id, updatedAt: now() }
    setDb((d) => {
      const others = d.looks
        .filter((l) => l.id !== id)
        .map((l) => (next.tripId && l.tripId === next.tripId && l.day === next.day ? { ...l, tripId: null, day: null } : l))
      return { ...d, looks: [next, ...others] }
    })
    return id
  }, [])

  const addTrip = useCallback((trip) => {
    const t = { id: uid('trip'), packed: {}, startDate: '', ...trip }
    setDb((d) => ({ ...d, trips: [t, ...d.trips] }))
    return t.id
  }, [])

  const togglePacked = useCallback((tripId, itemId) => {
    setDb((d) => ({
      ...d,
      trips: d.trips.map((t) => (t.id === tripId ? { ...t, packed: { ...t.packed, [itemId]: !t.packed[itemId] } } : t)),
    }))
  }, [])

  const value = useMemo(() => {
    const itemById = Object.fromEntries(db.items.map((x) => [x.id, x]))
    const looksSorted = [...db.looks].sort((a, b) => b.updatedAt - a.updatedAt)
    return { ...db, looks: looksSorted, itemById, updateItem, addItems, saveLook, addTrip, togglePacked }
  }, [db, updateItem, addItems, saveLook, addTrip, togglePacked])

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
