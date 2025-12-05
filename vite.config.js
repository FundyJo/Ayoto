import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Tauri expects index.html to be in the root, frontend code in ./frontend
  root: './frontend',
  
  // Build output directory - Tauri will look for built files here
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2021',
    minify: 'esbuild',
    sourcemap: false,
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend/src'),
      '@common': path.resolve(__dirname, './common'),
    },
  },
  
  // For development
  server: {
    host: true, // Listen on all network interfaces for Tauri Android/iOS dev
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  
  // Prevent vite from obscuring rust errors
  clearScreen: false,
  
  // Environment prefix for Tauri
  envPrefix: ['VITE_', 'TAURI_'],
})
