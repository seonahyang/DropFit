import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Placeholder from './screens/Placeholder.jsx'

// 라우트 지도 (시안 파일 → 경로)
//  AppCloset   → /
//  AppBoards   → /boards
//  AppTrip     → /trip/:tripId
//  AppUpload   → /upload
//  AppEditor   → /editor/:itemId
//  AppBoard    → /board/:lookId   (새 코디: /board/new?trip=..&day=..&item=..)
const jump = [['/', '옷장'], ['/boards', '코디 모음'], ['/trip/demo', '여행 상세'], ['/upload', '옷 추가'], ['/editor/shirt', '편집기'], ['/board/new', '코디 캔버스']]

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Placeholder title="옷장" nav="closet" links={jump} />} />
        <Route path="/boards" element={<Placeholder title="코디 모음" nav="boards" links={jump} />} />
        <Route path="/trip/:tripId" element={<Placeholder title="여행 상세" links={jump} />} />
        <Route path="/upload" element={<Placeholder title="옷 추가" links={jump} />} />
        <Route path="/editor/:itemId" element={<Placeholder title="배경 제거 편집기" links={jump} />} />
        <Route path="/board/:lookId" element={<Placeholder title="코디 캔버스" links={jump} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
