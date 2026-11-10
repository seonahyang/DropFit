// 시연용 샘플 옷장 — 시안의 catalog()·옷장 목록 값 그대로
// vw/vh: 이미지 원본 비율(코디 캔버스 선택 테두리·PNG 그리기에 사용)
// h: 옷장 핀 높이, tint: 카드 배경

export const CATS = { all: '전체', top: '상의', outer: '아우터', bottom: '하의', shoes: '신발', bag: '가방', acc: '액세서리' }
export const SEASONS = [['spring', '봄'], ['summer', '여름'], ['fall', '가을'], ['winter', '겨울']]
export const SEASON_LABEL = Object.fromEntries(SEASONS)
export const NOTES = ['사막', '숲', '바다', '설산']

const s = (k) => `/samples/${k}.svg`

export const SAMPLE_ITEMS = [
  { id: 'coat', name: '카멜 트렌치코트', cat: 'outer', own: true, price: 129000, h: 316, tint: '#F3E6D6', vw: 400, vh: 560, src: s('coat'), seasons: ['spring', 'fall', 'winter'] },
  { id: 'shirt', name: '옥스퍼드 셔츠', cat: 'top', own: true, price: 39000, h: 244, tint: '#C9D8E8', vw: 400, vh: 440, src: s('shirt'), seasons: ['spring', 'summer', 'fall'] },
  { id: 'bag', name: '브라운 숄더백', cat: 'bag', own: true, price: 79000, h: 206, tint: '#FFFFFF', vw: 360, vh: 340, src: s('bag'), seasons: ['spring', 'summer', 'fall', 'winter'] },
  { id: 'knit', name: '그린 케이블 니트', cat: 'top', own: true, price: 59000, h: 262, tint: '#E4EEE3', vw: 400, vh: 420, src: s('knit'), seasons: ['fall', 'winter'] },
  { id: 'sunglasses', name: '토터스 선글라스', cat: 'acc', own: true, price: 35000, h: 150, tint: '#FBF0DC', vw: 360, vh: 170, src: s('sunglasses'), seasons: ['spring', 'summer'] },
  { id: 'denim', name: '와이드 데님', cat: 'bottom', own: true, price: 49000, h: 300, tint: '#FFFFFF', vw: 320, vh: 480, src: s('denim'), seasons: ['spring', 'fall', 'winter'] },
  { id: 'sneakers', name: '화이트 스니커즈', cat: 'shoes', own: true, price: 69000, h: 196, tint: '#BFC0C9', vw: 420, vh: 300, src: s('sneakers'), seasons: ['spring', 'summer', 'fall', 'winter'] },
  { id: 'skirt', name: '체크 플리츠 스커트', cat: 'bottom', own: false, price: 45000, h: 260, tint: '#F6E8EA', vw: 360, vh: 340, src: s('skirt'), seasons: ['fall', 'winter'] },
  { id: 'loafers', name: '블랙 로퍼', cat: 'shoes', own: false, price: 89000, h: 286, tint: '#FFFFFF', vw: 380, vh: 360, src: s('loafers'), seasons: ['spring', 'fall', 'winter'] },
  { id: 'beret', name: '버건디 베레모', cat: 'acc', own: false, price: 25000, h: 196, tint: '#F9E4E7', vw: 320, vh: 240, src: s('beret'), seasons: ['fall', 'winter'] },
].map((x) => ({ brand: '', ...x }))

// 시안의 샘플 코디(퍼센트 좌표: x, y, w, r) — 3단계에서 시드 데이터로 넣음
const p = (id, x, y, w, r, z) => ({ id, x, y, w, r, z })
export const SAMPLE_LOOKS = {
  jp1: [p('coat', 3, 4, 48, -4, 1), p('shirt', 50, 4, 42, 6, 2), p('denim', 60, 42, 36, -5, 3), p('bag', 24, 50, 36, -8, 4), p('sneakers', 4, 76, 44, 7, 5)],
  jp2: [p('knit', 4, 5, 56, -4, 1), p('denim', 56, 14, 38, 5, 2), p('beret', 8, 54, 36, -10, 3), p('sneakers', 42, 74, 46, 6, 4)],
  jp4: [p('coat', 4, 5, 46, -5, 1), p('shirt', 48, 6, 42, 5, 2), p('denim', 58, 44, 36, -4, 3), p('sneakers', 8, 74, 44, 6, 4)],
  je1: [p('knit', 8, 4, 54, -4, 1), p('skirt', 40, 34, 52, 6, 2), p('bag', 6, 46, 40, -8, 3), p('loafers', 10, 72, 34, 8, 4)],
  je2: [p('shirt', 6, 5, 50, -4, 1), p('denim', 52, 12, 42, 4, 2), p('sneakers', 6, 62, 48, 6, 3), p('sunglasses', 54, 76, 34, -6, 4)],
  weekend: [p('knit', 4, 6, 50, -5, 1), p('skirt', 50, 26, 46, 5, 2), p('loafers', 8, 58, 34, 8, 3), p('beret', 56, 4, 32, 10, 4)],
}

// 카드·코디 배경은 전부 이 한 톤(흰색과 회색 사이)
export const NEUTRAL = '#F2F2F3'

export const won = (n) => '₩' + (n || 0).toLocaleString('ko-KR')
