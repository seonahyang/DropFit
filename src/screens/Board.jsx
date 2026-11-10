import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { IconClose, IconChevronDown, IconMore, IconDownload, IconUndo, IconRedo, IconRotate, IconResize, IconPhoto, IconBoards } from '../components/Icons.jsx'
import { useStore } from '../data/store.jsx'
import { CATS, won } from '../data/samples.js'
import { renderLookPng, saveToPhotos } from '../lib/renderLook.js'

// 시안: AppBoard.dc.html — 상태 로직(드래그·크기·회전·되돌리기·패널)을 그대로 옮김
const RATIO_MAP = { '1:1': [1, 1], '4:5': [4, 5], '9:16': [9, 16] }
const PANEL_MIN = 264
const PANEL_PEEK = 36 // 아래로 내렸을 때 손잡이만 보이는 높이
const PANEL_MAX = 640
const DEFAULT_BG = '#F2F2F3' // 화면 --board-bg와 같은 톤

// 새로 놓는 옷의 기본 자리(종류별 플랫레이 구도, 퍼센트). 같은 종류가 또 오면 조금씩 비켜 놓음
const SPOTS = {
  outer: { x: 4, y: 4, w: 46 }, top: { x: 48, y: 4, w: 42 }, bottom: { x: 54, y: 38, w: 38 },
  shoes: { x: 6, y: 70, w: 40 }, bag: { x: 8, y: 44, w: 36 }, acc: { x: 58, y: 74, w: 30 },
}
export function spotFor(item, placed, itemById, z) {
  const base = SPOTS[item.cat] || { x: 30, y: 30, w: 36 }
  const same = placed.filter((p) => itemById[p.id] && itemById[p.id].cat === item.cat).length
  const k = same % 4
  return { id: item.id, x: base.x + k * 7, y: base.y + k * 6, w: base.w, r: [0, -5, 6, -3][k], z }
}

function initState(lookId, look, q, trips) {
  const base = { cat: 'all', sel: null, past: [], future: [], saveOpen: false, toast: '', panelH: PANEL_MIN, panelDrag: false, menu: false, more: false, scope: 'all', saving: false }
  if (look) {
    return { ...base, ratio: look.ratio, bg: DEFAULT_BG, placed: look.placed.map((p) => ({ ...p })), lookName: look.name,
      dest: look.tripId ? `${look.tripId}:${look.day}` : 'none', setup: false, season: 'all',
      nextZ: Math.max(20, ...look.placed.map((p) => p.z + 1)) }
  }
  const trip = trips.find((t) => t.id === q.get('trip'))
  const day = Number(q.get('day')) || 1
  return { ...base, ratio: '4:5', bg: DEFAULT_BG, placed: [], nextZ: 20, setup: true,
    lookName: trip ? `${trip.name} · ${day}일차` : '새 코디',
    dest: trip ? `${trip.id}:${day}` : 'none', season: trip && trip.season ? trip.season : 'all' }
}

