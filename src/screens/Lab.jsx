import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconBack } from '../components/Icons.jsx'
import { MODELS, makeConfig, preload, removeBg, downscale, envInfo } from '../lib/bgRemoval.js'

// 4단계 첫 작업: 실제 폰에서 배경 제거 속도 재기 (/lab)
const CHECKER = 'repeating-conic-gradient(#D9DADD 0 25%, #FFFFFF 0 50%)'
const sec = (ms) => (ms / 1000).toFixed(1) + '초'

export default function Lab() {
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const [model, setModel] = useState('isnet_quint8')
  const [device, setDevice] = useState('cpu')
  const [shrink, setShrink] = useState(true)
  const [log, setLog] = useState([])
  const [busy, setBusy] = useState(false)
  const [dl, setDl] = useState('')
  const [results, setResults] = useState([])
  const env = envInfo()

  const add = (line) => setLog((l) => [...l, line])
  const cfg = () => makeConfig({
    model, device,
    onProgress: (key, cur, total) => { if (total) setDl(`${key.split('/').pop()} ${Math.round((cur / total) * 100)}%`) },
  })

  const doPreload = async () => {
    setBusy(true); setDl('')
    const t = performance.now()
    try {
      await preload(cfg())
      add(`모델 준비 [${model}/${device}] ${sec(performance.now() - t)}`)
    } catch (e) { add('모델 준비 실패: ' + (e && e.message)) }
    setBusy(false); setDl('')
  }

  const onPick = async (e) => {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (!files.length) return
    setBusy(true)
    for (const f of files) {
      try {
        const t0 = performance.now()
        const input = shrink ? (await downscale(f)).blob : f
        const t1 = performance.now()
        const out = await removeBg(input, cfg())
        const t2 = performance.now()
        const url = URL.createObjectURL(out)
        add(`${f.name.slice(0, 18)} · 줄이기 ${sec(t1 - t0)} · 제거 ${sec(t2 - t1)} · 합계 ${sec(t2 - t0)} [${model}/${device}]`)
        setResults((r) => [{ url, key: url }, ...r])
      } catch (err) {
        add('실패: ' + (err && err.message))
      }
    }
    setBusy(false); setDl('')
  }

  const chip = (on) => ({ minHeight: 40, padding: '0 12px', border: 0, borderRadius: 999, background: on ? '#FFFFFF' : 'var(--surface-2)', color: on ? '#000' : '#FFF', fontSize: 13, fontWeight: 700, cursor: 'pointer' })

  return (
    <div className="app">
      <header style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: 'calc(10px + var(--safe-t)) 8px 4px' }}>
        <button type="button" className="icon-btn" aria-label="뒤로" onClick={() => navigate('/')}><IconBack /></button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>배경 제거 속도 테스트</h1>
      </header>
      <main className="scroll" style={{ padding: '8px 16px calc(24px + var(--safe-b))', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-2)', lineHeight: 1.5 }}>
          코어 {env.cores} · 메모리 {env.memory} · 멀티스레드 {env.isolated ? '켜짐' : '꺼짐'} · WebGPU {env.webgpu ? '있음' : '없음'}<br />{env.ua}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>모델</span>
          {Object.entries(MODELS).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setModel(k)} style={{ ...chip(model === k), textAlign: 'left' }}>{k} — {label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 700, marginRight: 6 }}>장치</span>
          <button type="button" onClick={() => setDevice('cpu')} style={chip(device === 'cpu')}>CPU</button>
          <button type="button" onClick={() => setDevice('gpu')} style={chip(device === 'gpu')}>GPU(WebGPU)</button>
          <button type="button" onClick={() => setShrink(!shrink)} style={chip(shrink)}>사진 먼저 줄이기 {shrink ? '켬' : '끔'}</button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn-secondary" disabled={busy} onClick={doPreload} style={{ flex: 1 }}>① 모델 받기</button>
          <button type="button" className="btn-primary" disabled={busy} onClick={() => fileRef.current.click()} style={{ flex: 1 }}>② 사진 고르기</button>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onPick} />
        </div>
        {(busy || dl) && <p style={{ margin: 0, fontSize: 13 }}>{busy ? '처리 중… ' : ''}{dl}</p>}
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
          {log.map((l, i) => <li key={i}>{l}</li>)}
        </ol>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
          {results.map((r) => (
            <div key={r.key} style={{ aspectRatio: '4 / 5', background: CHECKER, backgroundSize: '16px 16px', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
              <img src={r.url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
