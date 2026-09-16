import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react', 'react-dom', 'framer-motion', 'lucide-react']
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'framer-motion'],
          lucide: ['lucide-react']
        }
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    cors: true,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    cors: true,
  }
})
