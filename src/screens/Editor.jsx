import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { IconBack, IconUndo } from '../components/Icons.jsx'
import { useStore } from '../data/store.jsx'
import { getCards, setResult } from '../lib/uploadQueue.js'

// 시안: AppEditor.dc.html
// 지우개: 결과 캔버스에서 그 자리를 투명하게(destination-out)
// 복원:  같은 자리에 원본 픽셀을 다시 그려 넣음(원형 클립 + 원본 drawImage)
const CHECKER = 'repeating-conic-gradient(#D9DADD 0 25%, #FFFFFF 0 50%)'
const BG_MAP = { checker: CHECKER, white: '#FFFFFF', black: '#2C2C2E', cobalt: '#1F3BE0', pink: '#F4B9C6' }
const BG_LABEL = { checker: '체커보드', white: '흰색', black: '검정', cobalt: '코발트', pink: '분홍' }
const MAX_SIDE = 1600

// 옷이 있는(불투명) 부분만 남기고 투명 여백을 잘라 냄. 원본도 같은 영역으로 잘라 복원용으로 맞춤
function trimCanvases(cut, orig) {
  const W = cut.width
  const H = cut.height
  const data = cut.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data
  let minX = W, minY = H, maxX = -1, maxY = -1
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > 24) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return null // 전부 지운 경우는 그대로
  const pad = Math.max(4, Math.round(Math.max(maxX - minX, maxY - minY) * 0.03))
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad)
  maxX = Math.min(W - 1, maxX + pad); maxY = Math.min(H - 1, maxY + pad)
  const w = maxX - minX + 1
  const h = maxY - minY + 1
  if (w >= W - 2 && h >= H - 2) return { cut, orig, w: W, h: H } // 이미 꽉 참
  const crop = (src) => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    c.getContext('2d').drawImage(src, minX, minY, w, h, 0, 0, w, h)
    return c
  }
  return { cut: crop(cut), orig: crop(orig), w, h }
}
const UNDO_LIMIT = 12

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export default function Editor() {
  const { itemId, cardKey } = useParams()
  const navigate = useNavigate()
  const { itemById, updateItem } = useStore()
  // /editor/upload/:cardKey → 옷 추가 화면의 카드(아직 옷장에 안 넣은 컷)를 고침
  const card = cardKey ? getCards().find((c) => c.key === cardKey && c.result) : null
  const [cardOrigUrl] = useState(() => (card ? URL.createObjectURL(card.result.origBlob) : ''))
  const item = card
    ? { id: card.key, name: (card.meta && card.meta.name) || '새 옷', src: card.result.url, srcOrig: cardOrigUrl, blob: card.result.blob, origBlob: card.result.origBlob, vw: card.result.vw, vh: card.result.vh }
    : itemById[itemId]

  const [tool, setTool] = useState('erase')
  const [size, setSize] = useState(40)
  const [compare, setCompare] = useState(0)
  const [bg, setBg] = useState('checker')
  const [ready, setReady] = useState(false)
  const [undoCount, setUndoCount] = useState(0)
  const [cursor, setCursor] = useState(null) // { x, y } 화면 좌표(스테이지 기준)
  const [saving, setSaving] = useState(false)
  const [hint, setHint] = useState(true)

  const canvasRef = useRef(null)
  const stageRef = useRef(null)
  const origRef = useRef(null) // 원본 이미지(같은 크기)
  const undoRef = useRef([])
  const strokeRef = useRef(null)
  const dims = useRef({ w: 1, h: 1 })
  const [box, setBox] = useState({ w: 0, h: 0 })

  // 처음: 지금 컷을 캔버스에 그리고, 원본을 같은 크기로 준비
  useEffect(() => {
    if (!item) return
    let alive = true
    ;(async () => {
      const cut = await loadImage(item.src)
      const orig = await loadImage(item.srcOrig || item.src)
      if (!alive) return
      const k = Math.min(1, MAX_SIDE / Math.max(cut.naturalWidth || item.vw, cut.naturalHeight || item.vh))
      const w = Math.round((cut.naturalWidth || item.vw) * k)
      const h = Math.round((cut.naturalHeight || item.vh) * k)
      dims.current = { w, h }
      const c = canvasRef.current
      c.width = w
      c.height = h
      c.getContext('2d', { willReadFrequently: true }).drawImage(cut, 0, 0, w, h)
      const o = document.createElement('canvas')
      o.width = w
      o.height = h
      o.getContext('2d').drawImage(orig, 0, 0, w, h)
      origRef.current = o
      setReady(true)
    })().catch((e) => console.error(e))
    return () => { alive = false }
  }, [itemId]) // eslint-disable-line react-hooks/exhaustive-deps

  // 화면에 맞는 캔버스 표시 크기
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const { w, h } = dims.current
      const aw = e.contentRect.width
      const ah = e.contentRect.height
      const s = Math.min(aw / w, ah / h)
      setBox({ w: Math.floor(w * s), h: Math.floor(h * s) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ready])

  if (!item) return <Navigate to={cardKey ? '/upload' : '/'} replace />

  const ctx = () => canvasRef.current.getContext('2d', { willReadFrequently: true })
  const toCanvas = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    const sx = dims.current.w / r.width
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sx, scale: sx }
  }
  const showCursor = (e) => {
    const r = stageRef.current.getBoundingClientRect()
    setCursor({ x: e.clientX - r.left, y: e.clientY - r.top })
  }

  // 점 a→b 구간을 브러시로 칠하기
  const paint = (a, b, radius) => {
    const g = ctx()
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (radius / 3)))
    if (tool === 'erase') {
      g.save()
      g.globalCompositeOperation = 'destination-out'
      g.lineCap = 'round'
      g.lineJoin = 'round'
      g.lineWidth = radius * 2
      g.beginPath()
      g.moveTo(a.x, a.y)
      g.lineTo(b.x + 0.01, b.y)
      g.stroke()
      g.restore()
    } else {
      g.save()
      g.beginPath()
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const x = a.x + (b.x - a.x) * t
        const y = a.y + (b.y - a.y) * t
        g.moveTo(x + radius, y)
        g.arc(x, y, radius, 0, Math.PI * 2)
      }
      g.clip()
      g.globalCompositeOperation = 'source-over'
      g.drawImage(origRef.current, 0, 0)
      g.restore()
    }
  }

  const onDown = (e) => {
    if (!ready || e.button > 0) return
    e.preventDefault()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch (err) { /* ignore */ }
    const { w, h } = dims.current
    undoRef.current.push(ctx().getImageData(0, 0, w, h))
    if (undoRef.current.length > UNDO_LIMIT) undoRef.current.shift()
    setUndoCount(undoRef.current.length)
    setHint(false)
    const p = toCanvas(e)
    const radius = (size / 2) * p.scale
    strokeRef.current = { last: p, radius }
    paint(p, p, radius)
    showCursor(e)
  }
  const onMove = (e) => {
    showCursor(e)
    const s = strokeRef.current
    if (!s) return
    const p = toCanvas(e)
    paint(s.last, p, s.radius)
    s.last = p
  }
  const onUp = () => { strokeRef.current = null; setCursor(null) }

  // 지운 게 없어도 여백이 크면 확정 때 잘라 줌
  const hasSlack = () => {
    const t = trimCanvases(canvasRef.current, origRef.current)
    return !!t && (t.w < dims.current.w - 2 || t.h < dims.current.h - 2)
  }

  const undo = () => {
    const snap = undoRef.current.pop()
    if (!snap) return
    ctx().putImageData(snap, 0, 0)
    setUndoCount(undoRef.current.length)
  }

  const confirm = async () => {
    if (!ready) return navigate(-1)
    if (undoRef.current.length === 0 && item.blob && !hasSlack()) return navigate(-1)
    setSaving(true)
    const t = trimCanvases(canvasRef.current, origRef.current) || { cut: canvasRef.current, orig: origRef.current, w: dims.current.w, h: dims.current.h }
    const blob = await new Promise((r) => t.cut.toBlob(r, 'image/png'))
    const change = { blob, src: URL.createObjectURL(blob), vw: t.w, vh: t.h }
    // 잘린 영역에 맞춘 원본도 함께 저장(다음에 고칠 때 복원용)
    const ob = await new Promise((r) => t.orig.toBlob(r, 'image/png'))
    change.origBlob = ob
    change.srcOrig = URL.createObjectURL(ob)
    if (item.srcOrig && item.origBlob) URL.revokeObjectURL(item.srcOrig)
    if (item.blob && item.src) URL.revokeObjectURL(item.src)
    if (card) {
      URL.revokeObjectURL(change.srcOrig)
      setResult(card.key, { blob: change.blob, url: change.src, origBlob: change.origBlob, vw: change.vw, vh: change.vh })
    } else {
      updateItem(item.id, change)
    }
    navigate(-1)
  }

  return (
    <div className="app">
      <header style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, padding: 'calc(10px + var(--safe-t)) 12px 8px 8px' }}>
        <button type="button" className="icon-btn" aria-label="뒤로" onClick={() => navigate(-1)}><IconBack /></button>
        <h1 style={{ margin: 0, flexGrow: 1, minWidth: 0, fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</h1>
        <button type="button" className="icon-btn" aria-label="실행 취소" disabled={undoCount === 0} onClick={undo}><IconUndo w={2} /></button>
        <button type="button" onClick={confirm} disabled={saving}
          style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 18px', background: '#FFFFFF', color: '#000000', border: 0, borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
          {saving ? '저장 중' : '확정'}
        </button>
      </header>

      <main style={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'relative', flexGrow: 1, minHeight: 0, margin: '0 4px', padding: 14, overflow: 'hidden', borderRadius: 'var(--r-sheet)', background: BG_MAP[bg], backgroundSize: '22px 22px' }}>
          {hint && (
            <p style={{ position: 'absolute', top: 10, left: 10, right: 10, zIndex: 3, margin: 0, padding: '10px 14px', background: 'rgba(0,0,0,.82)', color: '#FFFFFF', borderRadius: 16, fontSize: 13, lineHeight: 1.45, pointerEvents: 'none' }}>
              남은 배경은 지우개로, 잘못 지워진 옷은 복원으로 칠해 보세요.
            </p>
          )}
          <div ref={stageRef} style={{ position: 'absolute', inset: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: box.w || '100%', height: box.h || '100%' }}>
              <canvas ref={canvasRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={() => !strokeRef.current && setCursor(null)}
                aria-label={`${item.name} 컷아웃 편집 영역`}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none', cursor: 'crosshair' }} />
              {compare > 0 && origRef.current && (
                <>
                  <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: '#B8A48C', clipPath: `inset(0 ${100 - compare}% 0 0)`, pointerEvents: 'none' }}>
                    <img src={item.srcOrig || item.src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
                  </div>
                  <div aria-hidden="true" style={{ position: 'absolute', top: -6, bottom: -6, left: compare + '%', width: 2, background: 'var(--accent)', pointerEvents: 'none' }} />
                </>
              )}
            </div>
            {cursor && (
              <span aria-hidden="true" style={{ position: 'absolute', left: cursor.x - size / 2, top: cursor.y - size / 2, width: size, height: size, border: '2px solid var(--accent)', borderRadius: '50%', background: tool === 'restore' ? 'rgba(255,255,255,.35)' : 'rgba(31,59,224,.12)', pointerEvents: 'none' }} />
            )}
          </div>
          {!ready && <p style={{ position: 'absolute', inset: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4E5159', fontSize: 14 }}>불러오는 중…</p>}
        </div>

        <section aria-label="편집 도구" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 16px calc(20px + var(--safe-b))' }}>
          <div role="group" aria-label="브러시" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            {[['erase', '지우개'], ['restore', '복원']].map(([k, label]) => (
              <button key={k} type="button" className="chip" aria-pressed={tool === k} onClick={() => setTool(k)} style={{ minHeight: 48, fontSize: 15 }}>{label}</button>
            ))}
          </div>
          <label style={rowLabel}><span style={{ flex: '0 0 64px' }}>크기</span>
            <input type="range" min="16" max="84" value={size} onChange={(e) => setSize(Number(e.target.value))} style={range} />
          </label>
          <label style={rowLabel}><span style={{ flex: '0 0 64px' }}>원본 비교</span>
            <input type="range" min="0" max="100" value={compare} onChange={(e) => setCompare(Number(e.target.value))} style={range} />
          </label>
          <div role="group" aria-label="미리보기 배경" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>배경</span>
            {Object.keys(BG_MAP).map((k) => (
              <button key={k} type="button" onClick={() => setBg(k)} aria-label={BG_LABEL[k] + ' 배경'} aria-pressed={bg === k}
                style={{ width: 44, height: 44, padding: 0, background: BG_MAP[k], backgroundSize: '12px 12px', border: bg === k ? '3px solid #FFFFFF' : '1.5px solid #6E6E73', borderRadius: '50%', cursor: 'pointer' }} />
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

const rowLabel = { display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 500 }
const range = { accentColor: '#FFFFFF', width: '100%', height: 32, margin: 0 }
