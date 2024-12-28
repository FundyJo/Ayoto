import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  build: {
      chunkSizeWarningLimit: 2000, // Control the size before showing a warning for chunk size
      //outDir: 'build', // Specify your desired output directory

      // Tauri uses Chromium on Windows and WebKit on macOS and Linux
      target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
      minify: process.env.TAURI_ENV_DEBUG === "true" ? false : "esbuild",
      sourcemap: process.env.TAURI_ENV_DEBUG === "true",

      rollupOptions: {
          output: {
              manualChunks: {
                  lodash: ['lodash'], // Manually define chunk for lodash
                  vendor: ['react', 'react-dom'], // Manually define chunk for React and ReactDOM
              },
          },
      },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  server: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1' || false, //host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 5174,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
