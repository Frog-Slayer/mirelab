import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    allowedHosts: ['yeongseo-mini-s.taildf0713.ts.net'],
    port: 5173,
    proxy: {
      // 백엔드(Spring Boot)로 프록시. 브라우저에서는 same-origin 이라 CORS 설정이 필요 없다.
      // target은 이 vite 프로세스가 읽는 일반 환경변수라(브라우저 번들에 박히는 VITE_* 와
      // 다름) 로컬 개발은 기본값을 그대로 쓰고, Docker dev 컨테이너에서만 서비스명으로 바뀐다.
      '/api': {
        target: process.env.BACKEND_PROXY_TARGET ?? 'http://localhost:8080',
        changeOrigin: true,
      },
      // 함께 쓰는 기록의 실시간 편집(Yjs) 서버로 프록시 — /api 와 같은 이유로 같은 origin을 쓴다.
      // 안 그러면 tailscale 같은 다른 호스트로 접속했을 때 브라우저가 자기 localhost로 붙으려 든다.
      '/yjs': {
        target: process.env.REALTIME_PROXY_TARGET ?? 'ws://localhost:1234',
        ws: true,
      },
    },
  },
})
