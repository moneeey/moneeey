import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 4270,
    host: '0.0.0.0',
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
    }),
    react(),
  ],
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
        additionalData: '@root-entry-name: default;',
      },
    },
  },
})
