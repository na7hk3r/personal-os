import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8')) as { version: string }
const APP_VERSION_DEFINE = {
  __APP_VERSION__: JSON.stringify(pkg.version),
}

export default defineConfig({
  main: {
    define: APP_VERSION_DEFINE,
    build: {
      outDir: 'out/main',
      lib: {
        entry: resolve(__dirname, 'electron/main.ts'),
        fileName: () => 'index.js',
      },
      rollupOptions: {
        external: ['better-sqlite3'],
        output: {
          entryFileNames: 'index.js',
        },
      },
    },
  },
  preload: {
    define: APP_VERSION_DEFINE,
    build: {
      outDir: 'out/preload',
      lib: {
        entry: resolve(__dirname, 'electron/preload.ts'),
        fileName: () => 'index.js',
      },
      rollupOptions: {
        output: {
          entryFileNames: 'index.js',
        },
      },
    },
  },
  renderer: {
    root: '.',
    define: APP_VERSION_DEFINE,
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: resolve(__dirname, 'index.html'),
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@core': resolve(__dirname, 'src/core'),
        '@plugins': resolve(__dirname, 'src/plugins'),
        '@shared': resolve(__dirname, 'src/shared'),
      },
    },
    plugins: [react()],
  },
})
