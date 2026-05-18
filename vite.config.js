import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/marmore2/',
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'pdf-vendor': ['jspdf'],
          'icons-vendor': ['lucide-react']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
})
