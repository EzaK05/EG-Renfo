import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // Évite les soucis CORS/cookies en dev : le frontend appelle "/api/..." et Vite relaie vers le backend Express.
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
})
