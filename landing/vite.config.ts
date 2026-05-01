import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// La app se sirve desde https://na7hk3r.github.io/personal-os/
export default defineConfig({
  plugins: [react()],
  base: '/personal-os/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
