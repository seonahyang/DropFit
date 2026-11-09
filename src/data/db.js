import { openDB } from 'idb'

// IndexedDB: 옷(items) · 코디(looks) · 여행(trips) · 설정(meta)
// 옷 이미지는 Blob 그대로 저장하고, 화면에 쓸 때만 object URL로 바꿈
const DB_NAME = 'dropfit'
const VERSION = 1

let dbp = null
export function getDB() {
  if (!dbp) {
    dbp = openDB(DB_NAME, VERSION, {
      upgrade(db) {
        db.createObjectStore('items', { keyPath: 'id' })
        db.createObjectStore('looks', { keyPath: 'id' })
        db.createObjectStore('trips', { keyPath: 'id' })
        db.createObjectStore('meta')
      },
    })
  }
  return dbp
}

// 메모리용 item(src는 object URL) → 저장용(src 빼고 blob만)
const toRecord = (x) => {
  const r = { ...x }
  if (r.blob) delete r.src
  if (r.origBlob) delete r.srcOrig
  return r
}
const fromRecord = (r) => {
  const x = { ...r }
  if (x.blob) x.src = URL.createObjectURL(x.blob)
  if (x.origBlob) x.srcOrig = URL.createObjectURL(x.origBlob)
  return x
}

export async function loadAll(seed) {
  const db = await getDB()
  const seeded = await db.get('meta', 'seeded')
  if (!seeded) await writeAll(seed())
  const [items, looks, trips] = await Promise.all([db.getAll('items'), db.getAll('looks'), db.getAll('trips')])
  items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  return { items: items.map(fromRecord), looks, trips: trips.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)) }
}

export async function writeAll({ items, looks, trips }) {
  const db = await getDB()
  const tx = db.transaction(['items', 'looks', 'trips', 'meta'], 'readwrite')
  await Promise.all([
    tx.objectStore('items').clear(), tx.objectStore('looks').clear(), tx.objectStore('trips').clear(),
  ])
  await Promise.all([
    ...items.map((x) => tx.objectStore('items').put(toRecord(x))),
    ...looks.map((x) => tx.objectStore('looks').put(x)),
    ...trips.map((x) => tx.objectStore('trips').put(x)),
    tx.objectStore('meta').put(true, 'seeded'),
  ])
  await tx.done
}

export async function put(store, value) {
  const db = await getDB()
  return db.put(store, store === 'items' ? toRecord(value) : value)
}
export async function putMany(store, values) {
  const db = await getDB()
  const tx = db.transaction(store, 'readwrite')
  await Promise.all(values.map((v) => tx.store.put(store === 'items' ? toRecord(v) : v)))
  await tx.done
}
export async function del(store, id) {
  const db = await getDB()
  return db.delete(store, id)
}
