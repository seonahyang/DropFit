// 브라우저 안에서 배경 제거 (@imgly/background-removal)
// 모델 파일은 staticimgly.com에서 처음 한 번 받고, 서비스 워커가 캐시해 둠
let lib = null
const loadLib = async () => (lib ||= await import('@imgly/background-removal'))

export const MODELS = {
  isnet_quint8: '빠름 · 작은 모델(약 40MB)',
  isnet_fp16: '보통 · 중간 모델(약 80MB)',
  isnet: '정확 · 큰 모델(약 170MB)',
}

export function makeConfig({ model = 'isnet_quint8', device = 'cpu', onProgress, format = 'image/png' } = {}) {
  return {
    model,
    device,
    output: { format, quality: 0.9 },
    progress: onProgress ? (key, cur, total) => onProgress(key, cur, total) : undefined,
  }
}

export async function preload(cfg) {
  const m = await loadLib()
  return m.preload(cfg)
}

export async function removeBg(input, cfg) {
  const m = await loadLib()
  return m.removeBackground(input, cfg)
}

// 큰 폰 사진(1200만 화소)은 먼저 줄여서 넘기면 디코딩·추론이 빨라짐
export async function downscale(file, maxSide = 1600) {
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * k)
  const h = Math.round(bmp.height * k)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  c.getContext('2d').drawImage(bmp, 0, 0, w, h)
  bmp.close && bmp.close()
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92))
  return { blob, width: w, height: h }
}

export function envInfo() {
  return {
    cores: navigator.hardwareConcurrency || '?',
    memory: navigator.deviceMemory ? navigator.deviceMemory + 'GB' : '?',
    isolated: typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated,
    webgpu: 'gpu' in navigator,
    ua: navigator.userAgent,
  }
}
