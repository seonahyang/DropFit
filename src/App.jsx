import { useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom'
import { StoreProvider } from './data/store.jsx'
import Closet from './screens/Closet.jsx'
import Boards from './screens/Boards.jsx'
import Trip from './screens/Trip.jsx'
import Upload from './screens/Upload.jsx'
import Editor from './screens/Editor.jsx'
import Board from './screens/Board.jsx'
import Lab from './screens/Lab.jsx'
import Settings from './screens/Settings.jsx'

// 라우트 지도 (시안 파일 → 경로)
//  AppCloset   → /
//  AppBoards   → /boards
//  AppTrip     → /trip/:tripId
//  AppUpload   → /upload
//  AppEditor   → /editor/:itemId
//  AppBoard    → /board/:lookId   (새 코디: /board/new?trip=..&day=..&item=..)
export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Closet />} />
          <Route path="/boards" element={<Boards />} />
          <Route path="/trip/:tripId" element={<Trip />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/editor/:itemId" element={<Editor />} />
          <Route path="/board/:lookId" element={<BoardRoute />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/lab" element={<Lab />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  )
}

// 다른 코디로 옮겨 가면 캔버스 상태를 새로 시작 (저장 직후 new → id 바뀌는 경우는 유지)
function BoardRoute() {
  const { lookId } = useParams()
  const loc = useLocation()
  const last = useRef('')
  if (!(loc.state && loc.state.keep) || !last.current) last.current = lookId + loc.search
  return <Board key={last.current} />
}
