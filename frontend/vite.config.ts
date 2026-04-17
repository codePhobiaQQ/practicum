// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    watch: {
      usePolling: true,
    },
    host: true,
    strictPort: true,
    port: 5174,
    cors: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@public': path.resolve(__dirname, './public'),
      '@assets': path.resolve(__dirname, './src/shared/assets'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@app': path.resolve(__dirname, './src/app'),
    },
  },
  plugins: [react(), svgr()],
})
