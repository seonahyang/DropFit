import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png', 'samples/*.svg'],
      manifest: {
        name: 'DropFit',
        short_name: 'DropFit',
        description: '내 옷을 모아 플랫레이 코디를 짜는 DropFit',
        lang: 'ko',
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            // 배경 제거 엔진(onnxruntime wasm/mjs) — 크기가 커서 미리 받지 않고 처음 쓸 때 캐시
            urlPattern: ({ url }) => url.origin === self.location.origin && /\/assets\/.*\.(wasm|mjs)$/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'bg-engine', expiration: { maxEntries: 10 } },
          },
          {
            // 배경 제거 모델(onnx/wasm) — 처음 한 번 받은 뒤 오프라인에서도 쓰도록 캐시
            urlPattern: /^https:\/\/staticimgly\.com\//,
            handler: 'CacheFirst',
            options: { cacheName: 'bg-model', expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 60 } },
          },
        ],
      },
    }),
  ],
  optimizeDeps: { exclude: ['@imgly/background-removal'] },
  // 배경 제거 멀티스레드(SharedArrayBuffer)용 — 배포(vercel.json)와 같은 헤더
  server: { headers: { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' } },
  preview: { headers: { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' } },
})
