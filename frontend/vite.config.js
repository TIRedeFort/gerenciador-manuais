import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/manuais/',
  plugins: [react()],
  server: {
    port: 1600,
    proxy: {
      '/api': {
        target: 'http://localhost:1601',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:1601',
        changeOrigin: true
      }
    }
  }
})
