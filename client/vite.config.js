import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import flowbiteReact from 'flowbite-react/plugin/vite'

export default defineConfig({
  plugins: [react(), flowbiteReact()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5003',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5003',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  optimizeDeps: {
    include: ['leaflet', 'react-leaflet'],
  }
})
