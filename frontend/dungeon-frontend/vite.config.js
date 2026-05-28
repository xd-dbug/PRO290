import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    // Edit: set API_HOST env var to override the proxy target.
    // Inside Docker: API_HOST=http://nginx  (set in docker-compose or Dockerfile)
    // Local dev: leave unset — defaults to http://localhost
    proxy: {
      // changeOrigin: false keeps Host: localhost:5173 so nginx generates redirects
      // the browser can actually follow (not http://nginx/...)
      '/api': { target: process.env.API_HOST || 'http://localhost', changeOrigin: false },
      '/auth': { target: process.env.API_HOST || 'http://localhost', changeOrigin: false },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js'],
    globals: true,
  },
})