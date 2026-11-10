import { makeConfig, removeBg, downscale } from './bgRemoval.js'

// 옷 추가 대기열 — 화면을 옮겨도(편집기로 갔다 와도) 처리가 계속되도록 컴포넌트 밖에 둠
// card { key, url(미리보기), st: 'waiting'|'working'|'done'|'check'|'added', pct, phase, result }
// result { blob(배경 지운 컷), origBlob(같은 영역 원본), vw, vh, url }

const listeners = new Set()
let cards = []
let running = false
export let settings = { model: 'isnet_quint8', device: 'cpu' }

const emit = () => listeners.forEach((f) => f(cards))
const patch = (key, change) => {
  cards = cards.map((c) => (c.key === key ? { ...c, ...change } : c))
  emit()
}

export function subscribe(fn) {
  listeners.add(fn)
  fn(cards)
  return () => listeners.delete(fn)
}
export const getCards = () => cards

export function addFiles(files) {
  const added = files.map((f) => ({ key: Math.random().toString(36).slice(2), file: f, url: URL.createObjectURL(f), st: 'waiting', pct: 0, phase: '' }))
  cards = cards.concat(added)
  emit()
  run()
}

export function markAdded(keys) {
  cards = cards.map((c) => (keys.includes(c.key) ? { ...c, st: 'added' } : c))
  emit()
}

export function clearAdded() {
  cards.filter((c) => c.st === 'added').forEach((c) => URL.revokeObjectURL(c.url))
  cards = cards.filter((c) => c.st !== 'added')
  emit()
}

async function run() {
  if (running) return
  running = true
  try {
    for (;;) {
      const c = cards.find((x) => x.st === 'waiting')
      if (!c) break
      await processOne(c)
    }
  } finally {
    running = false
  }
}

async function processOne(c) {
  patch(c.key, { st: 'working', pct: 2, phase: '' })
  // 추론 중에는 진행률을 알 수 없어 90%까지 천천히 올라가게 보여 줌
  let fake = 5
  const timer = setInterval(() => {
    const cur = cards.find((x) => x.key === c.key)
    if (!cur || cur.phase === 'model') return
    fake = Math.min(90, fake + Math.max(1, (90 - fake) * 0.08))
    patch(c.key, { pct: Math.round(fake) })
  }, 250)
  try {
    const { blob: small } = await downscale(c.file, 1600)
    const cfg = makeConfig({
      ...settings,
      onProgress: (key, cur, total) => {
        if (!total || !String(key).startsWith('fetch')) return
        if (cur < total) patch(c.key, { phase: 'model', pct: Math.round((cur / total) * 100) })
        else patch(c.key, { phase: '' })
      },
    })
    let cut
    try {
      cut = await removeBg(small, cfg)
    } catch (e) {
      // GPU가 안 되는 폰이면 CPU로 한 번 더
      if (settings.device === 'gpu') { settings = { ...settings, device: 'cpu' }; cut = await removeBg(small, makeConfig(settings)) } else throw e
    }
    const result = await trimToContent(cut, small)
    clearInterval(timer)
    patch(c.key, { st: result.needsCheck ? 'check' : 'done', pct: 100, phase: '', result })
  } catch (e) {
    clearInterval(timer)
    console.error('배경 제거 실패', e)
    // 실패하면 원본을 그대로 두고 "확인 필요"로 — 편집기 지우개로 직접 지울 수 있음
    try {
      // 투명 배경 PNG(쇼핑몰 누끼 등)는 그대로 살리고 여백만 자름
      const { blob } = await downscale(c.file, 1600, 'image/png')
      const result = { ...(await trimToContent(blob, blob)), failed: true }
      patch(c.key, { st: 'check', pct: 100, phase: '', result, error: String((e && e.message) || e) })
    } catch (e2) {
      patch(c.key, { st: 'check', pct: 100, phase: '', error: String((e && e.message) || e) })
    }
  }
}

// 투명한 테두리를 잘라 옷만 남기고, 같은 영역의 원본도 잘라 둠(편집기 복원용)
// 옷 면적이 너무 작거나 거의 전부면 "확인 필요"
async function trimToContent(cutBlob, origBlob) {
  const [cutBmp, origBmp] = await Promise.all([createImageBitmap(cutBlob), createImageBitmap(origBlob)])
  const W = cutBmp.width
  const H = cutBmp.height
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(cutBmp, 0, 0)
  const data = ctx.getImageData(0, 0, W, H).data
  let minX = W, minY = H, maxX = -1, maxY = -1, solid = 0, soft = 0
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const a = data[(y * W + x) * 4 + 3]
      if (a > 32) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
        if (a > 200) solid++
        else soft++
      }
    }
  }
  const total = W * H
  const kept = solid + soft
  const needsCheck = kept < total * 0.04 || kept > total * 0.93 || soft > kept * 0.25
  if (maxX < 0) { minX = 0; minY = 0; maxX = W - 1; maxY = H - 1 }
  const pad = Math.round(Math.max(W, H) * 0.02)
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad)
  maxX = Math.min(W - 1, maxX + pad); maxY = Math.min(H - 1, maxY + pad)
  const cw = maxX - minX + 1
  const ch = maxY - minY + 1

  const crop = async (bmp) => {
    const c = document.createElement('canvas')
    c.width = cw
    c.height = ch
    c.getContext('2d').drawImage(bmp, minX * (bmp.width / W), minY * (bmp.height / H), cw * (bmp.width / W), ch * (bmp.height / H), 0, 0, cw, ch)
    return new Promise((r) => c.toBlob(r, 'image/png'))
  }
  const [blob, orig] = await Promise.all([crop(cutBmp), crop(origBmp)])
  cutBmp.close && cutBmp.close()
  origBmp.close && origBmp.close()
  return { blob, origBlob: orig, vw: cw, vh: ch, url: URL.createObjectURL(blob), needsCheck }
}

// 옷장에 넣기 전에 입력한 정보(이름·브랜드·종류·계절·가격)
export function setMeta(key, meta) {
  const c = cards.find((x) => x.key === key)
  if (!c) return
  patch(key, { meta: { ...(c.meta || {}), ...meta } })
}