export default function Board() {
  const { lookId } = useParams()
  const [q] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { items, itemById, trips, looks, saveLook, deleteLook } = useStore()
  const existing = lookId !== 'new' ? looks.find((l) => l.id === lookId) : null

  const [st, setSt] = useState(() => initState(lookId, existing, q, trips))
  const stRef = useRef(st)
  stRef.current = st
  const set = (patch) => setSt((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }))
  const savedId = useRef(existing ? existing.id : null)
  // 저장 안 한 변경이 있는지: 마지막 저장 때의 모양과 비교
  const sigOf = (x) => JSON.stringify({ n: x.lookName, r: x.ratio, b: x.bg, d: x.dest, p: x.placed.map((q) => [q.id, q.x, q.y, q.w, q.r, q.z]) })
  const savedSig = useRef(sigOf(st))
  const png = useRef({ sig: '', blob: null }) // 저장 시트를 열 때 미리 그려 둔 PNG (아이폰 공유 시트는 탭 직후에 열어야 해서)
  const gesture = useRef(null)
  const panel = useRef(null)
  const dragEndAt = useRef(0) // 끌기 직후 손잡이 클릭(토글)이 따라 들어오는 것 막기
  const pointers = useRef(new Map())
  const toastTimer = useRef(null)
  const lastSelName = useRef('')
  const mainRef = useRef(null)
  const [area, setArea] = useState({ w: 370, h: 470 })

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  // 보드 크기: 시안은 폭 370px(9:16은 280px). 작은 폰에서도 넘치지 않게 남은 높이에 맞춤
  useLayoutEffect(() => {
    const el = mainRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setArea({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const [rw, rh] = RATIO_MAP[st.ratio]
  // 남은 공간을 꽉 채우도록(폭·높이 중 먼저 닿는 쪽에 맞춤)
  const boardW = Math.max(120, Math.min(area.w, (area.h * rw) / rh))

  // ---- 시안 로직 ----
  const find = (id) => stRef.current.placed.find((p) => p.id === id)
  const commit = (placed, extra) => set((s) => ({ placed, past: s.past.concat([s.placed]), future: [], ...(extra || {}) }))
  const patch = (id, change) => set((s) => ({ placed: s.placed.map((p) => (p.id === id ? { ...p, ...change } : p)) }))
  const saveOnce = (g) => {
    if (g.moved) return
    g.moved = true
    set((s) => ({ past: s.past.concat([s.placed]), future: [] }))
  }
  const aspectOf = (id) => {
    const c = itemById[id]
    return c ? c.vh / c.vw : 1
  }
  const centerOf = (p, rect) => {
    const asp = aspectOf(p.id)
    return {
      asp,
      cx: rect.left + ((p.x + p.w / 2) / 100) * rect.width,
      cy: rect.top + (p.y / 100) * rect.height + ((p.w / 100) * rect.width * asp) / 2,
    }
  }

  const startDrag = (e, id) => {
    const board = e.currentTarget.closest('[data-board]')
    if (!board) return
    const p = find(id)
    if (gesture.current && gesture.current.kind === 'pinch') return
    gesture.current = { kind: 'move', id, rect: board.getBoundingClientRect(), sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y, moved: false }
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch (err) { /* ignore */ }
    set({ sel: id })
  }
  const startHandle = (e, kind) => {
    const board = e.currentTarget.closest('[data-board]')
    const p = find(stRef.current.sel)
    if (!board || !p) return
    e.stopPropagation()
    const rect = board.getBoundingClientRect()
    const { asp, cx, cy } = centerOf(p, rect)
    gesture.current = { kind, id: p.id, rect, asp, cx, cy, w0: p.w, r0: p.r, moved: false,
      d0: Math.max(1, Math.hypot(e.clientX - cx, e.clientY - cy)), a0: Math.atan2(e.clientY - cy, e.clientX - cx) }
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch (err) { /* ignore */ }
  }
  const resizeAround = (g, w) => {
    const W = g.rect.width
    const H = g.rect.height
    return { w, x: ((g.cx - g.rect.left) / W) * 100 - w / 2, y: ((g.cy - g.rect.top) - ((w / 100) * W * g.asp) / 2) / H * 100 }
  }
  const moveGesture = (e) => {
    const g = gesture.current
    if (!g || g.kind === 'pinch') return
    const W = g.rect.width
    const H = g.rect.height
    if (g.kind === 'move') {
      const dx = e.clientX - g.sx
      const dy = e.clientY - g.sy
      if (!g.moved && Math.abs(dx) + Math.abs(dy) < 3) return
      saveOnce(g)
      patch(g.id, { x: g.ox + (dx / W) * 100, y: g.oy + (dy / H) * 100 })
    } else if (g.kind === 'resize') {
      saveOnce(g)
      const d = Math.hypot(e.clientX - g.cx, e.clientY - g.cy)
      patch(g.id, resizeAround(g, Math.min(120, Math.max(8, (g.w0 * d) / g.d0))))
    } else {
      saveOnce(g)
      const a = Math.atan2(e.clientY - g.cy, e.clientX - g.cx)
      patch(g.id, { r: g.r0 + ((a - g.a0) * 180) / Math.PI })
    }
  }
  const endGesture = () => { if (gesture.current && gesture.current.kind !== 'pinch') gesture.current = null }

  // ---- 두 손가락: 선택한 옷 크기·회전 ----
  const pinchInfo = () => {
    const [a, b] = [...pointers.current.values()]
    return { d: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), ang: Math.atan2(b.y - a.y, b.x - a.x) }
  }
  const onBoardDownCapture = (e) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size !== 2) return
    const s = stRef.current
    const p = find(s.sel)
    const board = e.currentTarget
    if (!p) return
    const rect = board.getBoundingClientRect()
    const { asp, cx, cy } = centerOf(p, rect)
    const { d, ang } = pinchInfo()
    // 한 손가락으로 끌던 중이었다면 그 이동은 되돌리고 두 손가락 조작으로 전환
    gesture.current = { kind: 'pinch', id: p.id, rect, asp, cx, cy, w0: p.w, r0: p.r, d0: d, a0: ang, moved: !!(gesture.current && gesture.current.moved) }
  }
  const onBoardMoveCapture = (e) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    if (!g || g.kind !== 'pinch' || pointers.current.size < 2) return
    const { d, ang } = pinchInfo()
    saveOnce(g)
    patch(g.id, { ...resizeAround(g, Math.min(120, Math.max(8, (g.w0 * d) / g.d0))), r: g.r0 + ((ang - g.a0) * 180) / Math.PI })
  }
  const onBoardUpCapture = (e) => {
    pointers.current.delete(e.pointerId)
    if (gesture.current && gesture.current.kind === 'pinch' && pointers.current.size < 2) gesture.current = null
  }

  // ---- 하단 패널 ----
  // 손가락이 패널 밖으로 나가도 계속 따라가도록 창 전체에서 듣기
  const panelStart = (e) => {
    const id = e.pointerId
    panel.current = { sx: e.clientX, sy: e.clientY, h0: stRef.current.panelH, active: false }
    const move = (ev) => { if (ev.pointerId === id) panelDragMove(ev) }
    const up = (ev) => {
      if (ev.pointerId !== id) return
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      panelEnd(ev)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }
  const panelDragMove = (e) => {
    const p = panel.current
    if (!p) return
    const dx = e.clientX - p.sx
    const dy = e.clientY - p.sy
    if (!p.active) {
      if (Math.abs(dy) < 8 || Math.abs(dy) < Math.abs(dx)) return
      p.active = true
    }
    set({ panelDrag: true, panelH: Math.min(panelMax(), Math.max(PANEL_PEEK, p.h0 - dy)) })
  }
  const panelEnd = (e) => {
    const p = panel.current
    panel.current = null
    if (!p || !p.active) return
    const dy = e.clientY - p.sy
    dragEndAt.current = Date.now()
    let h = p.h0
    if (dy < -40) h = p.h0 <= PANEL_PEEK + 10 && dy > -220 ? PANEL_MIN : panelMax()
    else if (dy > 40) h = p.h0 >= 360 && dy < 260 ? PANEL_MIN : PANEL_PEEK
    set({ panelDrag: false, panelH: h })
  }
  const panelMax = () => Math.min(PANEL_MAX, Math.round(window.innerHeight * 0.76))

  const showToast = (msg) => {
    set({ saveOpen: false, toast: msg })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => set({ toast: '' }), 2600)
  }

  // ---- 데이터 ----
  const s = st
  const onBoard = {}
  s.placed.forEach((p) => { onBoard[p.id] = true })
  const seasonOk = (c) => s.season === 'all' || (c.seasons || []).includes(s.season)
  const scopeOk = (c) => s.scope === 'all' || c.own
  const pool = items.filter((c) => seasonOk(c) && scopeOk(c))
  const trayList = pool.filter((c) => s.cat === 'all' || c.cat === s.cat)
  const placedValid = s.placed.filter((p) => itemById[p.id])
  const selP = placedValid.find((p) => p.id === s.sel)
  const zs = placedValid.map((p) => p.z)
  let total = 0
  let buy = 0
  placedValid.forEach((p) => { const c = itemById[p.id]; total += c.price || 0; if (!c.own) buy += c.price || 0 })
  if (selP) lastSelName.current = itemById[selP.id].name

  const dests = useMemo(() => {
    const list = []
    trips.forEach((t) => { for (let d = 1; d <= t.days; d++) list.push([`${t.id}:${d}`, `${t.name} · ${d}일차`]) })
    list.push(['none', '새 코디로 저장'])
    return list
  }, [trips])

  const setZ = (z) => commit(s.placed.map((p) => (p.id === s.sel ? { ...p, z } : p)))

  const leave = () => {
    if (location.key !== 'default') navigate(-1)
    else navigate(s.dest !== 'none' ? `/trip/${s.dest.split(':')[0]}` : '/boards')
  }
  const dirty = placedValid.length > 0 && sigOf(s) !== savedSig.current
  const close = () => (dirty ? set({ leaveOpen: true, menu: false }) : leave())

  const startBoard = () => {
    const itemId = q.get('item')
    if (itemId && itemById[itemId] && !s.placed.some((p) => p.id === itemId)) {
      set((prev) => ({ setup: false, cat: 'all', placed: prev.placed.concat([spotFor(itemById[itemId], prev.placed, itemById, prev.nextZ)]), sel: itemId, nextZ: prev.nextZ + 1 }))
    } else {
      set({ setup: false, cat: 'all' })
    }
  }

  const persist = () => {
    const [tripId, day] = s.dest === 'none' ? [null, null] : [s.dest.split(':')[0], Number(s.dest.split(':')[1])]
    const look = { id: savedId.current || undefined, name: s.lookName.trim() || '새 코디', ratio: s.ratio, bg: s.bg, placed: placedValid, tripId, day }
    const id = saveLook(look)
    savedSig.current = sigOf(s)
    if (!savedId.current) {
      savedId.current = id
      navigate(`/board/${id}`, { replace: true, state: { keep: true } })
    }
    return { ...look, id }
  }
  const saveApp = () => {
    persist()
    showToast(s.dest === 'none' ? '새 코디로 저장했어요' : 'DropFit에 저장했어요')
  }
  const saveImage = async () => {
    if (s.saving) return
    set({ saving: true })
    const sig = sigOf(s)
    const ready = png.current.sig === sig && png.current.blob
    const look = persist()
    try {
      const blob = ready || (await renderLookPng(look, itemById))
      const r = await saveToPhotos(blob, look.name)
      set({ saving: false })
      showToast(r === 'cancelled' ? 'DropFit에만 저장했어요' : r === 'downloaded' ? '이미지를 내려받고 DropFit에도 저장했어요' : '사진 앱과 DropFit에 저장했어요')
    } catch (err) {
      set({ saving: false })
      showToast('이미지를 만들지 못했어요. DropFit에는 저장했어요')
    }
  }

  const openSave = () => {
    set({ saveOpen: true, menu: false })
    const sig = sigOf(s)
    if (png.current.sig === sig) return
    const look = { name: s.lookName, ratio: s.ratio, bg: s.bg, placed: placedValid }
    renderLookPng(look, itemById).then((blob) => { png.current = { sig, blob } }).catch(() => {})
  }
  const removeLook = () => {
    if (!s.confirmDel) return set({ confirmDel: true })
    if (savedId.current) deleteLook(savedId.current)
    savedSig.current = sigOf({ ...s, placed: [] })
    set({ more: false, confirmDel: false, placed: [] })
    if (location.key !== 'default') navigate(-1)
    else navigate('/boards', { replace: true })
  }

  const undo = () => set((p) => {
    if (!p.past.length) return {}
    const prev = p.past[p.past.length - 1]
    return { placed: prev, past: p.past.slice(0, -1), future: [p.placed].concat(p.future), sel: prev.some((x) => x.id === p.sel) ? p.sel : null }
  })
  const redo = () => set((p) => {
    if (!p.future.length) return {}
    const next = p.future[0]
    return { placed: next, past: p.past.concat([p.placed]), future: p.future.slice(1), sel: next.some((x) => x.id === p.sel) ? p.sel : null }
  })

  const isWide = s.panelH >= 360
  const isPeek = s.panelH < 150
  const spacerH = Math.min(Math.max(s.panelH, PANEL_PEEK), PANEL_MIN)
  const selItem = selP ? itemById[selP.id] : null

  return (
    <div className="app">
      <header style={{ position: 'relative', zIndex: 8, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 2, padding: 'calc(8px + var(--safe-t)) 12px 6px 8px' }}>
        <button type="button" className="icon-btn" aria-label="닫기" onClick={close}><IconClose /></button>
        <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
          <input type="text" value={s.lookName} onChange={(e) => set({ lookName: e.target.value })} aria-label="코디 이름"
            style={{ flex: '1 1 auto', minWidth: 0, width: '100%', minHeight: 44, padding: '0 0 0 4px', background: 'none', border: 0, fontSize: 16, fontWeight: 700, color: '#FFFFFF' }} />
          <button type="button" onClick={() => set({ menu: !s.menu })} aria-expanded={s.menu} aria-label="저장 위치 고르기" className="icon-btn" style={{ width: 36 }}>
            <IconChevronDown />
          </button>
        </div>
        {s.menu && (
          <div role="menu" aria-label="저장 위치" style={{ position: 'absolute', left: 52, top: 'calc(56px + var(--safe-t))', width: 286, maxHeight: 340, overflowY: 'auto', padding: 6, background: 'var(--surface-2)', borderRadius: 18 }}>
            {dests.map(([k, label]) => {
              const on = s.dest === k
              return (
                <button key={k} type="button" role="menuitem"
                  onClick={() => set({ dest: k, lookName: k === 'none' ? '새 코디' : label, menu: false })}
                  style={{ width: '100%', minHeight: 44, display: 'flex', alignItems: 'center', padding: '0 12px', background: on ? 'var(--surface-3)' : 'transparent', border: 0, borderRadius: 12, fontSize: 14, fontWeight: on ? 700 : 500, textAlign: 'left', cursor: 'pointer' }}>
                  {label}
                </button>
              )
            })}
          </div>
        )}
        <button type="button" className="icon-btn" onClick={() => set({ more: true })} aria-label="더 보기"><IconMore size={24} /></button>
        <button type="button" onClick={openSave} aria-label="저장하기"
          style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, background: '#FFFFFF', color: '#000000', border: 0, borderRadius: '50%', cursor: 'pointer', flexShrink: 0 }}>
          <IconDownload />
        </button>
      </header>

      {s.menu && <button type="button" aria-label="저장 위치 닫기" onClick={() => set({ menu: false })} style={{ position: 'absolute', inset: 0, zIndex: 7, padding: 0, background: 'none', border: 0 }} />}

      <main ref={mainRef} style={{ flexGrow: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 8px 10px' }}>
        <h1 className="sr-only">코디 캔버스</h1>
        <div data-board="1" onPointerDownCapture={onBoardDownCapture} onPointerMoveCapture={onBoardMoveCapture} onPointerUpCapture={onBoardUpCapture} onPointerCancelCapture={onBoardUpCapture}
          style={{ position: 'relative', isolation: 'isolate', width: boardW, aspectRatio: `${rw} / ${rh}`, touchAction: 'none' }}>
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: s.bg, borderRadius: 'var(--r-card)' }}>
            <button type="button" aria-label="선택 해제" onClick={() => set({ sel: null })} style={{ position: 'absolute', inset: 0, padding: 0, background: 'none', border: 0 }} />
            {placedValid.map((p) => {
              const c = itemById[p.id]
              return (
                <button key={p.id} type="button" aria-label={`${c.name} 선택`}
                  onPointerDown={(e) => startDrag(e, p.id)} onPointerMove={moveGesture} onPointerUp={endGesture} onPointerCancel={endGesture}
                  onClick={() => set({ sel: p.id })}
                  style={{ position: 'absolute', left: p.x + '%', top: p.y + '%', width: p.w + '%', transform: `rotate(${p.r}deg)`, zIndex: p.z, padding: 0, background: 'none', border: 0, cursor: 'grab', touchAction: 'none' }}>
                  <img src={c.src} alt="" style={{ display: 'block', width: '100%', pointerEvents: 'none', filter: 'drop-shadow(0 6px 6px rgba(0,0,0,.22))' }} />
                </button>
              )
            })}
            {placedValid.length === 0 && (
              <p style={{ position: 'absolute', inset: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#4E5159', pointerEvents: 'none' }}>아래에서 옷을 골라 보세요</p>
            )}
          </div>

          {selP && (
            <div style={{ position: 'absolute', left: selP.x + '%', top: selP.y + '%', width: selP.w + '%', aspectRatio: `${selItem.vw} / ${selItem.vh}`, transform: `rotate(${selP.r}deg)`, border: '1.5px solid var(--accent)', pointerEvents: 'none', zIndex: 2 }}>
              <button type="button" onClick={() => commit(s.placed.filter((p) => p.id !== s.sel), { sel: null })} aria-label={`${selItem.name} 빼기`} style={{ ...handleBtn, left: -22, top: -22, cursor: 'pointer' }}>
                <span aria-hidden="true" style={{ ...handleDot, background: '#000000', color: '#FFFFFF', border: 0 }}><IconClose size={14} w={3.2} /></span>
              </button>
              <button type="button" onPointerDown={(e) => startHandle(e, 'rotate')} onPointerMove={moveGesture} onPointerUp={endGesture} onPointerCancel={endGesture} aria-label="드래그해서 회전" style={{ ...handleBtn, right: -22, top: -22, cursor: 'grab' }}>
                <span aria-hidden="true" style={handleDot}><IconRotate /></span>
              </button>
              <button type="button" onPointerDown={(e) => startHandle(e, 'resize')} onPointerMove={moveGesture} onPointerUp={endGesture} onPointerCancel={endGesture} aria-label="드래그해서 크기 조절" style={{ ...handleBtn, right: -22, bottom: -22, cursor: 'nwse-resize' }}>
                <span aria-hidden="true" style={handleDot}><IconResize /></span>
              </button>
            </div>
          )}

          <div style={{ position: 'absolute', left: 10, top: 10, zIndex: 3, display: 'flex', gap: 6 }}>
            <button type="button" onClick={undo} disabled={s.past.length === 0} aria-label="이전으로 돌아가기" style={roundDark}><IconUndo /></button>
            <button type="button" onClick={redo} disabled={s.future.length === 0} aria-label="이후로 돌아가기" style={roundDark}><IconRedo /></button>
          </div>
        </div>
      </main>

      <div aria-hidden="true" style={{ flexShrink: 0, height: `calc(${spacerH}px + var(--safe-b))`, transition: s.panelDrag ? 'none' : 'height .22s ease' }} />

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: `calc(${s.panelH - 28}px + var(--safe-b))`, zIndex: 5, height: 88, display: 'flex', alignItems: 'flex-start', gap: 6, padding: '8px 14px 0', background: 'var(--surface-2)', borderRadius: '22px 22px 0 0',
        transform: selP ? 'translateY(0)' : 'translateY(60px)', visibility: selP ? 'visible' : 'hidden',
        transition: s.panelDrag ? 'transform .18s ease, visibility .18s' : 'transform .18s ease, visibility .18s, bottom .22s ease' }}>
        <h2 style={{ margin: 0, flexGrow: 1, minWidth: 0, lineHeight: '44px', fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lastSelName.current}</h2>
        <button type="button" onClick={() => setZ(Math.max(...zs) + 1)} style={pillBtn}>앞으로</button>
        <button type="button" onClick={() => setZ(Math.min(...zs) - 1)} style={pillBtn}>뒤로</button>
        <button type="button" onClick={() => set({ sel: null })} style={{ flexShrink: 0, minHeight: 44, padding: '0 6px', background: 'none', border: 0, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>완료</button>
      </div>

      <section aria-label="옷 고르기" onPointerDown={panelStart}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 6, height: `calc(${s.panelH}px + var(--safe-b))`, overflow: 'hidden', transition: s.panelDrag ? 'none' : 'height .22s ease', display: 'flex', flexDirection: 'column', gap: 8, padding: isPeek ? '0 14px var(--safe-b)' : '0 14px calc(18px + var(--safe-b))', background: 'var(--surface-1)', borderRadius: '28px 28px 0 0' }}>
        <button type="button" onClick={() => { if (Date.now() - dragEndAt.current < 400) return; set({ panelH: isWide || isPeek ? PANEL_MIN : panelMax() }) }} aria-label={isPeek ? '옷 목록 열기' : isWide ? '옷 목록 작게 보기' : '옷 목록 크게 보기'}
          style={{ flexShrink: 0, height: isPeek ? PANEL_PEEK : 44, margin: isPeek ? '0 -14px' : '0 -14px -14px', display: 'flex', justifyContent: 'center', padding: '10px 0 0', background: 'none', border: 0, cursor: 'ns-resize', touchAction: 'none' }}>
          <span aria-hidden="true" style={{ width: 44, height: 5, background: 'var(--grabber-panel)', borderRadius: 3 }} />
        </button>
        {!isPeek && <>
        <div role="group" aria-label="카테고리" style={{ flexShrink: 0, display: 'flex', gap: 16, overflowX: 'auto', margin: '0 -14px', padding: '0 14px', scrollbarWidth: 'none', touchAction: 'pan-x' }}>
          {Object.entries(CATS).map(([k, label]) => (
            <button key={k} type="button" className="tab" aria-pressed={s.cat === k} onClick={() => set({ cat: k })} style={{ flexShrink: 0, fontSize: 15 }}>{label}</button>
          ))}
        </div>

        {!isWide && (
          <div style={{ flexShrink: 0, display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -14px', padding: '0 14px', scrollbarWidth: 'none', touchAction: 'pan-x' }}>
            {trayList.map((c) => <TrayItem key={c.id} c={c} on={!!onBoard[c.id]} narrow onToggle={() => toggleItem(c)} />)}
            {trayList.length === 0 && <p style={{ margin: 0, padding: '40px 0', fontSize: 14, color: 'var(--muted-2)' }}>조건에 맞는 옷이 없어요</p>}
          </div>
        )}
        {isWide && (
          <div style={{ flexGrow: 1, minHeight: 0, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px 8px', alignContent: 'start', scrollbarWidth: 'none', touchAction: 'pan-y' }}>
            {trayList.map((c) => <TrayItem key={c.id} c={c} on={!!onBoard[c.id]} onToggle={() => toggleItem(c)} />)}
          </div>
        )}
        <p style={{ margin: 0, marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted-2)' }}>
          <span>짐 {placedValid.length}개</span><span>총 <b style={{ color: '#FFFFFF' }}>{won(total)}</b> · 살 옷 {won(buy)}</span>
        </p>
        </>}
      </section>

      {s.toast && <p role="status" className="toast">{s.toast}</p>}

      {s.saveOpen && (
        <div className="sheet-wrap">
          <button type="button" className="sheet-scrim" aria-label="닫기" onClick={() => set({ saveOpen: false })} />
          <section className="sheet" aria-label="코디 저장" style={{ gap: 8, paddingBottom: 'calc(26px + var(--safe-b))' }}>
            <span className="grabber" aria-hidden="true" />
            <h2 style={{ margin: '4px 4px 6px', fontSize: 20, fontWeight: 900, letterSpacing: '-0.03em' }}>코디 저장</h2>
            <button type="button" onClick={saveImage} disabled={s.saving} style={saveRow}>
              <IconPhoto />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{s.saving ? '이미지 만드는 중…' : '이미지 저장'}</span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>사진 앱에 저장하고 DropFit에도 남겨요</span>
              </span>
            </button>
            <button type="button" onClick={saveApp} style={saveRow}>
              <span style={{ flexShrink: 0, display: 'flex' }}><IconBoards size={26} /></span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>앱에 저장</span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>사진 앱에는 저장하지 않아요</span>
              </span>
            </button>
          </section>
        </div>
      )}

      {s.more && (
        <div className="sheet-wrap">
          <button type="button" className="sheet-scrim" aria-label="닫기" onClick={() => set({ more: false, confirmDel: false })} />
          <section className="sheet" aria-label="캔버스 설정" style={{ gap: 12, paddingBottom: 'calc(26px + var(--safe-b))' }}>
            <span className="grabber" aria-hidden="true" />
            <h2 style={{ margin: '4px 4px 2px', fontSize: 20, fontWeight: 900, letterSpacing: '-0.03em' }}>캔버스 비율</h2>
            <div role="group" aria-label="캔버스 비율" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
              {Object.keys(RATIO_MAP).map((k) => {
                const on = s.ratio === k
                const shape = { '1:1': [30, 30], '4:5': [26, 32], '9:16': [20, 34] }[k]
                return (
                  <button key={k} type="button" aria-pressed={on} onClick={() => set({ ratio: k, more: false })}
                    style={{ minHeight: 92, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: on ? '#FFFFFF' : 'var(--surface-2)', color: on ? '#000000' : '#FFFFFF', border: 0, borderRadius: 20, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    <span aria-hidden="true" style={{ width: shape[0], height: shape[1], border: '2px solid currentColor', borderRadius: 4 }} />
                    {k}
                  </button>
                )
              })}
            </div>
            <button type="button" onClick={() => set({ setup: true, more: false })}
              style={{ minHeight: 56, padding: '0 16px', background: 'var(--surface-2)', border: 0, borderRadius: 20, fontSize: 15, fontWeight: 700, textAlign: 'left', cursor: 'pointer' }}>
              쓸 옷과 계절 바꾸기
            </button>
            {savedId.current && (
              <button type="button" onClick={removeLook}
                style={{ minHeight: 56, padding: '0 16px', background: s.confirmDel ? '#FF453A' : 'var(--surface-2)', border: 0, borderRadius: 20, color: s.confirmDel ? '#FFFFFF' : '#FF6961', fontSize: 15, fontWeight: 700, textAlign: 'left', cursor: 'pointer' }}>
                {s.confirmDel ? '한 번 더 누르면 삭제돼요' : '이 코디 삭제'}
              </button>
            )}
          </section>
        </div>
      )}

      {s.leaveOpen && (
        <div className="sheet-wrap">
          <button type="button" className="sheet-scrim" aria-label="닫기" onClick={() => set({ leaveOpen: false })} />
          <section className="sheet" aria-label="나가기 전 확인" style={{ gap: 8, paddingBottom: 'calc(26px + var(--safe-b))' }}>
            <span className="grabber" aria-hidden="true" />
            <h2 style={{ margin: '4px 4px 2px', fontSize: 20, fontWeight: 900, letterSpacing: '-0.03em' }}>저장하지 않은 코디가 있어요</h2>
            <p style={{ margin: '0 4px 8px', fontSize: 14, color: 'var(--muted)' }}>{s.dest === 'none' ? '새 코디' : dests.find((d) => d[0] === s.dest)?.[1]}로 저장할까요?</p>
            <button type="button" className="btn-primary" onClick={() => { persist(); set({ leaveOpen: false }); leave() }}>저장하고 나가기</button>
            <button type="button" className="btn-secondary" onClick={() => { set({ leaveOpen: false }); leave() }}>저장 안 하고 나가기</button>
          </section>
        </div>
      )}

      {s.setup && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', flexDirection: 'column', background: '#000000' }}>
          <button type="button" className="icon-btn" aria-label="닫기" onClick={() => (s.placed.length || savedId.current ? set({ setup: false }) : close())}
            style={{ alignSelf: 'flex-start', margin: 'calc(8px + var(--safe-t)) 0 0 8px' }}>
            <IconClose />
          </button>
          <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 28, padding: '12px 16px 16px' }}>
            <h2 style={{ margin: 0, fontSize: 30, lineHeight: 1.2, fontWeight: 900, letterSpacing: '-0.04em' }}>어떤 옷으로<br />코디할까요?</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--muted)' }}>쓸 옷</h3>
              <div role="group" aria-label="쓸 옷" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                {[['all', '옷장 전체'], ['own', '소장 중인 옷만']].map(([k, label]) => {
                  const on = s.scope === k
                  const count = items.filter((c) => seasonOk(c) && (k === 'all' || c.own)).length
                  return (
                    <button key={k} type="button" aria-pressed={on} onClick={() => set({ scope: k })}
                      style={{ minHeight: 112, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 4, padding: 14, background: on ? '#FFFFFF' : 'var(--surface-1)', color: on ? '#000000' : '#FFFFFF', border: 0, borderRadius: 'var(--r-card)', textAlign: 'left', cursor: 'pointer' }}>
                      <span style={{ fontSize: 16, fontWeight: 700 }}>{label}</span>
                      <span style={{ fontSize: 13 }}>{count}벌</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--muted)' }}>계절</h3>
              <div role="group" aria-label="계절" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 6 }}>
                {[['all', '전체'], ['spring', '봄'], ['summer', '여름'], ['fall', '가을'], ['winter', '겨울']].map(([k, n]) => {
                  const on = s.season === k
                  return (
                    <button key={k} type="button" aria-pressed={on} onClick={() => set({ season: k })}
                      style={{ minHeight: 48, padding: 0, background: on ? '#FFFFFF' : 'var(--surface-1)', color: on ? '#000000' : '#FFFFFF', border: 0, borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{n}</button>
                  )
                })}
              </div>
            </div>
          </div>
          <div style={{ flexShrink: 0, padding: '10px 16px calc(24px + var(--safe-b))' }}>
            <button type="button" className="btn-primary" onClick={startBoard} disabled={pool.length === 0} style={{ width: '100%', minHeight: 56, fontSize: 16 }}>{pool.length}벌로 코디 시작</button>
          </div>
        </div>
      )}
    </div>
  )

  function toggleItem(c) {
    if (onBoard[c.id]) commit(s.placed.filter((p) => p.id !== c.id), { sel: s.sel === c.id ? null : s.sel })
    else commit(s.placed.concat([spotFor(c, s.placed, itemById, s.nextZ)]), { sel: c.id, nextZ: s.nextZ + 1 })
  }
}

function TrayItem({ c, on, narrow, onToggle }) {
  const ring = on ? '3px solid var(--accent)' : '0 solid transparent'
  const action = c.name + (on ? ' 보드에서 빼기' : ' 보드에 놓기')
  if (narrow) {
    return (
      <button type="button" aria-pressed={on} aria-label={action} onClick={onToggle}
        style={{ position: 'relative', flexShrink: 0, width: 92, height: 112, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10, background: 'var(--tray-bg)', border: 0, outline: ring, outlineOffset: -3, borderRadius: 18, cursor: 'pointer' }}>
        <img src={c.src} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
      </button>
    )
  }
  return (
    <button type="button" aria-pressed={on} aria-label={action} onClick={onToggle}
      style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5, padding: 0, background: 'none', border: 0, color: 'var(--caption)', fontSize: 12, textAlign: 'left', cursor: 'pointer' }}>
      <span style={{ width: '100%', aspectRatio: '5 / 6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, background: 'var(--tray-bg)', outline: ring, outlineOffset: -3, borderRadius: 18 }}>
        <img src={c.src} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
      </span>
      <span style={{ padding: '0 4px' }}>{c.name}</span>
    </button>
  )
}

const handleBtn = { position: 'absolute', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, background: 'none', border: 0, touchAction: 'none', pointerEvents: 'auto' }
const handleDot = { width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', color: 'var(--accent)', border: '1.5px solid var(--accent)', borderRadius: '50%' }
const roundDark = { width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, background: 'rgba(0,0,0,.78)', border: 0, borderRadius: '50%', color: '#FFFFFF', cursor: 'pointer' }
const pillBtn = { flexShrink: 0, minHeight: 44, padding: '0 12px', background: 'var(--surface-3)', border: 0, borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const saveRow = { display: 'flex', alignItems: 'center', gap: 14, minHeight: 76, padding: '12px 16px', background: 'var(--surface-2)', border: 0, borderRadius: 20, textAlign: 'left', cursor: 'pointer' }
