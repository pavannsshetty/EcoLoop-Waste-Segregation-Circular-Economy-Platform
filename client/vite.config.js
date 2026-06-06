import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import flowbiteReact from 'flowbite-react/plugin/vite'

const backendTarget = process.env.VITE_API_URL || 'http://127.0.0.1:5003';

export default defineConfig({
  plugins: [react(), flowbiteReact()],
  server: {
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/socket.io': {
        target: backendTarget,
        changeOrigin: true,
        ws: true,
      },
    },
  },
  optimizeDeps: {
    include: ['leaflet', 'react-leaflet'],
  }
})
