// 코디 PNG: 화면 캡처가 아니라 저장된 위치·크기·회전값으로 새로 그림
const RATIO = { '1:1': [1, 1], '4:5': [4, 5], '9:16': [9, 16] }

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export async function renderLookPng(look, itemById, width = 1080) {
  const [rw, rh] = RATIO[look.ratio] || RATIO['4:5']
  const W = width
  const H = Math.round((width * rh) / rw)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = look.bg || '#F6F5F2'
  ctx.fillRect(0, 0, W, H)

  const pieces = [...look.placed].sort((a, b) => a.z - b.z)
  const imgs = await Promise.all(pieces.map((p) => (itemById[p.id] ? loadImage(itemById[p.id].src).catch(() => null) : null)))
  const k = W / 370 // 화면 보드 폭 기준 그림자 크기

  pieces.forEach((p, i) => {
    const img = imgs[i]
    if (!img) return
    const it = itemById[p.id]
    const nw = img.naturalWidth || it.vw || 1
    const nh = img.naturalHeight || it.vh || 1
    const w = (p.w / 100) * W
    const h = (w * nh) / nw
    const x = (p.x / 100) * W
    const y = (p.y / 100) * H
    ctx.save()
    ctx.translate(x + w / 2, y + h / 2)
    ctx.rotate((p.r * Math.PI) / 180)
    ctx.shadowColor = 'rgba(0,0,0,.22)'
    ctx.shadowBlur = 6 * k
    ctx.shadowOffsetY = 6 * k
    ctx.drawImage(img, -w / 2, -h / 2, w, h)
    ctx.restore()
  })

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

// 사진 앱 저장: 폰은 공유 시트(→ "이미지 저장"), 안 되면 파일 다운로드
export async function saveToPhotos(blob, name) {
  const fileName = (name || 'DropFit').replace(/[\\/:*?"<>|]/g, '').trim() + '.png'
  const file = new File([blob], fileName, { type: 'image/png' })
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name })
      return 'shared'
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  return 'downloaded'
}
