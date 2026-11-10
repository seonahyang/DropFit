import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconBack } from '../components/Icons.jsx'
import { useStore } from '../data/store.jsx'
import { subscribeModel, warmModel, checkCached } from '../lib/modelWarm.js'

// 앱 설정: 홈 화면 추가 안내, 배경 제거 준비, 저장 공간, 샘플로 되돌리기
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
let installEvent = null
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e })

const mb = (n) => (n / 1024 / 1024).toFixed(1) + 'MB'

export default function Settings() {
  const navigate = useNavigate()
  const { items, looks, trips, resetToSample } = useStore()
  const [model, setModel] = useState({ status: 'idle', pct: 0, cached: false })
  const [usage, setUsage] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [toast, setToast] = useState('')
  const [canInstall, setCanInstall] = useState(!!installEvent)

  useEffect(() => subscribeModel(setModel), [])
  useEffect(() => { checkCached() }, [])
  useEffect(() => {
    if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then((e) => setUsage(mb(e.usage || 0))).catch(() => {})
    const t = setInterval(() => setCanInstall(!!installEvent), 1000)
    return () => clearInterval(t)
  }, [model.status])

  const reset = async () => {
    if (!confirmReset) return setConfirmReset(true)
    await resetToSample()
    setConfirmReset(false)
    setToast('샘플 옷장으로 되돌렸어요')
    setTimeout(() => setToast(''), 2400)
  }

  const modelText = model.status === 'loading' ? `받는 중 ${model.pct}%`
    : model.status === 'ready' ? '준비 완료'
      : model.status === 'error' ? '받지 못했어요. 네트워크를 확인해 주세요'
        : model.cached ? '이 기기에 받아 둠' : '아직 안 받음(약 40MB)'

  return (
    <div className="app">
      <header style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: 'calc(10px + var(--safe-t)) 8px 4px' }}>
        <button type="button" className="icon-btn" aria-label="뒤로" onClick={() => navigate(-1)}><IconBack /></button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, letterSpacing: '-0.03em' }}>설정</h1>
      </header>
      <main className="scroll" style={{ padding: '8px 16px calc(24px + var(--safe-b))', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <section style={card}>
          <h2 style={h2}>홈 화면에 추가</h2>
          {standalone() ? (
            <p style={p}>이미 앱으로 열려 있어요.</p>
          ) : isIOS ? (
            <p style={p}>Safari 아래쪽 <b style={{ color: '#FFF' }}>공유 버튼</b>을 누르고 <b style={{ color: '#FFF' }}>홈 화면에 추가</b>를 고르면 앱처럼 열려요.</p>
          ) : canInstall ? (
            <button type="button" className="btn-primary" onClick={async () => { installEvent.prompt(); await installEvent.userChoice; installEvent = null; setCanInstall(false) }}>앱 설치하기</button>
          ) : (
            <p style={p}>브라우저 메뉴(⋮)에서 <b style={{ color: '#FFF' }}>앱 설치</b> 또는 <b style={{ color: '#FFF' }}>홈 화면에 추가</b>를 고르세요.</p>
          )}
        </section>

        <section style={card}>
          <h2 style={h2}>배경 제거 준비</h2>
          <p style={p}>{modelText}</p>
          {model.status === 'loading' && (
            <span style={{ display: 'block', height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
              <span style={{ display: 'block', width: model.pct + '%', height: '100%', background: '#FFF', transition: 'width .25s' }} />
            </span>
          )}
          {model.status !== 'ready' && model.status !== 'loading' && (
            <button type="button" className="btn-secondary" onClick={warmModel}>{model.cached ? '다시 확인하기' : '지금 받아 두기'}</button>
          )}
          <p style={{ ...p, fontSize: 12 }}>한 번 받으면 이 기기에 저장돼서 다음부터는 바로 시작돼요. 와이파이에서 받는 걸 추천해요.</p>
        </section>

        <section style={card}>
          <h2 style={h2}>이 기기에 저장된 것</h2>
          <p style={p}>옷 {items.length}벌 · 코디 {looks.length}개 · 여행 {trips.length}개{usage && ` · 사용 중 ${usage}`}</p>
          <p style={{ ...p, fontSize: 12 }}>옷장은 서버로 보내지 않고 이 브라우저 안에만 저장돼요. 다른 기기와는 공유되지 않아요.</p>
          <button type="button" onClick={reset}
            style={{ minHeight: 52, border: 0, borderRadius: 999, background: confirmReset ? '#FF453A' : 'var(--surface-2)', color: confirmReset ? '#FFF' : '#FF6961', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            {confirmReset ? '한 번 더 누르면 지금 옷장이 지워져요' : '샘플 옷장으로 되돌리기'}
          </button>
        </section>

        <Link to="/lab" style={{ ...p, textAlign: 'center', padding: 8, textDecoration: 'underline' }}>배경 제거 속도 테스트</Link>
      </main>
      {toast && <p role="status" className="toast">{toast}</p>}
    </div>
  )
}

const card = { display: 'flex', flexDirection: 'column', gap: 10, padding: 16, background: 'var(--surface-1)', borderRadius: 'var(--r-card)' }
const h2 = { margin: 0, fontSize: 16, fontWeight: 700 }
const p = { margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--muted)' }
