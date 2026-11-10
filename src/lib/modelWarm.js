import { makeConfig, preload } from './bgRemoval.js'
import { settings } from './uploadQueue.js'

// 배경 제거 모델을 미리 받아 두기 (옷 추가 화면에 들어가면 자동, 설정에서 수동)
// state: { status: 'idle'|'loading'|'ready'|'error', pct, cached }
let state = { status: 'idle', pct: 0, cached: false }
const subs = new Set()
const emit = (patch) => { state = { ...state, ...patch }; subs.forEach((f) => f(state)) }
let job = null

export function subscribeModel(fn) {
  subs.add(fn)
  fn(state)
  return () => subs.delete(fn)
}

// 이전에 받아 둔 모델이 서비스 워커 캐시에 있는지
export async function checkCached() {
  try {
    if (!('caches' in window)) return false
    const c = await caches.open('bg-model')
    const keys = await c.keys()
    const cached = keys.length > 0
    emit({ cached })
    return cached
  } catch (e) {
    return false
  }
}

export function warmModel() {
  if (job) return job
  emit({ status: 'loading', pct: 0 })
  let seen = {}
  job = preload(makeConfig({
    ...settings,
    onProgress: (key, cur, total) => {
      if (!total || !String(key).startsWith('fetch')) return
      seen[key] = [cur, total]
      const sum = Object.values(seen).reduce((a, [c, t]) => [a[0] + c, a[1] + t], [0, 0])
      emit({ pct: Math.round((sum[0] / sum[1]) * 100) })
    },
  }))
    .then(() => emit({ status: 'ready', pct: 100, cached: true }))
    .catch((e) => { console.error(e); job = null; emit({ status: 'error' }) })
  return job
}
