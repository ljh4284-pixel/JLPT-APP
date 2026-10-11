import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// `vite build --mode pages` 로 빌드하면 GitHub Pages 주소(/JLPT-APP/)에 맞춘 경로로 만든다.
// 평소(개발 서버, 일반 빌드)는 루트(/) 기준이다.
export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? '/JLPT-APP/' : '/',
  plugins: [react()],
}))
