import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Standard Vite port
    host: true
  },
  build: {
    // Ensure proper asset handling
    rollupOptions: {
      output: {
        manualChunks: undefined,
      }
    }
  },
  // Clear any service worker configurations during dev
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
})