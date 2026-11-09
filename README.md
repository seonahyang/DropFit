# DropFit

내 옷을 모아 플랫레이 코디를 짜는 모바일 우선 PWA (바이브 코딩 과제).

- React + Vite, IndexedDB(idb), vite-plugin-pwa
- 배경 제거: `@imgly/background-removal` (브라우저 안에서 실행, 사진이 기기 밖으로 나가지 않음)

## 실행
```
npm install
npm run dev      # 개발 서버
npm run build    # dist/ 생성
```

## 화면 ↔ 경로
| 시안 | 경로 |
|---|---|
| AppCloset | `/` |
| AppBoards | `/boards` |
| AppTrip | `/trip/:tripId` |
| AppUpload | `/upload` |
| AppEditor | `/editor/:itemId` |
| AppBoard | `/board/:lookId` (새 코디 `/board/new`) |

샘플 옷 이미지는 `public/samples/` (시안 에셋).
