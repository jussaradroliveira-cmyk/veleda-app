import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vercel serve na raiz (veledataro.com) — base '/' em dev e produção
export default defineConfig({
  base: '/',
  plugins: [react()],
})
