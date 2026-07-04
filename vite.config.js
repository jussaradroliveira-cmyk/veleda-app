import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: em produção o site vive em github.io/veleda-app/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/veleda-app/' : '/',
  plugins: [react()],
}))
